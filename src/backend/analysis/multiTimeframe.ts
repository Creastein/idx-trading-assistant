/**
 * Multi-Timeframe Analysis System
 * 
 * Implements confluence analysis across multiple timeframes to improve signal accuracy.
 * - Scalping Mode: 1m, 5m, 15m, 1h
 * - Swing Mode: 1h, 4h, 1d, 1w
 */

import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();
import {
    calculateRSI,
    calculateMACD,
    calculateEMA,
    analyzeVolume,
    type IndicatorResult,
    type MACDResult,
} from "./indicators";

// ============================================================================
// Type Definitions
// ============================================================================

export type TrendDirection = "BULLISH" | "BEARISH" | "NEUTRAL";
export type ConfluenceDirection = "BULLISH" | "BEARISH" | "MIXED";
export type RecommendedAction = "BUY" | "SELL" | "WAIT";

export interface TimeframeAnalysis {
    interval: string;
    trend: TrendDirection;
    strength: number;
    key_levels: {
        support: number;
        resistance: number;
    };
    indicators: {
        rsi: number | null;
        macdCrossover: "BULLISH" | "BEARISH" | "NONE";
        emaAlignment: TrendDirection;
        volumeSignal: "HIGH" | "LOW" | "NORMAL";
    };
}

export interface Confluence {
    direction: ConfluenceDirection;
    strength: number;
    agreement: string;
}

export interface Recommendation {
    action: RecommendedAction;
    confidence: number;
    entry_zone: {
        min: number;
        max: number;
    };
    stop_loss: number;
    take_profit: number[];
}

export interface MultiTimeframeAnalysis {
    symbol: string;
    mode: "scalping" | "swing";
    timeframes: TimeframeAnalysis[];
    confluence: Confluence;
    recommendation: Recommendation;
    timestamp: string;
}

interface HistoricalQuote {
    date: Date;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
}

interface ChartResult {
    quotes: HistoricalQuote[];
}

interface QuoteResult {
    regularMarketPrice?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Internal timeframe keys used by this module.
 *
 * Notes:
 * - Yahoo Finance does not provide a native "4h" interval for equities.
 *   We generate "4h" candles by aggregating "1h" (60m) candles.
 */
type InternalInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

const SCALPING_TIMEFRAMES: readonly InternalInterval[] = ["1m", "5m", "15m", "1h"] as const;
const SWING_TIMEFRAMES: readonly InternalInterval[] = ["1h", "4h", "1d", "1w"] as const;

const TIMEFRAME_PERIODS: Record<InternalInterval, number> = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "1h": 14,
    "4h": 60,
    "1d": 60,
    "1w": 365,
};

// ============================================================================
// Helper Functions
// ============================================================================

function toNumberOrNull(value: number | null | undefined): number | null {
    return value === null || value === undefined || Number.isNaN(value) ? null : value;
}

/**
 * Aggregate 1h candles into synthetic 4h candles.
 * We group consecutive 1h candles (4 at a time) into a single bar.
 */
function aggregateTo4h(hourly: HistoricalQuote[]): HistoricalQuote[] {
    if (!hourly || hourly.length < 4) return [];

    const result: HistoricalQuote[] = [];

    for (let i = 0; i + 3 < hourly.length; i += 4) {
        const chunk = hourly.slice(i, i + 4);

        const opens = toNumberOrNull(chunk[0]?.open);
        const closes = toNumberOrNull(chunk[chunk.length - 1]?.close);

        const highs = chunk.map((q) => toNumberOrNull(q.high)).filter((v): v is number => v != null);
        const lows = chunk.map((q) => toNumberOrNull(q.low)).filter((v): v is number => v != null);
        const volumes = chunk.map((q) => toNumberOrNull(q.volume)).filter((v): v is number => v != null);

        // If the chunk can't produce a usable OHLC, skip it.
        if (opens == null || closes == null || highs.length === 0 || lows.length === 0) continue;

        result.push({
            date: chunk[chunk.length - 1].date,
            open: opens,
            high: Math.max(...highs),
            low: Math.min(...lows),
            close: closes,
            volume: volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) : null,
        });
    }

    return result;
}

