/**
 * BPJS Scanner API Endpoint
 * 
 * Main endpoint that orchestrates:
 * 1. Fetch stock universe (50 stocks)
 * 2. Parallel fetch & score stocks (batches of 10)
 * 3. Filter & sort by score
 * 4. Generate AI analysis for top candidates (max 5 concurrent)
 * 5. Return ranked results with recommendations
 * 
 * Route: POST /api/screener/bpjs/scan
 * Cache: 5 minutes TTL
 * 
 * @module app/api/screener/bpjs/scan
 */

import { NextRequest } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { BPJS_UNIVERSE, getStockInfo } from '@/lib/bpjs/universe';
import { calculateBPJSScore, type BPJSScore } from '@/lib/bpjs/scoring';
import { generateAIAnalysis, type AIRecommendation } from '@/lib/bpjs/aiAnalyst';
import type { EnhancedStockData, MarketContext } from '@/shared/types';
import {
    performTechnicalAnalysis,
    type TechnicalAnalysisResult,
} from '@/backend/analysis/indicators';
import { fetchStockNews } from '@/lib/bpjs/news';

const yahooFinance = new YahooFinance();

interface ScanResult {
    rank: number;
    score: BPJSScore;
    aiAnalysis: AIRecommendation;
}

interface ScanResponse {
    success: boolean;
    timestamp: string;
    scanDuration: number;
    stocksScanned: number;
    candidatesFound: number;
    results: ScanResult[];
    error?: string;
}

