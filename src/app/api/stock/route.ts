import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();
import {
    calculateEMA,
    calculateSMA,
    analyzeVolume,
    performTechnicalAnalysis,
    type IndicatorResult,
    type VolumeAnalysisResult,
    type TechnicalAnalysisResult,
} from "@/backend/analysis/indicators";



// ============================================================================
// Type Definitions
// ============================================================================


interface Signal {
    type: "BUY" | "SELL";
    indicator: string;
    reason: string;
    strength: "WEAK" | "MEDIUM" | "STRONG";
    price: number;
}

interface HistoricalQuote {
    date: Date;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
}

interface QuoteResult {
    regularMarketPrice?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    regularMarketVolume?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketPreviousClose?: number;
    marketCap?: number;
    trailingPE?: number;
    priceToBook?: number;
    longName?: string;
    shortName?: string;
}

interface ChartResult {
    quotes: HistoricalQuote[];
}

type ChartInterval = "1m" | "5m" | "1h" | "1d";

// ============================================================================
// Cache Implementation
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, { data: Record<string, any>; timestamp: number }>();
const CACHE_DURATION_SCALPING = 30 * 1000; // 30 seconds for near real-time
const CACHE_DURATION_SWING = 60 * 60 * 1000; // 1 hour

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchChart(
    symbolWithSuffix: string,
    interval: ChartInterval,
    daysBack: number
): Promise<HistoricalQuote[]> {
    const endDate = new Date();
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const chartResult = await yahooFinance.chart(symbolWithSuffix, {
        period1: startDate,
        period2: endDate,
        interval,
    }) as ChartResult;

    return chartResult.quotes || [];
}

/**
 * Calculate Average True Range (ATR) for volatility measurement
 */
function calculateATR(historical: HistoricalQuote[], period: number = 14): number {
    if (historical.length < period + 1) return 0;

    const trueRanges: number[] = [];

    for (let i = 1; i < historical.length; i++) {
        const high = historical[i].high;
        const low = historical[i].low;
        const prevClose = historical[i - 1].close;

        if (high == null || low == null || prevClose == null) continue;

        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        trueRanges.push(tr);
    }

    if (trueRanges.length < period) return 0;

    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / period;
}

/**
 * Find support and resistance levels using swing point method
 */
function findSupportResistance(historical: HistoricalQuote[]): {
    support: number[];
    resistance: number[];
} {
    if (historical.length < 20) {
        return { support: [], resistance: [] };
    }

    const support: number[] = [];
    const resistance: number[] = [];

    const lookback = Math.min(20, historical.length);
    const recent = historical.slice(-lookback);

    // Find local minima (support)
    for (let i = 2; i < recent.length - 2; i++) {
        const currentLow = recent[i].low;
        if (currentLow == null) continue;

        const prev1Low = recent[i - 1].low;
        const prev2Low = recent[i - 2].low;
        const next1Low = recent[i + 1].low;
        const next2Low = recent[i + 2].low;

        if (
            prev1Low != null && prev2Low != null &&
            next1Low != null && next2Low != null &&
            currentLow < prev1Low &&
            currentLow < prev2Low &&
            currentLow < next1Low &&
            currentLow < next2Low
        ) {
            support.push(currentLow);
        }
    }

    // Find local maxima (resistance)
    for (let i = 2; i < recent.length - 2; i++) {
        const currentHigh = recent[i].high;
        if (currentHigh == null) continue;

        const prev1High = recent[i - 1].high;
        const prev2High = recent[i - 2].high;
        const next1High = recent[i + 1].high;
        const next2High = recent[i + 2].high;

        if (
            prev1High != null && prev2High != null &&
            next1High != null && next2High != null &&
            currentHigh > prev1High &&
            currentHigh > prev2High &&
            currentHigh > next1High &&
            currentHigh > next2High
        ) {
            resistance.push(currentHigh);
        }
    }

    // Sort by proximity to current price and return top 3
    const closes = historical.map((h) => h.close).filter((c): c is number => c != null);
    const currentPrice = closes[closes.length - 1];

    support.sort((a, b) => Math.abs(currentPrice - a) - Math.abs(currentPrice - b));
    resistance.sort((a, b) => Math.abs(currentPrice - a) - Math.abs(currentPrice - b));

    return {
        support: support.slice(0, 3),
        resistance: resistance.slice(0, 3),
    };
}

/**
 * Generate trading signals based on indicator confluence
 */