function toYahooInterval(interval: InternalInterval): "1m" | "5m" | "15m" | "60m" | "1d" | "1wk" {
    switch (interval) {
        case "1m":
        case "5m":
        case "15m":
            return interval;
        case "1h":
        case "4h":
            return "60m";
        case "1d":
            return "1d";
        case "1w":
            return "1wk";
    }
}

/**
 * Fetch historical data for a specific timeframe
 */
async function fetchTimeframeData(
    symbol: string,
    interval: InternalInterval,
    daysBack: number
): Promise<HistoricalQuote[]> {
    try {
        const endDate = new Date();
        const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

        const chartResult = await yahooFinance.chart(symbol, {
            period1: startDate,
            period2: endDate,
            interval: toYahooInterval(interval),
        }) as ChartResult;

        const quotes = chartResult.quotes || [];
        if (interval === "4h") {
            return aggregateTo4h(quotes);
        }
        return quotes;
    } catch (error) {
        console.warn(`Failed to fetch ${interval} data for ${symbol}:`, error);
        return [];
    }
}

/**
 * Analyze trend direction based on EMA alignment
 */
function analyzeTrend(
    closes: number[],
    ema20: IndicatorResult | null,
    ema50: IndicatorResult | null,
    rsi: IndicatorResult | null,
    macd: MACDResult | null
): { trend: TrendDirection; strength: number } {
    if (closes.length < 20) {
        return { trend: "NEUTRAL", strength: 0 };
    }

    let bullishScore = 0;
    let bearishScore = 0;
    const indicators = 4;

    const currentPrice = closes[closes.length - 1];

    // EMA 20 alignment
    if (ema20 && currentPrice > ema20.current) {
        bullishScore++;
    } else if (ema20 && currentPrice < ema20.current) {
        bearishScore++;
    }

    // EMA 50 alignment
    if (ema50 && currentPrice > ema50.current) {
        bullishScore++;
    } else if (ema50 && currentPrice < ema50.current) {
        bearishScore++;
    }

    // RSI trend
    if (rsi) {
        if (rsi.current > 50) bullishScore++;
        else if (rsi.current < 50) bearishScore++;
    }

    // MACD crossover
    if (macd) {
        if (macd.crossover === "BULLISH" || macd.current.histogram > 0) {
            bullishScore++;
        } else if (macd.crossover === "BEARISH" || macd.current.histogram < 0) {
            bearishScore++;
        }
    }

    // Determine trend and strength
    const maxScore = Math.max(bullishScore, bearishScore);
    const strength = Math.round((maxScore / indicators) * 100);

    if (bullishScore >= 3) return { trend: "BULLISH", strength };
    if (bearishScore >= 3) return { trend: "BEARISH", strength };
    return { trend: "NEUTRAL", strength };
}

/**
 * Find support and resistance from recent price action
 */
function findKeyLevels(
    historical: HistoricalQuote[]
): { support: number; resistance: number } {
    if (historical.length < 10) {
        return { support: 0, resistance: 0 };
    }

    const recent = historical.slice(-20);
    const lows = recent.map((q) => q.low).filter((l): l is number => l != null);
    const highs = recent.map((q) => q.high).filter((h): h is number => h != null);

    const support = lows.length > 0 ? Math.min(...lows) : 0;
    const resistance = highs.length > 0 ? Math.max(...highs) : 0;

    return { support, resistance };
}

/**
 * Determine EMA alignment direction
 */
function getEMAAlignment(
    currentPrice: number,
    ema20: IndicatorResult | null,
    ema50: IndicatorResult | null
): TrendDirection {
    if (!ema20 || !ema50) return "NEUTRAL";

    const priceAboveEma20 = currentPrice > ema20.current;
    const priceAboveEma50 = currentPrice > ema50.current;
    const ema20AboveEma50 = ema20.current > ema50.current;

    if (priceAboveEma20 && priceAboveEma50 && ema20AboveEma50) {
        return "BULLISH";
    }
    if (!priceAboveEma20 && !priceAboveEma50 && !ema20AboveEma50) {
        return "BEARISH";
    }
    return "NEUTRAL";
}

/**
 * Analyze a single timeframe
 */