// Simple in-memory cache (5 minutes)
const cache = new Map<string, { data: ScanResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await request.json();
        const {
            universeSize = 50,
            minScore = 50,
            maxResults = 10,
        } = body;

        console.log('[BPJS Scan] Starting scan...', { universeSize, minScore, maxResults });

        // Check cache
        const cacheKey = `scan-${universeSize}-${minScore}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log('[BPJS Scan] Returning cached results');
            return Response.json(cached.data);
        }

        // Fetch market context (IHSG & USD/IDR)
        console.log('[BPJS Scan] Fetching market context...');
        const marketContext = await fetchMarketContext();

        // Get stock universe
        const universe = BPJS_UNIVERSE.slice(0, universeSize);
        console.log(`[BPJS Scan] Scanning ${universe.length} stocks`);

        // Fetch and score stocks in parallel (batches of 10)
        const batchSize = 10;
        const scoredStocks: BPJSScore[] = [];

        for (let i = 0; i < universe.length; i += batchSize) {
            const batch = universe.slice(i, i + batchSize);
            console.log(`[BPJS Scan] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(universe.length / batchSize)}`);

            const batchResults = await Promise.allSettled(
                batch.map(stock => fetchAndScoreStock(stock.symbol))
            );

            for (const result of batchResults) {
                if (result.status === 'fulfilled' && result.value) {
                    scoredStocks.push(result.value.score);
                } else if (result.status === 'rejected') {
                    console.warn('[BPJS Scan] Stock fetch failed:', result.reason);
                }
            }
        }

        console.log(`[BPJS Scan] Scored ${scoredStocks.length} stocks successfully`);

        // Filter and sort by score
        const candidates = scoredStocks
            .filter(stock => stock.totalScore >= minScore)
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, maxResults);

        console.log(`[BPJS Scan] Found ${candidates.length} candidates above score ${minScore}`);

        // Generate AI analysis for top candidates (parallel, max 5 concurrent)
        const aiConcurrency = 5;
        const results: ScanResult[] = [];

        for (let i = 0; i < candidates.length; i += aiConcurrency) {
            const batch = candidates.slice(i, i + aiConcurrency);
            console.log(`[BPJS Scan] Generating AI analysis batch ${Math.floor(i / aiConcurrency) + 1}`);

            const batchAnalysis = await Promise.allSettled(
                batch.map(async (candidate, idx) => {
                    try {
                        // Fetch full stock data for AI analysis
                        const fullDataResult = await fetchAndScoreStock(candidate.symbol);
                        if (!fullDataResult) {
                            throw new Error(`Failed to fetch data for ${candidate.symbol}`);
                        }

                        const aiAnalysis = await generateAIAnalysis(candidate, fullDataResult.stockData, marketContext);

                        return {
                            rank: i + idx + 1,
                            score: candidate,
                            aiAnalysis,
                        };
                    } catch (error) {
                        console.error(`[BPJS Scan] AI analysis failed for ${candidate.symbol}:`, error);
                        // Return with fallback AI analysis
                        const fallbackAnalysis: AIRecommendation = {
                            recommendation: candidate.totalScore >= 70 ? 'BUY' : candidate.totalScore >= 50 ? 'HOLD' : 'AVOID',
                            confidence: Math.min(candidate.totalScore, 75),
                            reasons: ['Analisis AI tidak tersedia'],
                            strategy: {
                                entryZone: { min: candidate.quote.currentPrice * 0.99, max: candidate.quote.currentPrice * 1.01 },
                                targetProfit: { price: candidate.quote.currentPrice * 1.025, percent: 2.5 },
                                stopLoss: { price: candidate.quote.currentPrice * 0.99, percent: 1.0 },
                                riskReward: 2.5,
                            },
                            risks: ['Gunakan pertimbangan Anda sendiri'],
                            additionalNotes: 'Fallback recommendation',
                            rawResponse: 'AI unavailable',
                            generatedAt: new Date().toISOString(),
                        };

                        return {
                            rank: i + idx + 1,
                            score: candidate,
                            aiAnalysis: fallbackAnalysis,
                        };
                    }
                })
            );

            for (const result of batchAnalysis) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
            }
        }

        const scanDuration = Date.now() - startTime;
        console.log(`[BPJS Scan] Completed in ${scanDuration}ms`);

        const response: ScanResponse = {
            success: true,
            timestamp: new Date().toISOString(),
            scanDuration,
            stocksScanned: universe.length,
            candidatesFound: results.length,
            results,
        };

        // Cache the results
        cache.set(cacheKey, { data: response, timestamp: Date.now() });

        return Response.json(response);

    } catch (error) {
        console.error('[BPJS Scan] Error:', error);
        const scanDuration = Date.now() - startTime;

        return Response.json(
            {
                success: false,
                timestamp: new Date().toISOString(),
                scanDuration,
                stocksScanned: 0,
                candidatesFound: 0,
                results: [],
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * Fetch stock data from Yahoo Finance and calculate BPJS score
 */
async function fetchAndScoreStock(symbol: string): Promise<{ score: BPJSScore; stockData: EnhancedStockData } | null> {
    try {
        // Fetch stock data (technical) and news (sentiment) in parallel
        const [stockData, newsResult] = await Promise.all([
            fetchStockData(symbol),
            fetchStockNews(symbol)
        ]);

        // Attach news to stock data for AI prompt
        if (newsResult.headlines.length > 0) {
            stockData.news = newsResult.headlines.map(h => ({
                title: h.title,
                publisher: h.publisher,
                link: h.link,
                publishTime: h.publishTime.toISOString()
            }));
        }

        // Calculate score using real news sentiment
        const score = calculateBPJSScore(stockData, newsResult.score);

        return { score, stockData };
    } catch (error) {
        console.warn(`[BPJS Scan] Failed to fetch/score ${symbol}:`, error);
        return null;
    }
}

/**
 * Fetch complete stock data with technical analysis
 */
async function fetchStockData(symbol: string): Promise<EnhancedStockData> {
    const symbolWithSuffix = `${symbol}.JK`;

    // Fetch quote data
    const quote = await yahooFinance.quote(symbolWithSuffix);

    if (!quote || !quote.regularMarketPrice) {
        throw new Error(`No quote data for ${symbol}`);
    }

    // Fetch historical data (90 days for proper indicator calculation)
    const endDate = new Date();
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const chartResult = await yahooFinance.chart(symbolWithSuffix, {
        period1: startDate,
        period2: endDate,
        interval: '1d',
    });

    const historicalData = chartResult.quotes || [];

    if (historicalData.length < 20) {
        throw new Error(`Insufficient historical data for ${symbol}`);
    }

    // Extract price arrays
    const closes = historicalData
        .map(q => q.close)
        .filter((c): c is number => c !== null && c !== undefined && !isNaN(c) && c > 0);

    const volumes = historicalData
        .map(q => q.volume)
        .filter((v): v is number => v !== null && v !== undefined && !isNaN(v) && v >= 0);

    const highs = historicalData
        .map(q => q.high)
        .filter((h): h is number => h !== null && h !== undefined && !isNaN(h) && h > 0);

    const lows = historicalData
        .map(q => q.low)
        .filter((l): l is number => l !== null && l !== undefined && !isNaN(l) && l > 0);

    if (closes.length < 20) {
        throw new Error(`Insufficient valid price data for ${symbol}`);
    }

    // Perform technical analysis
    const analysis: TechnicalAnalysisResult = performTechnicalAnalysis(closes, volumes, highs, lows);

    // Get stock info
    const stockInfo = getStockInfo(symbol);

    // Build EnhancedStockData
    const enhancedData: EnhancedStockData = {
        symbol: symbol,
        name: stockInfo?.name || quote.longName || quote.shortName || symbol,
        quote: {
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            volume: quote.regularMarketVolume || 0,
            marketCap: quote.marketCap || null,
            pe: quote.trailingPE || null,
            pb: quote.priceToBook || null,
            sector: stockInfo?.sector || null,
            previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
            dayHigh: quote.regularMarketDayHigh || quote.regularMarketPrice,
            dayLow: quote.regularMarketDayLow || quote.regularMarketPrice,
        },
        indicators: {
            rsi: analysis.rsi ? {
                value: analysis.rsi.current,
                interpretation: analysis.rsi.current < 30 ? 'OVERSOLD' as const :
                    analysis.rsi.current > 70 ? 'OVERBOUGHT' as const : 'NEUTRAL' as const,
            } : { value: 50, interpretation: 'NEUTRAL' as const },
            macd: analysis.macd ? {
                macd: analysis.macd.current.macd,
                signal: analysis.macd.current.signal,
                histogram: analysis.macd.current.histogram,
                crossover: analysis.macd.crossover,
            } : { macd: 0, signal: 0, histogram: 0, crossover: 'NONE' as const },
            bollingerBands: analysis.bollingerBands ? {
                upper: analysis.bollingerBands.current.upper,
                middle: analysis.bollingerBands.current.middle,
                lower: analysis.bollingerBands.current.lower,
                bandwidth: analysis.bollingerBands.current.bandwidth,
                position: quote.regularMarketPrice > analysis.bollingerBands.current.upper ? 'ABOVE_UPPER' as const :
                    quote.regularMarketPrice < analysis.bollingerBands.current.lower ? 'BELOW_LOWER' as const : 'WITHIN' as const,
            } : null,
            ema20: closes.length >= 20 ? closes.slice(-20).reduce((a, b) => a + b) / 20 : quote.regularMarketPrice,
            ema50: closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b) / 50 : quote.regularMarketPrice,
            sma20: closes.length >= 20 ? closes.slice(-20).reduce((a, b) => a + b) / 20 : null,
            volumeAnalysis: {
                current: quote.regularMarketVolume || 0,
                average: volumes.length > 0 ? volumes.reduce((a, b) => a + b) / volumes.length : 1,
                ratio: volumes.length > 0 ? (quote.regularMarketVolume || 0) / (volumes.reduce((a, b) => a + b) / volumes.length) : 1,
                isSpike: false,
                trend: 'STABLE' as const,
            },
        },
        signals: [],
        supportResistance: {
            support: [],
            resistance: [],
        },
        atr: analysis.atr || 0,
        recommendation: {
            action: 'HOLD' as const,
            confidence: 50,
            reasoning: [],
        },
    };

    return enhancedData;
}

/**
 * Fetch overall market context (IHSG & USD/IDR)
 */
async function fetchMarketContext(): Promise<MarketContext | undefined> {
    try {
        const [ihsg, usdidr] = await Promise.all([
            yahooFinance.quote('^JKSE'),
            yahooFinance.quote('USDIDR=X')
        ]);

        return {
            ihsg: {
                price: ihsg.regularMarketPrice || 0,
                changePercent: ihsg.regularMarketChangePercent || 0,
                trend: (ihsg.regularMarketChangePercent || 0) > 0.5 ? 'BULLISH' : (ihsg.regularMarketChangePercent || 0) < -0.5 ? 'BEARISH' : 'NEUTRAL'
            },
            usdidr: {
                price: usdidr.regularMarketPrice || 0,
                changePercent: usdidr.regularMarketChangePercent || 0
            }
        };
    } catch (e) {
        console.warn('[BPJS Scan] Failed to fetch market context:', e);
        return undefined;
    }
}
