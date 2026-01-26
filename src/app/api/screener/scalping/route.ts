import { NextRequest, NextResponse } from "next/server";
import YahooFinance from 'yahoo-finance2';
import { getTrendingStocks, getStockInfo } from "@/lib/bpjs/universe";
import { performTechnicalAnalysis, calculateEMA } from "@/backend/analysis/indicators";

// Use singleton instance
const yahooFinance = new YahooFinance();

export const maxDuration = 60; // Allow 1 minute for scanning

interface ScalpingResult {
    symbol: string;
    price: number;
    changePercent: number;
    score: number;
    signal: "BUY" | "SELL" | "HOLD";
    reason: string[];
    metrics: {
        rsi: number;
        volumeRatio: number;
        stochasticK: number;
        stochasticD: number;
        volatility: number;
        adx: number;
    };
}

// Helper to fetch history for a batch of stocks
async function fetchBatchHistory(symbols: string[]) {
    // Note: yahoo-finance2 doesn't support true batch chart fetching, so we run parallel promises
    // We limit concurrency to avoid rate limits
    const BATCH_SIZE = 5;
    const results = new Map<string, any>();

    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        const batch = symbols.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (symbol) => {
            try {
                // Fetch 5m data for analysis
                const endDate = new Date();
                const startDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days back
                const query = symbol.endsWith('.JK') ? symbol : `${symbol}.JK`;

                const result = await yahooFinance.chart(query, {
                    period1: startDate,
                    period2: endDate,
                    interval: '5m',
                });
                return { symbol, data: result?.quotes || [] };
            } catch (err) {
                // console.warn(`Failed to fetch ${symbol}`, err);
                return { symbol, data: [] };
            }
        });

        const batchResults = await Promise.all(promises);
        batchResults.forEach(r => {
            if (r.data.length > 20) results.set(r.symbol, r.data);
        });

        // Small delay to be polite
        if (i + BATCH_SIZE < symbols.length) await new Promise(r => setTimeout(r, 200));
    }
    return results;
}

export async function POST(request: NextRequest) {
    try {
        console.log('[Scalper] Starting scan...');

        // 1. Get Universe (Dynamic)
        // Try getting trending first, fallback to static if needed happens inside getTrendingStocks
        const universe = await getTrendingStocks(20); // Top 20 trending
        console.log(`[Scalper] Screening ${universe.length} stocks:`, universe.join(', '));

        // 2. Fetch Data (Parallel)
        const historyMap = await fetchBatchHistory(universe);

        const results: ScalpingResult[] = [];

        // 3. Analyze Each Stock
        for (const symbol of universe) {
            const history = historyMap.get(symbol);
            if (!history || history.length < 50) continue;

            const closes = history.map((q: any) => q.close).filter((c: any) => typeof c === 'number');
            const volumes = history.map((q: any) => q.volume).filter((v: any) => typeof v === 'number');
            const highs = history.map((q: any) => q.high).filter((h: any) => typeof h === 'number');
            const lows = history.map((q: any) => q.low).filter((l: any) => typeof l === 'number');

            if (closes.length < 30) continue;

            try {
                // Run Technical Analysis
                // We assume performTechnicalAnalysis handles null checks internally or throws
                const analysis = performTechnicalAnalysis(closes, volumes, highs, lows);

                if (!analysis) continue;

                const currentPrice = closes[closes.length - 1];
                const prevPrice = closes[closes.length - 2];
                const changePercent = ((currentPrice - prevPrice) / prevPrice) * 100;

                // --- Scoring Engine ---
                let score = 0;
                let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
                const reasons: string[] = [];

                // 1. Volume Check (Stricter)
                const volRatio = analysis.volume?.volumeRatio || 0;
                if (volRatio > 2.0) {
                    score += 25; // Boost for huge volume
                    reasons.push(`Massive Vol (${volRatio.toFixed(1)}x)`);
                } else if (volRatio > 1.3) {
                    score += 15;
                    reasons.push(`High Vol (${volRatio.toFixed(1)}x)`);
                } else if (volRatio < 0.8) {
                    score -= 10;
                }

                // 2. Trend Strength (ADX) - NEW
                const adx = analysis.adx?.adx || 0;
                if (adx > 25) {
                    score += 10;
                }
                if (adx > 40) {
                    score += 10; // Very strong trend
                    reasons.push(`Strong Trend (ADX ${adx.toFixed(0)})`);
                } else if (adx < 20) {
                    score -= 15; // Weak trend, likely chopping
                    reasons.push(`Weak Trend`);
                }

                // 3. Momentum (Stochastic)
                const k = analysis.stochastic?.current.k || 50;
                const d = analysis.stochastic?.current.d || 50;
                const stochSignal = analysis.stochastic?.signal;

                if (stochSignal === 'BUY' && k < 50) { // Golden cross in lower half is better
                    score += 25;
                    reasons.push('Stoch Bull Cross');
                } else if (stochSignal === 'BUY') {
                    score += 15;
                } else if (k > 85) {
                    score -= 5; // Risk of overbought
                } else if (stochSignal === 'SELL') {
                    score -= 20;
                }

                // 4. Trend (EMA50) - 5m
                const ema50 = analysis.ema50?.current || 0;
                const trendAligned = currentPrice > ema50;

                if (trendAligned) {
                    score += 15;
                    // Check pullback: Healthy dip
                    if (analysis.rsi && analysis.rsi.current >= 40 && analysis.rsi.current <= 55) {
                        score += 20;
                        reasons.push('Perf. Pullback');
                        signal = "BUY";
                    }
                } else {
                    score -= 20; // Don't scalp against 5m trend usually
                }

                // 5. Volatility (ATR)
                const atr = analysis.atr || 0;
                const volPct = (atr / currentPrice) * 100;
                if (volPct > 0.5) {
                    score += 5;
                } else {
                    score -= 50; // Dead stock (kill switch)
                    reasons.push('DEAD STOCK');
                }

                // Final Decision (Stricter Thresholds)
                if (score >= 70 && volPct > 0.5 && adx > 20) {
                    signal = "BUY";
                } else if (score <= 30) {
                    signal = "SELL";
                }

                results.push({
                    symbol,
                    price: currentPrice,
                    changePercent,
                    score,
                    signal,
                    reason: reasons,
                    metrics: {
                        rsi: analysis.rsi?.current || 50,
                        volumeRatio: volRatio,
                        stochasticK: k,
                        stochasticD: d,
                        volatility: volPct,
                        adx: adx
                    }
                });

            } catch (err) {
                console.error(`Error analyzing ${symbol}:`, err);
            }
        }

        // Sort by score (descending)
        results.sort((a, b) => b.score - a.score);

        return NextResponse.json({
            success: true,
            activeCount: results.length,
            scanId: Date.now().toString(),
            results: results
        });

    } catch (error: any) {
        console.error('[Scalper] Scan failed:', error);
        return NextResponse.json(
            { error: 'Scalping scan failed', details: error.message },
            { status: 500 }
        );
    }
}