function generateSignals(
    analysis: TechnicalAnalysisResult,
    currentPrice: number,
    volumeAnalysis: VolumeAnalysisResult | null
): Signal[] {
    const signals: Signal[] = [];

    // RSI Signals
    if (analysis.rsi) {
        if (analysis.rsi.signal === "BUY") {
            signals.push({
                type: "BUY",
                indicator: "RSI",
                reason: `RSI at ${analysis.rsi.current.toFixed(2)} - Oversold condition`,
                strength: analysis.rsi.current < 25 ? "STRONG" : "MEDIUM",
                price: currentPrice,
            });
        } else if (analysis.rsi.signal === "SELL") {
            signals.push({
                type: "SELL",
                indicator: "RSI",
                reason: `RSI at ${analysis.rsi.current.toFixed(2)} - Overbought condition`,
                strength: analysis.rsi.current > 75 ? "STRONG" : "MEDIUM",
                price: currentPrice,
            });
        }
    }

    // MACD Signals
    if (analysis.macd) {
        if (analysis.macd.crossover === "BULLISH") {
            signals.push({
                type: "BUY",
                indicator: "MACD",
                reason: "Bullish MACD crossover detected",
                strength:
                    Math.abs(analysis.macd.current.histogram) >
                        Math.max(1e-9, Math.abs(analysis.macd.current.macd)) * 0.5
                        ? "STRONG"
                        : "MEDIUM",
                price: currentPrice,
            });
        } else if (analysis.macd.crossover === "BEARISH") {
            signals.push({
                type: "SELL",
                indicator: "MACD",
                reason: "Bearish MACD crossover detected",
                strength:
                    Math.abs(analysis.macd.current.histogram) >
                        Math.max(1e-9, Math.abs(analysis.macd.current.macd)) * 0.5
                        ? "STRONG"
                        : "MEDIUM",
                price: currentPrice,
            });
        }
    }

    // Bollinger Bands Signals
    if (analysis.bollingerBands) {
        if (analysis.bollingerBands.signal === "BUY") {
            signals.push({
                type: "BUY",
                indicator: "Bollinger Bands",
                reason: "Price touching lower Bollinger Band - potential bounce",
                strength: "MEDIUM",
                price: currentPrice,
            });
        } else if (analysis.bollingerBands.signal === "SELL") {
            signals.push({
                type: "SELL",
                indicator: "Bollinger Bands",
                reason: "Price touching upper Bollinger Band - potential reversal",
                strength: "MEDIUM",
                price: currentPrice,
            });
        }
    }

    // Volume Confirmation
    if (volumeAnalysis && volumeAnalysis.isSpike) {
        const buySignals = signals.filter((s) => s.type === "BUY");
        const sellSignals = signals.filter((s) => s.type === "SELL");

        if (buySignals.length > 0) {
            signals.push({
                type: "BUY",
                indicator: "Volume",
                reason: `Volume spike: ${volumeAnalysis.currentVolume.toLocaleString()} (${(volumeAnalysis.volumeRatio * 100).toFixed(0)}% of average)`,
                strength: "STRONG",
                price: currentPrice,
            });
        } else if (sellSignals.length > 0) {
            signals.push({
                type: "SELL",
                indicator: "Volume",
                reason: `Volume spike with selling pressure: ${volumeAnalysis.currentVolume.toLocaleString()}`,
                strength: "STRONG",
                price: currentPrice,
            });
        }
    }

    // --- Trend Pullback Strategy (Phase 2) ---
    // Rule: Strong Uptrend (Price > EMA50) + RSI Healthy Dip (40-60) + Stochastic Bullish Cross
    if (analysis.ema50 && analysis.rsi && analysis.stochastic) {
        const isUptrend = currentPrice > analysis.ema50.current;
        const isHealthyDip = analysis.rsi.current >= 40 && analysis.rsi.current <= 60;
        const isStochCrossUp = analysis.stochastic.current.k > analysis.stochastic.current.d && analysis.stochastic.current.k < 80;

        if (isUptrend && isHealthyDip && isStochCrossUp) {
            signals.push({
                type: "BUY",
                indicator: "Trend Pullback",
                reason: "Healthy dip in uptrend (RSI 40-60) + Stochastic cross up",
                strength: "STRONG",
                price: currentPrice
            });
        }
    }

    return signals;
}

/**
 * Generate overall recommendation based on signal confluence
 */