async function analyzeTimeframe(
    symbol: string,
    interval: InternalInterval
): Promise<TimeframeAnalysis | null> {
    const daysBack = TIMEFRAME_PERIODS[interval] || 30;
    const historical = await fetchTimeframeData(symbol, interval, daysBack);

    if (historical.length < 26) {
        return null;
    }

    const closes = historical
        .map((q) => q.close)
        .filter((c): c is number => c != null);
    const volumes = historical
        .map((q) => q.volume)
        .filter((v): v is number => v != null);

    if (closes.length < 26) {
        return null;
    }

    // Calculate indicators
    const rsi = calculateRSI(closes);
    const macd = calculateMACD(closes);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const volume = analyzeVolume(volumes);

    // Analyze trend
    const { trend, strength } = analyzeTrend(closes, ema20, ema50, rsi, macd);

    // Find key levels
    const keyLevels = findKeyLevels(historical);

    // Get EMA alignment
    const currentPrice = closes[closes.length - 1];
    const emaAlignment = getEMAAlignment(currentPrice, ema20, ema50);

    // Volume signal
    let volumeSignal: "HIGH" | "LOW" | "NORMAL" = "NORMAL";
    if (volume) {
        if (volume.isSpike) volumeSignal = "HIGH";
        else if (volume.volumeRatio < 0.5) volumeSignal = "LOW";
    }

    return {
        interval,
        trend,
        strength,
        key_levels: keyLevels,
        indicators: {
            rsi: rsi?.current || null,
            macdCrossover: macd?.crossover || "NONE",
            emaAlignment,
            volumeSignal,
        },
    };
}

/**
 * Calculate confluence from multiple timeframe analyses
 */
function calculateConfluence(timeframes: TimeframeAnalysis[]): Confluence {
    const bullishCount = timeframes.filter((tf) => tf.trend === "BULLISH").length;
    const bearishCount = timeframes.filter((tf) => tf.trend === "BEARISH").length;
    const totalCount = timeframes.length;

    // Calculate average strength
    const avgStrength =
        timeframes.reduce((sum, tf) => sum + tf.strength, 0) / totalCount;

    // Check higher timeframe (last in array is highest)
    const higherTF = timeframes[timeframes.length - 1];
    const higherTFAgrees =
        (bullishCount > bearishCount && higherTF?.trend === "BULLISH") ||
        (bearishCount > bullishCount && higherTF?.trend === "BEARISH");

    let direction: ConfluenceDirection = "MIXED";
    let strength = avgStrength;

    if (bullishCount >= 3 && higherTFAgrees) {
        direction = "BULLISH";
        strength = Math.min(100, avgStrength + 20);
    } else if (bearishCount >= 3 && higherTFAgrees) {
        direction = "BEARISH";
        strength = Math.min(100, avgStrength + 20);
    } else if (bullishCount >= 3) {
        direction = "BULLISH";
    } else if (bearishCount >= 3) {
        direction = "BEARISH";
    }

    const agreementCount = Math.max(bullishCount, bearishCount);
    const agreement = `${agreementCount}/${totalCount} timeframes agree`;

    return { direction, strength: Math.round(strength), agreement };
}

/**
 * Generate trading recommendation based on confluence
 */
