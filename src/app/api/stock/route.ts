import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();
import {
    calculateRSI,
    calculateMACD,
    calculateBollingerBands,
    calculateEMA,
    calculateSMA,
    analyzeVolume,
    performTechnicalAnalysis,
    type IndicatorResult,
    type MACDResult,
    type BollingerBandsResult,
    type VolumeAnalysisResult,
    type TechnicalAnalysisResult,
} from "@/lib/indicators";
import { StockData } from "@/lib/types";


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

// ============================================================================
// Cache Implementation
// ============================================================================

const cache = new Map<string, { data: StockData; timestamp: number }>();
const CACHE_DURATION_SCALPING = 5 * 60 * 1000; // 5 minutes
const CACHE_DURATION_SWING = 60 * 60 * 1000; // 1 hour

// ============================================================================
// Helper Functions
// ============================================================================

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
                strength: Math.abs(analysis.macd.current.histogram) > 10 ? "STRONG" : "MEDIUM",
                price: currentPrice,
            });
        } else if (analysis.macd.crossover === "BEARISH") {
            signals.push({
                type: "SELL",
                indicator: "MACD",
                reason: "Bearish MACD crossover detected",
                strength: Math.abs(analysis.macd.current.histogram) > 10 ? "STRONG" : "MEDIUM",
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
        confidence = Math.min(90, 60 + buySignals.length * 10);
        reasoning.push(`${buySignals.length} bullish indicators aligned`);
        reasoning.push(`Strong signals from: ${strongBuySignals.map((s) => s.indicator).join(", ")}`);
    }
    // Buy: 2+ buy signals
    else if (buySignals.length >= 2) {
        action = "BUY";
        confidence = 50 + buySignals.length * 10;
        reasoning.push(`${buySignals.length} bullish indicators present`);
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

// ============================================================================
// Main API Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const symbol = body.symbol || body.ticker;
        const mode = body.mode || "scalping";

        if (!symbol || typeof symbol !== "string") {
            return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
        }

        const normalizedSymbol = symbol.toUpperCase().replace(".JK", "");
        const cacheKey = `${normalizedSymbol}-${mode}`;
        const cacheDuration = mode === "scalping" ? CACHE_DURATION_SCALPING : CACHE_DURATION_SWING;

        // Check cache
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cacheDuration) {
            return NextResponse.json({ success: true, data: cached.data });
        }

        const symbolWithSuffix = `${normalizedSymbol}.JK`;

        // Fetch quote data
        const quote = await yahooFinance.quote(symbolWithSuffix) as QuoteResult;

        if (!quote || !quote.regularMarketPrice) {
            return NextResponse.json(
                { error: `Stock ${symbolWithSuffix} not found or no data available` },
                { status: 404 }
            );
        }

        // Fetch historical data
        const daysBack = mode === "scalping" ? 30 : 90;
        const endDate = new Date();
        const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

        let historicalData: HistoricalQuote[] = [];
        try {
            const chartResult = await yahooFinance.chart(symbolWithSuffix, {
                period1: startDate,
                period2: endDate,
                interval: "1d",
            }) as ChartResult;
            historicalData = chartResult.quotes;
        } catch {
            // Fallback: use only quote data if historical fails
            console.warn("Historical data fetch failed, using limited data");
        }

        // Extract price and volume arrays
        const closes = historicalData
            .map((q) => q.close)
            .filter((c): c is number => c != null);
        const volumes = historicalData
            .map((q) => q.volume)
            .filter((v): v is number => v != null);

        // Perform technical analysis (only if we have enough data)
        let analysis: TechnicalAnalysisResult | null = null;
        let volumeAnalysisResult: VolumeAnalysisResult | null = null;
        let ema20Result: IndicatorResult | null = null;
        let ema50Result: IndicatorResult | null = null;
        let sma20Result: IndicatorResult | null = null;

        if (closes.length >= 26) {
            analysis = performTechnicalAnalysis(closes, volumes);
            volumeAnalysisResult = analyzeVolume(volumes);
            ema20Result = calculateEMA(closes, 20);
            ema50Result = calculateEMA(closes, 50);
            sma20Result = calculateSMA(closes, 20);
        }

        // Calculate ATR and support/resistance
        const atr = calculateATR(historicalData);
        const supportResistance = findSupportResistance(historicalData);

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
        }

        // Build response - flatten structure to match StockData interface
        const response: StockData = {
            symbol: normalizedSymbol,
            name: quote.longName || quote.shortName || normalizedSymbol,
            price: currentPrice,
            currency: "IDR",
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            volume: quote.regularMarketVolume || 0,
            marketCap: quote.marketCap || undefined,
            pe: quote.trailingPE || undefined,
            pb: quote.priceToBook || undefined,
            previousClose: quote.regularMarketPreviousClose || 0,
            dayHigh: quote.regularMarketDayHigh || currentPrice,
            dayLow: quote.regularMarketDayLow || currentPrice,
        };

        // Update cache
        cache.set(cacheKey, { data: response, timestamp: Date.now() });

        return NextResponse.json({ success: true, data: response });
    } catch (error) {
        console.error("Stock API Error:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("Not Found") || errorMessage.includes("no results")) {
            return NextResponse.json(
                { error: "Stock ticker not found. Please check the ticker symbol." },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: `Failed to fetch stock data: ${errorMessage}` },
            { status: 500 }
        );
    }
}