function generateRecommendation(
    signals: Signal[],
    analysis: TechnicalAnalysisResult
): {
    action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
    confidence: number;
    reasoning: string[];
} {
    const buySignals = signals.filter((s) => s.type === "BUY");
    const sellSignals = signals.filter((s) => s.type === "SELL");
    const strongBuySignals = buySignals.filter((s) => s.strength === "STRONG");
    const strongSellSignals = sellSignals.filter((s) => s.strength === "STRONG");

    const reasoning: string[] = [];
    let action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL" = "HOLD";
    let confidence = 0;

    // Strong Buy: 3+ buy signals including at least 1 strong
    if (buySignals.length >= 3 && strongBuySignals.length >= 1) {
        action = "STRONG_BUY";
        confidence = Math.min(90, 70 + buySignals.length * 5);
        reasoning.push(`${buySignals.length} bullish indicators aligned`);
        reasoning.push(`Strong signals from: ${strongBuySignals.map((s) => s.indicator).join(", ")}`);
    }
    // Buy: 2+ buy signals OR 1 Strong Signal (e.g. Trend Pullback)
    else if (buySignals.length >= 2 || strongBuySignals.length >= 1) {
        action = "BUY";
        confidence = 60 + buySignals.length * 5;
        if (strongBuySignals.length >= 1) {
            reasoning.push(`High-quality setup detected: ${strongBuySignals[0].indicator}`);
        } else {
            reasoning.push(`${buySignals.length} bullish indicators present`);
        }
    }
    // Strong Sell: 3+ sell signals including at least 1 strong
    else if (sellSignals.length >= 3 && strongSellSignals.length >= 1) {
        action = "STRONG_SELL";
        confidence = Math.min(90, 60 + sellSignals.length * 10);
        reasoning.push(`${sellSignals.length} bearish indicators aligned`);
        reasoning.push(`Strong signals from: ${strongSellSignals.map((s) => s.indicator).join(", ")}`);
    }
    // Sell: 2+ sell signals
    else if (sellSignals.length >= 2) {
        action = "SELL";
        confidence = 50 + sellSignals.length * 10;
        reasoning.push(`${sellSignals.length} bearish indicators present`);
    }
    // Hold: Mixed or weak signals
    else {
        action = "HOLD";
        confidence = 40;
        reasoning.push("Mixed signals - no clear directional bias");
        reasoning.push("Wait for stronger confirmation before entry");
    }

    // Add trend context from RSI
    if (analysis.rsi) {
        if (analysis.rsi.current > 50) {
            reasoning.push("RSI above 50 indicates bullish momentum");
        } else {
            reasoning.push("RSI below 50 indicates bearish momentum");
        }
    }

    return { action, confidence, reasoning };
}