function generateRecommendation(
    confluence: Confluence,
    timeframes: TimeframeAnalysis[],
    currentPrice: number
): Recommendation {
    // Find nearest support and resistance
    const supports = timeframes
        .map((tf) => tf.key_levels.support)
        .filter((s) => s > 0 && s < currentPrice);
    const resistances = timeframes
        .map((tf) => tf.key_levels.resistance)
        .filter((r) => r > 0 && r > currentPrice);

    const nearestSupport =
        supports.length > 0 ? Math.max(...supports) : currentPrice * 0.97;
    const nearestResistance =
        resistances.length > 0 ? Math.min(...resistances) : currentPrice * 1.03;

    // Default recommendation
    let action: RecommendedAction = "WAIT";
    const confidence = confluence.strength;

    if (confluence.direction === "BULLISH" && confluence.strength >= 60) {
        action = "BUY";
    } else if (confluence.direction === "BEARISH" && confluence.strength >= 60) {
        action = "SELL";
    }

    // Calculate entry zone (0.5% range around current price)
    const entryMin = currentPrice * 0.995;
    const entryMax = currentPrice * 1.005;

    // Calculate stop loss and take profits
    let stopLoss: number;
    let takeProfits: number[];

    if (action === "BUY") {
        stopLoss = nearestSupport * 0.99; // 1% below support
        const riskAmount = currentPrice - stopLoss;
        takeProfits = [
            currentPrice + riskAmount * 1.5, // 1.5:1 RR
            currentPrice + riskAmount * 2.0, // 2:1 RR
            currentPrice + riskAmount * 3.0, // 3:1 RR
        ];
    } else if (action === "SELL") {
        stopLoss = nearestResistance * 1.01; // 1% above resistance
        const riskAmount = stopLoss - currentPrice;
        takeProfits = [
            currentPrice - riskAmount * 1.5,
            currentPrice - riskAmount * 2.0,
            currentPrice - riskAmount * 3.0,
        ];
    } else {
        stopLoss = nearestSupport;
        takeProfits = [nearestResistance];
    }

    return {
        action,
        confidence,
        entry_zone: { min: entryMin, max: entryMax },
        stop_loss: Math.round(stopLoss),
        take_profit: takeProfits.map((tp) => Math.round(tp)),
    };
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Analyze multiple timeframes for confluence
 * 
 * @param symbol - Stock symbol (e.g., "BBCA")
 * @param mode - Trading mode ("scalping" or "swing")
 * @returns Complete multi-timeframe analysis with recommendation
 * 
 * @example
 * const analysis = await analyzeMultipleTimeframes("BBCA", "scalping");
 * console.log(analysis.confluence); // { direction: "BULLISH", strength: 75, agreement: "3/4 timeframes agree" }
 */
export async function analyzeMultipleTimeframes(
    symbol: string,
    mode: "scalping" | "swing"
): Promise<MultiTimeframeAnalysis> {
    const symbolWithSuffix = symbol.toUpperCase().endsWith(".JK")
        ? symbol.toUpperCase()
        : `${symbol.toUpperCase()}.JK`;

    const timeframeIntervals =
        mode === "scalping" ? SCALPING_TIMEFRAMES : SWING_TIMEFRAMES;

    // Analyze all timeframes in parallel (plus current quote price)
    const analysisPromises = timeframeIntervals.map((interval) => analyzeTimeframe(symbolWithSuffix, interval));
    const quotePromise = yahooFinance
        .quote(symbolWithSuffix)
        .then((q) => q as QuoteResult)
        .catch(() => null);

    const [results, quote] = await Promise.all([Promise.all(analysisPromises), quotePromise]);

    // Filter out null results
    const timeframes = results.filter(
        (result): result is TimeframeAnalysis => result !== null
    );

    // Calculate confluence
    const confluence =
        timeframes.length > 0
            ? calculateConfluence(timeframes)
            : { direction: "MIXED" as const, strength: 0, agreement: "0/0 timeframes" };

    // Prefer real current price from quote; fallback to a reasonable approximation.
    let currentPrice = quote?.regularMarketPrice ?? 0;

    if (!currentPrice || !Number.isFinite(currentPrice)) {
        // Approximation: midpoint of key levels of the first available timeframe
        const firstTF = timeframes[0];
        if (firstTF) {
            currentPrice = (firstTF.key_levels.support + firstTF.key_levels.resistance) / 2;
        }
    }

    // Generate recommendation
    const recommendation = generateRecommendation(
        confluence,
        timeframes,
        currentPrice
    );

    return {
        symbol: symbol.toUpperCase().replace(".JK", ""),
        mode,
        timeframes,
        confluence,
        recommendation,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Quick confluence check without full analysis
 * Useful for screening multiple stocks quickly
 */
export async function getQuickConfluence(
    symbol: string,
    mode: "scalping" | "swing"
): Promise<{
    direction: ConfluenceDirection;
    strength: number;
    shouldTrade: boolean;
}> {
    const analysis = await analyzeMultipleTimeframes(symbol, mode);
    return {
        direction: analysis.confluence.direction,
        strength: analysis.confluence.strength,
        shouldTrade: analysis.recommendation.action !== "WAIT",
    };
}
