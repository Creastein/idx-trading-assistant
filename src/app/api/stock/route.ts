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

// ============================================================================
// Cache Implementation
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, { data: Record<string, any>; timestamp: number }>();
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
            return NextResponse.json({ success: true, data: cached.data });
        }

        const symbolWithSuffix = `${normalizedSymbol}.JK`;
        console.log('[Stock API] Fetching symbol:', symbolWithSuffix);

        // Fetch quote data
        const quote = await yahooFinance.quote(symbolWithSuffix) as QuoteResult;

        if (!quote || !quote.regularMarketPrice) {
            console.error('[Stock API] Quote not found:', symbolWithSuffix);
            return NextResponse.json(
                { error: `Stock ${symbolWithSuffix} not found or no data available` },
                { status: 404 }
            );
        }

        // Fetch historical data - increased period for proper indicator calculation
        const daysBack = requestMode === "scalping" ? 30 : 90;
        const endDate = new Date();
        const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

        console.log('[Stock API] Fetching historical data:', { daysBack, startDate: startDate.toISOString(), endDate: endDate.toISOString() });

        let historicalData: HistoricalQuote[] = [];
        try {
            const chartResult = await yahooFinance.chart(symbolWithSuffix, {
                period1: startDate,
                period2: endDate,
                interval: "1d",
            }) as ChartResult;
            historicalData = chartResult.quotes;
            console.log('[Stock API] Historical data points:', historicalData.length);
        } catch (histError: unknown) {
            const histErrorMessage = histError instanceof Error ? histError.message : 'Unknown error';
            console.error('[Stock API] Historical data fetch failed:', histErrorMessage);
            // Continue with limited data instead of failing completely
        }

        // Validate we have minimum required data
        if (!historicalData || historicalData.length < 20) {
            console.error('[Stock API] Insufficient data:', historicalData?.length || 0);
            return NextResponse.json({
                error: 'Insufficient historical data',
                details: `Only ${historicalData?.length || 0} data points available. Need minimum 20.`,
                suggestion: 'This stock may have limited trading history. Try BBCA, BBRI, or TLKM.'
            }, { status: 400 });
        }

        // Extract price arrays with detailed logging for invalid values
        const closes = historicalData
            .map((q) => q.close)
            .filter((c): c is number => {
                const isValid = c !== null && c !== undefined && !isNaN(c) && c > 0;
                if (!isValid && c !== null && c !== undefined) {
                    console.warn('[Stock API] Invalid close price detected:', c);
                }
                return isValid;
            });

        const volumes = historicalData
            .map((q) => q.volume)
            .filter((v): v is number => {
                const isValid = v !== null && v !== undefined && !isNaN(v) && v >= 0;
                return isValid;
            });

        console.log(`[Stock API] Filtered ${closes.length} valid prices from ${historicalData.length} quotes`);

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
                analysis = performTechnicalAnalysis(closes, volumes);
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

        // Build response - return EnhancedStockData with all indicators
        const response = {
            symbol: normalizedSymbol,
            name: quote.longName || quote.shortName || normalizedSymbol,
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
            },
            signals,
            supportResistance,
            atr,
            recommendation,
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