function applyScalpingFilters(params: {
    recommendation: {
        action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
        confidence: number;
        reasoning: string[];
    };
    signals: Signal[];
    currentPrice: number;
    trigger: { buyConfirmed: boolean; sellConfirmed: boolean; reason: string | null };
    volumeRatio: number | null;
    analysis: TechnicalAnalysisResult; // Need full analysis for 5m trend & BB
    trend1h?: 'UP' | 'DOWN' | 'NEUTRAL'; // Phase 3: Major Trend
    atr?: number | null; // Phase 3: Volatility Quality
}) {
    const { recommendation, currentPrice, trigger, volumeRatio, analysis, trend1h, atr } = params;

    // --- 0. Volatility Quality Filter (Phase 3) ---
    // If ATR is too low (< 0.5% of price), the stock is "dead". Scalping is impossible due to fees.
    if (atr && currentPrice > 0) {
        const volatilityPct = (atr / currentPrice) * 100;
        if (volatilityPct < 0.4) {
            recommendation.reasoning.unshift(`Volatility too low (ATR ${volatilityPct.toFixed(2)}%) → DEAD STOCK`);
            recommendation.action = "HOLD";
            recommendation.confidence = 0;
            return; // Hard reject
        }
    }

    // --- 0.1 Trend Strength (ADX) ---
    // New Feature: Sync with Screener Logic
    if (analysis.adx) {
        const adx = analysis.adx.adx;
        if (adx < 20) {
            recommendation.reasoning.unshift(`Weak Trend (ADX ${adx.toFixed(0)}) → CHOPPY`);
            recommendation.confidence = Math.min(recommendation.confidence, 40);
            if (recommendation.action !== "HOLD") recommendation.action = "HOLD";
        } else if (adx > 30) {
            recommendation.confidence += 10;
            recommendation.reasoning.push(`Strong Trend (ADX ${adx.toFixed(0)})`);
        }
    }

    // --- 1. Strong MTF Trend Filter (Phase 3) ---
    // If 1H is DOWN, do not BUY (unless it's a deep oversold reversal, but for scalping we want flow).
    // If 1H is UP, do not SELL.
    if (trend1h) {
        const wantsBuy = recommendation.action === "BUY" || recommendation.action === "STRONG_BUY";
        const wantsSell = recommendation.action === "SELL" || recommendation.action === "STRONG_SELL";

        if (wantsBuy && trend1h === 'DOWN') {
            recommendation.reasoning.unshift("Major Trend (1H) is DOWN → DANGEROUS/HOLD");
            recommendation.action = "HOLD";
            recommendation.confidence = Math.min(recommendation.confidence, 30);
        } else if (wantsSell && trend1h === 'UP') {
            recommendation.reasoning.unshift("Major Trend (1H) is UP → DANGEROUS/HOLD");
            recommendation.action = "HOLD";
            recommendation.confidence = Math.min(recommendation.confidence, 30);
        } else if ((wantsBuy && trend1h === 'UP') || (wantsSell && trend1h === 'DOWN')) {
            recommendation.reasoning.push(`Major Trend (1H) aligned (${trend1h})`);
            recommendation.confidence += 10; // Boost confidence significantly
        }
    }

    // --- 2. Time Filter (Liquidity Check) ---
    // Avoid pre-lunch (11:30 - 13:30) and pre-close volatility/low volume
    const now = new Date();
    // Convert to WIB (UTC+7) roughly for server time check or assume server is local/UTC.
    // Ideally use exchange time. For now, simple hour based check if running during market hours.
    // If testing offline/weekend, this might block, so we'll make it soft or only apply if meaningful.
    // SKIP implementation for now to avoid timezone complexities in this snippet without robust Timezone lib.
    // Instead, we focus on technicals.

    // --- 2. Trend Bias Filter (5m) ---
    // Rule: BUY only if Price > EMA20 (5m) AND EMA20 is rising (optional, hard to check slope with single point, so Price > EMA20 is primary).
    // SELL only if Price < EMA20 (5m).
    if (analysis.ema20) {
        const ema20 = analysis.ema20.current;
        const wantsBuy = recommendation.action === "BUY" || recommendation.action === "STRONG_BUY";
        const wantsSell = recommendation.action === "SELL" || recommendation.action === "STRONG_SELL";

        if (wantsBuy && currentPrice < ema20) {
            recommendation.reasoning.unshift("Counter-trend (Price < EMA20 5m) → HOLD");
            recommendation.action = "HOLD";
            recommendation.confidence = Math.min(recommendation.confidence, 40);
        } else if (wantsSell && currentPrice > ema20) {
            recommendation.reasoning.unshift("Counter-trend (Price > EMA20 5m) → HOLD");
            recommendation.action = "HOLD";
            recommendation.confidence = Math.min(recommendation.confidence, 40);
        } else {
            // Trend aligned
            if (recommendation.action !== "HOLD") {
                recommendation.reasoning.push("Trend aligned (Price vs EMA20 5m)");
                recommendation.confidence += 5;
            }

            // Extra: Stochastic Momentum Check
            if (analysis.stochastic) {
                const k = analysis.stochastic.current.k;
                const d = analysis.stochastic.current.d;
                // If buying, we want momentum up (k > d) or at least not exhausted (k < 80)
                if (wantsBuy && k < d && k > 60) {
                    // Minor warning: momentum fading
                    recommendation.confidence -= 5;
                }
            }
        }
    }

    // --- 3. Chop/Sideways Filter (BB Bandwidth) ---
    // Rule: If BB Bandwidth is very low, market is squeezing/choppy.
    if (analysis.bollingerBands) {
        const bandwidth = analysis.bollingerBands.current.bandwidth; // percentage
        const MIN_BANDWIDTH = 1.0; // 1% threshold, adjust based on asset class

        if (bandwidth < MIN_BANDWIDTH && recommendation.action !== "HOLD") {
            recommendation.reasoning.unshift(`Squeeze/Chop detected (BBW ${bandwidth.toFixed(2)}%) → HOLD/WAIT`);
            recommendation.action = "HOLD";
            recommendation.confidence = 30;
        }
    }

    // --- 4. Volume/Participation Filter ---
    // 1) Require decent participation (volume ratio) for scalping
    if (volumeRatio != null && volumeRatio < 1.2 && recommendation.action !== "HOLD") {
        recommendation.reasoning.unshift("Low relative volume (no confirmation) → HOLD");
        recommendation.action = "HOLD";
        recommendation.confidence = Math.min(recommendation.confidence, 45);
    }

    // --- 5. Trigger Confirmation (1m) ---
    // 2) Require 1m trigger confirmation to avoid early entries
    const wantsBuy = recommendation.action === "BUY" || recommendation.action === "STRONG_BUY";
    const wantsSell = recommendation.action === "SELL" || recommendation.action === "STRONG_SELL";

    if (wantsBuy && !trigger.buyConfirmed) {
        recommendation.reasoning.unshift(trigger.reason || "1m trigger not confirmed → HOLD");
        recommendation.action = "HOLD";
        recommendation.confidence = Math.min(recommendation.confidence, 45);
    }

    if (wantsSell && !trigger.sellConfirmed) {
        recommendation.reasoning.unshift(trigger.reason || "1m trigger not confirmed → HOLD");
        recommendation.action = "HOLD";
        recommendation.confidence = Math.min(recommendation.confidence, 45);
    }

    // --- 6. Fee-Aware Targets ---
    // 3) Fee-aware sanity: if the move is too small, it's not worth scalping
    // IDX round-trip fees ~0.40% (buy 0.15% + sell 0.25%). Add a small buffer for slippage.
    const minMovePct = 0.8; // conservative: fees+slippage+noise
    const strongSignals = params.signals.filter((s) => s.strength === "STRONG").length;
    const relaxedMinMovePct = strongSignals >= 2 ? 0.6 : minMovePct;

    // Approximate "expected" room using nearest take-profit logic (we don't have TP here)
    // Use the absolute change implied by confidence as a proxy: higher confidence allows slightly tighter moves.
    const impliedMovePct = Math.max(0.3, Math.min(1.5, recommendation.confidence / 100)); // 0.3% .. 1.5%
    if (recommendation.action !== "HOLD" && impliedMovePct < relaxedMinMovePct) {
        recommendation.reasoning.unshift("Move too small vs fees/slippage → HOLD");
        recommendation.action = "HOLD";
        recommendation.confidence = Math.min(recommendation.confidence, 40);
    }

    // Prevent silly values (defensive)
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
        recommendation.action = "HOLD";
        recommendation.confidence = 0;
        recommendation.reasoning = ["Invalid price data"];
    }
}

// ============================================================================
// Main API Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
    const ticker = "unknown";
    const mode = "scalping";

    try {
        const body = await request.json();
        const symbol = body.symbol || body.ticker;
        const requestMode = body.mode || "scalping";

        console.log('[Stock API] Request received:', { ticker: symbol, mode: requestMode });

        if (!symbol || typeof symbol !== "string") {
            return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
        }

        const normalizedSymbol = symbol.toUpperCase().replace(".JK", "");
        const cacheKey = `${normalizedSymbol}-${requestMode}`;
        const cacheDuration = requestMode === "scalping" ? CACHE_DURATION_SCALPING : CACHE_DURATION_SWING;

        // Check cache
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cacheDuration) {
            console.log('[Stock API] Returning cached data for:', cacheKey);
            return NextResponse.json({
                success: true,
                data: { ...cached.data, lastUpdated: cached.timestamp, cacheHit: true }
            });
        }

        const symbolWithSuffix = `${normalizedSymbol}.JK`;
        console.log('[Stock API] Fetching symbol:', symbolWithSuffix);

        // Fetch quote and financials in parallel
        const [quote, quoteSummary] = await Promise.all([
            yahooFinance.quote(symbolWithSuffix) as Promise<QuoteResult>,
            yahooFinance.quoteSummary(symbolWithSuffix, {
                modules: ['incomeStatementHistory', 'financialData', 'defaultKeyStatistics']
            })
        ]);

        if (!quote || !quote.regularMarketPrice) {
            console.error('[Stock API] Quote not found:', symbolWithSuffix);
            return NextResponse.json(
                { error: `Stock ${symbolWithSuffix} not found or no data available` },
                { status: 404 }
            );
        }

        // Fetch historical data - increased period for proper indicator calculation
        const isScalping = requestMode === "scalping";

        // Scalping MUST use intraday candles (1m/5m), otherwise indicators are "daily" and not usable for scalping entries.
        // Swing uses daily candles.
        let historical5m: HistoricalQuote[] = [];
        let historical1m: HistoricalQuote[] = [];
        let historical1h: HistoricalQuote[] = [];
        let historicalMain: HistoricalQuote[] = [];

        try {
            if (isScalping) {
                // 5m: broader context; 1m: trigger confirmation; 1h: major trend (Phase 3)
                historical5m = await fetchChart(symbolWithSuffix, "5m", 10);
                historical1m = await fetchChart(symbolWithSuffix, "1m", 2);
                historical1h = await fetchChart(symbolWithSuffix, "1h", 60); // 60 days back for 1h EMA50
                historicalMain = historical5m.length >= 50 ? historical5m : historical1m;
            } else {
                const daysBack = 90;
                historicalMain = await fetchChart(symbolWithSuffix, "1d", daysBack);
            }
            console.log('[Stock API] Historical data points:', {
                main: historicalMain.length,
                ...(isScalping ? { "1h": historical1h.length, "5m": historical5m.length, "1m": historical1m.length } : {}),
            });
        } catch (histError: unknown) {
            const histErrorMessage = histError instanceof Error ? histError.message : 'Unknown error';
            console.error('[Stock API] Historical data fetch failed:', histErrorMessage);
            // Continue with limited data instead of failing completely
        }

        // Validate we have minimum required data
        if (!historicalMain || historicalMain.length < 20) {
            console.error('[Stock API] Insufficient data:', historicalMain?.length || 0);
            return NextResponse.json({
                error: 'Insufficient historical data',
                details: `Only ${historicalMain?.length || 0} data points available. Need minimum 20.`,
                suggestion: 'This stock may have limited trading history. Try BBCA, BBRI, or TLKM.'
            }, { status: 400 });
        }

        // Extract price arrays with detailed logging for invalid values
        const closes = historicalMain
            .map((q) => q.close)
            .filter((c): c is number => {
                const isValid = c !== null && c !== undefined && !isNaN(c) && c > 0;
                if (!isValid && c !== null && c !== undefined) {
                    console.warn('[Stock API] Invalid close price detected:', c);
                }
                return isValid;
            });

        const volumes = historicalMain
            .map((q) => q.volume)
            .filter((v): v is number => {
                const isValid = v !== null && v !== undefined && !isNaN(v) && v >= 0;
                return isValid;
            });

        const highs = historicalMain
            .map((q) => q.high)
            .filter((h): h is number => {
                return h !== null && h !== undefined && !isNaN(h) && h > 0;
            });

        const lows = historicalMain
            .map((q) => q.low)
            .filter((l): l is number => {
                return l !== null && l !== undefined && !isNaN(l) && l > 0;
            });

        console.log(`[Stock API] Filtered ${closes.length} valid prices from ${historicalMain.length} quotes`);

        // Validate we have enough valid close prices
        if (closes.length < 20) {
            console.error('[Stock API] Insufficient valid prices after filtering:', closes.length);
            return NextResponse.json({
                error: 'Insufficient valid price data',
                details: `Only ${closes.length} valid close prices found after filtering. Need minimum 20.`
            }, { status: 400 });
        }

        // Perform technical analysis with try-catch
        let analysis: TechnicalAnalysisResult | null = null;
        let volumeAnalysisResult: VolumeAnalysisResult | null = null;
        let ema20Result: IndicatorResult | null = null;
        let ema50Result: IndicatorResult | null = null;
        let sma20Result: IndicatorResult | null = null;

        if (closes.length >= 26) {
            try {
                // Pass highs and lows for ADX/Stochastic calculations
                analysis = performTechnicalAnalysis(closes, volumes, highs, lows);
                console.log('[Stock API] ✓ Technical analysis completed:', {
                    rsi: analysis?.rsi?.current,
                    macdLine: analysis?.macd?.current?.macd,
                    bbUpper: analysis?.bollingerBands?.current?.upper
                });
            } catch (analysisError: unknown) {
                const analysisErrorMessage = analysisError instanceof Error ? analysisError.message : 'Unknown error';
                console.error('[Stock API] ✗ Technical analysis failed:', analysisErrorMessage);
                return NextResponse.json({
                    error: 'Failed to calculate technical indicators',
                    details: analysisErrorMessage,
                    closes_count: closes.length
                }, { status: 500 });
            }

            try {
                volumeAnalysisResult = analyzeVolume(volumes);
                console.log('[Stock API] ✓ Volume analysis completed');
            } catch (volError: unknown) {
                const volErrorMessage = volError instanceof Error ? volError.message : 'Unknown error';
                console.error('[Stock API] ✗ Volume analysis failed:', volErrorMessage);
                // Provide fallback instead of failing completely
                volumeAnalysisResult = {
                    currentVolume: volumes[volumes.length - 1] || 0,
                    averageVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length || 0,
                    volumeRatio: 1,
                    isSpike: false,
                    signal: 'NORMAL' as const
                };
            }

            try {
                ema20Result = calculateEMA(closes, 20);
                ema50Result = calculateEMA(closes, 50);
                sma20Result = calculateSMA(closes, 20);
                console.log('[Stock API] ✓ Moving averages calculated:', {
                    ema20: ema20Result?.current,
                    ema50: ema50Result?.current,
                    sma20: sma20Result?.current
                });
            } catch (maError: unknown) {
                const maErrorMessage = maError instanceof Error ? maError.message : 'Unknown error';
                console.error('[Stock API] ✗ Moving average calculation failed:', maErrorMessage);
                // Continue without MAs - not critical
            }
        } else {
            console.warn('[Stock API] Not enough data for full analysis. Have:', closes.length, 'Need: 26');
        }

        // Calculate ATR and support/resistance
        const atr = calculateATR(historicalMain);
        const supportResistance = findSupportResistance(historicalMain);

        // Generate signals and recommendation
        const currentPrice = quote.regularMarketPrice;
        let signals: Signal[] = [];
        let recommendation: {
            action: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
            confidence: number;
            reasoning: string[];
        } = {
            action: "HOLD",
            confidence: 0,
            reasoning: ["Insufficient data for technical analysis"],
        };

        if (analysis) {
            signals = generateSignals(analysis, currentPrice, volumeAnalysisResult);
            recommendation = generateRecommendation(signals, analysis);

            // Scalping-specific accuracy boosts:
            // - use 1m trigger confirmation
            // - require sufficient relative volume
            if (isScalping) {
                const closes1m = historical1m
                    .map((q) => q.close)
                    .filter((c): c is number => c != null && c > 0);
                const volumes1m = historical1m
                    .map((q) => q.volume)
                    .filter((v): v is number => v != null && v >= 0);

                // Phase 3: MTF Trend (1H)
                const closes1h = historical1h
                    .map((q) => q.close)
                    .filter((c): c is number => c != null && c > 0);
                const ema50_1h = closes1h.length >= 60 ? calculateEMA(closes1h, 50) : null;
                const trend1h = ema50_1h && closes1h.length > 0 ? (closes1h[closes1h.length - 1] > ema50_1h.current ? 'UP' : 'DOWN') : 'NEUTRAL';

                const ema20_1m = closes1m.length >= 25 ? calculateEMA(closes1m, 20) : null;
                const vol1m = volumes1m.length >= 30 ? analyzeVolume(volumes1m) : null;

                const last1m = closes1m.length > 0 ? closes1m[closes1m.length - 1] : null;
                const buyConfirmed = !!(last1m && ema20_1m && last1m > ema20_1m.current && (vol1m?.volumeRatio ?? 0) >= 1.2);
                const sellConfirmed = !!(last1m && ema20_1m && last1m < ema20_1m.current && (vol1m?.volumeRatio ?? 0) >= 1.2);

                if (buyConfirmed) {
                    signals.push({
                        type: "BUY",
                        indicator: "1m Trigger",
                        reason: "1m price above EMA20 with volume expansion",
                        strength: "MEDIUM",
                        price: currentPrice,
                    });
                } else if (sellConfirmed) {
                    signals.push({
                        type: "SELL",
                        indicator: "1m Trigger",
                        reason: "1m price below EMA20 with volume expansion",
                        strength: "MEDIUM",
                        price: currentPrice,
                    });
                }

                applyScalpingFilters({
                    recommendation,
                    signals,
                    currentPrice,
                    trigger: {
                        buyConfirmed,
                        sellConfirmed,
                        reason: "1m confirmation missing (EMA20 + volume) → HOLD",
                    },
                    volumeRatio: volumeAnalysisResult?.volumeRatio ?? null,
                    analysis,
                    trend1h,
                    atr
                });
            }
        }

        // Build response - return EnhancedStockData with all indicators
        const now = Date.now();
        const response = {
            symbol: normalizedSymbol,
            name: quote.longName || quote.shortName || normalizedSymbol,
            lastUpdated: now,
            cacheHit: false,
            quote: {
                price: currentPrice,
                change: quote.regularMarketChange || 0,
                changePercent: quote.regularMarketChangePercent || 0,
                volume: quote.regularMarketVolume || 0,
                marketCap: quote.marketCap || null,
                pe: quote.trailingPE || null,
                pb: quote.priceToBook || null,
                sector: null,
                previousClose: quote.regularMarketPreviousClose || 0,
                dayHigh: quote.regularMarketDayHigh || currentPrice,
                dayLow: quote.regularMarketDayLow || currentPrice,
            },
            indicators: {
                rsi: analysis?.rsi ? {
                    value: analysis.rsi.current,
                    interpretation: analysis.rsi.current < 30 ? "OVERSOLD" as const :
                        analysis.rsi.current > 70 ? "OVERBOUGHT" as const : "NEUTRAL" as const
                } : null,
                macd: analysis?.macd ? {
                    macd: analysis.macd.current.macd,
                    signal: analysis.macd.current.signal,
                    histogram: analysis.macd.current.histogram,
                    crossover: analysis.macd.crossover
                } : null,
                adx: analysis?.adx ? {
                    adx: analysis.adx.adx,
                    plusDI: analysis.adx.plusDI,
                    minusDI: analysis.adx.minusDI,
                    strength: analysis.adx.adx > 25 ? "STRONG" : "WEAK"
                } : null,
                bollingerBands: analysis?.bollingerBands ? {
                    upper: analysis.bollingerBands.current.upper,
                    middle: analysis.bollingerBands.current.middle,
                    lower: analysis.bollingerBands.current.lower,
                    bandwidth: analysis.bollingerBands.current.bandwidth,
                    position: currentPrice > analysis.bollingerBands.current.upper ? "ABOVE_UPPER" as const :
                        currentPrice < analysis.bollingerBands.current.lower ? "BELOW_LOWER" as const : "WITHIN" as const
                } : null,
                ema20: ema20Result?.current || null,
                ema50: ema50Result?.current || null,
                sma20: sma20Result?.current || null,
                volumeAnalysis: volumeAnalysisResult ? {
                    current: volumeAnalysisResult.currentVolume,
                    average: volumeAnalysisResult.averageVolume,
                    ratio: volumeAnalysisResult.volumeRatio,
                    isSpike: volumeAnalysisResult.isSpike,
                    trend: volumeAnalysisResult.volumeRatio > 1.2 ? "INCREASING" as const :
                        volumeAnalysisResult.volumeRatio < 0.8 ? "DECREASING" as const : "STABLE" as const
                } : null,
                stochastic: analysis?.stochastic ? {
                    k: analysis.stochastic.current.k,
                    d: analysis.stochastic.current.d,
                    signal: analysis.stochastic.signal
                } : null,
            },
            signals,
            supportResistance,
            atr,
            recommendation,
            financials: {
                incomeStatement: quoteSummary?.incomeStatementHistory?.incomeStatementHistory?.map(item => ({
                    date: item.endDate?.toISOString().split('T')[0] || '',
                    revenue: item.totalRevenue || 0,
                    netIncome: item.netIncome || 0
                })).reverse() || [], // Reverse to show oldest to newest
                profitMargins: quoteSummary?.financialData?.profitMargins || 0,
                revenueGrowth: quoteSummary?.financialData?.revenueGrowth || 0
            }
        };

        // Update cache
        cache.set(cacheKey, { data: response, timestamp: Date.now() });

        console.log('[Stock API] ✓ Response ready for:', normalizedSymbol, {
            hasRSI: !!response.indicators.rsi,
            hasMACD: !!response.indicators.macd,
            hasBB: !!response.indicators.bollingerBands,
            hasVolume: !!response.indicators.volumeAnalysis,
            signalCount: signals.length
        });
        return NextResponse.json({ success: true, data: response });
    } catch (error: unknown) {
        const errorInstance = error instanceof Error ? error : new Error('Unknown error');
        console.error('[Stock API] Fatal error:', {
            message: errorInstance.message,
            stack: errorInstance.stack,
            ticker,
            mode
        });

        const errorMessage = errorInstance.message;

        if (errorMessage.includes("Not Found") || errorMessage.includes("no results")) {
            return NextResponse.json(
                { error: "Stock ticker not found. Please check the ticker symbol." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            error: 'Failed to fetch stock data',
            details: errorMessage,
            ticker,
            mode,
            timestamp: new Date().toISOString(),
            ...(process.env.NODE_ENV === 'development' && { stack: errorInstance.stack })
        }, { status: 500 });
    }
}
