import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import {
    analyzeMultipleTimeframes,
    type MultiTimeframeAnalysis,
} from "@/backend/analysis/multiTimeframe";
import {
} from "@/backend/analysis/indicators";
import { EnhancedStockData } from "@/shared/types";

// Initialize Gemini (for Image Analysis)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Initialize Groq (for Text/Fundamental Analysis)
const getGroqClient = () => {
    if (!process.env.GROQ_API_KEY) return null;
    return new Groq({
        apiKey: process.env.GROQ_API_KEY,
    });
};

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const mtfCache = new Map<string, { data: MultiTimeframeAnalysis; timestamp: number }>();

function getCachedMTF(symbol: string, mode: string): MultiTimeframeAnalysis | null {
    const key = `${symbol}-${mode}`;
    const cached = mtfCache.get(key);

    if (cached) {
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log(`[Cache] HIT for ${key}`);
            return cached.data;
        } else {
            console.log(`[Cache] EXPIRED for ${key}`);
            mtfCache.delete(key);
        }
    }
    return null;
}

function setCachedMTF(symbol: string, mode: string, data: MultiTimeframeAnalysis) {
    const key = `${symbol}-${mode}`;
    if (mtfCache.size > 100) { // Limit cache size
        const firstKey = mtfCache.keys().next().value;
        if (firstKey) mtfCache.delete(firstKey);
    }
    mtfCache.set(key, { data, timestamp: Date.now() });
    console.log(`[Cache] SET for ${key}`);
}

// ============================================================================
// Type Definitions
// ============================================================================

interface AnalyzeRequest {
    type: "text" | "image";
    data: unknown;
    prompt?: string;
    mode?: "SCALPING" | "SWING";
    symbol?: string;
}

// EnhancedStockData imported from @/shared/types

// Signal imported from @/shared/types (if needed) or use locally if not shared.
// Actually Signal is used in EnhancedStockData which is imported. 
// Let's check if Signal is exported from shared/types. Assuming yes for now or it's part of EnhancedStockData.
// If EnhancedStockData is imported, we don't need to redefine it here.


interface NewsSentiment {
    overall: string;
    score: number;
    headlines: { title: string; sentiment: string }[];
    themes: string[];
}

// ============================================================================
// System Prompts
// ============================================================================

const SCALPING_SYSTEM_PROMPT = `You are an expert IDX scalping trader with 15+ years experience. You specialize in high-probability short-term trades on the Indonesian Stock Exchange.

TRADING RULES:
- Only recommend trades with 60%+ win probability
- Maximum risk: 2% per trade
- Minimum Risk:Reward ratio: 1:2
- IDX fees: 0.15% buy, 0.25% sell (0.40% round trip)
- Consider liquidity (min 500M daily volume)

YOUR ANALYSIS MUST BE:
1. Specific with exact price levels in Rupiah
2. Based on the technical data provided (not assumptions)
3. Conservative (prefer WAIT over risky entries)
4. Include worst-case scenario planning

FORMAT YOUR RESPONSE IN CLEAR SECTIONS WITH MARKDOWN HEADERS.`;

const SWING_SYSTEM_PROMPT = `You are a fundamental + technical swing trader focused on IDX stocks. You hold positions for days to weeks, seeking 10-30% gains.

SWING TRADING PRINCIPLES:
- Combine fundamental value + technical timing
- Minimum holding period: 3 days
- Target: 10-30% gain over 2-4 weeks
- Focus on stocks with catalyst (earnings, news, sector momentum)
- Consider macro: IHSG trend, USD/IDR, interest rates

EVALUATION CRITERIA:
1. Valuation (PE, PB vs sector average)
2. Technical trend (daily + weekly alignment)
3. Catalyst presence (news, earnings, events)
4. Sector momentum
5. Risk/Reward minimum 1:3

FORMAT YOUR RESPONSE IN CLEAR SECTIONS WITH MARKDOWN HEADERS.`;

// ============================================================================
// Dynamic Prompt Generators
// ============================================================================

function formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined) return "N/A";
    return num.toLocaleString("id-ID");
}

function formatRupiah(num: number | null | undefined): string {
    if (num === null || num === undefined) return "N/A";
    return `Rp ${num.toLocaleString("id-ID")}`;
}

function createScalpingPrompt(
    symbol: string,
    data: EnhancedStockData,
    mtf: MultiTimeframeAnalysis
): string {
    const rsiValue = data.indicators.rsi?.value?.toFixed(2) || "N/A";
    const rsiSignal = data.indicators.rsi?.interpretation || "N/A";

    const macdValue = data.indicators.macd?.macd?.toFixed(2) || "N/A";
    const macdSignal = data.indicators.macd?.signal?.toFixed(2) || "N/A";
    const macdHistogram = data.indicators.macd?.histogram?.toFixed(2) || "N/A";
    const macdCrossover = data.indicators.macd?.crossover || "NONE";

    const bbUpper = data.indicators.bollingerBands?.upper;
    const bbMiddle = data.indicators.bollingerBands?.middle;
    const bbLower = data.indicators.bollingerBands?.lower;
    const bbSignal = data.indicators.bollingerBands?.position || "N/A";

    const volumeSpike = data.indicators.volumeAnalysis?.isSpike ? "⚠️ SPIKE" : "";
    const volumeRatio = data.indicators.volumeAnalysis?.ratio
        ? `(${(data.indicators.volumeAnalysis.ratio * 100).toFixed(0)}% of avg)`
        : "";

    return `
STOCK: ${symbol}
CURRENT PRICE: ${formatRupiah(data.quote.price)}
CHANGE: ${data.quote.changePercent > 0 ? "+" : ""}${data.quote.changePercent?.toFixed(2) || 0}%

=== TECHNICAL INDICATORS ===
RSI(14): ${rsiValue} - ${rsiSignal}
MACD: ${macdValue} (Signal: ${macdSignal})
  └─ Histogram: ${macdHistogram} [${macdCrossover}]
Bollinger Bands:
  └─ Upper: ${formatRupiah(bbUpper)}
  └─ Middle: ${formatRupiah(bbMiddle)}
  └─ Lower: ${formatRupiah(bbLower)}
  └─ Position: ${bbSignal}
EMA20: ${formatRupiah(data.indicators.ema20)}
EMA50: ${formatRupiah(data.indicators.ema50)}
Volume: ${formatNumber(data.quote.volume)} ${volumeSpike} ${volumeRatio}
ATR (Volatility): ${data.atr?.toFixed(2) || "N/A"}

=== MULTI-TIMEFRAME ANALYSIS ===
${mtf.timeframes.map((tf) =>
        `${tf.interval}: ${tf.trend} (${tf.strength}%) | S: ${formatRupiah(tf.key_levels.support)} | R: ${formatRupiah(tf.key_levels.resistance)}`
    ).join("\n")}

CONFLUENCE: ${mtf.confluence.direction} - ${mtf.confluence.strength}% (${mtf.confluence.agreement})

=== DETECTED SIGNALS ===
${data.signals.length > 0
            ? data.signals.map((s) => `[${s.strength}] ${s.type} - ${s.indicator}: ${s.reason}`).join("\n")
            : "No strong signals detected"}

=== SUPPORT & RESISTANCE ===
Support Levels: ${data.supportResistance.support.map((s) => formatRupiah(s)).join(", ") || "N/A"}
Resistance Levels: ${data.supportResistance.resistance.map((r) => formatRupiah(r)).join(", ") || "N/A"}

=== ALGORITHMIC RECOMMENDATION ===
Action: ${data.recommendation.action}
Confidence: ${data.recommendation.confidence}%
Reasoning: ${data.recommendation.reasoning.join(", ")}

---

TASK: Provide your expert SCALPING analysis covering:

1. **ENTRY DECISION** (BUY/SELL/WAIT):
   - Specific entry price in Rupiah
   - Entry trigger condition (e.g., "if price breaks above Rp X with volume")
   - Why this price level is optimal

2. **RISK MANAGEMENT**:
   - Stop Loss: Exact price level (below nearest support for BUY, above resistance for SELL)
   - Position Size: Based on 2% max risk
   - Maximum loss in Rupiah

3. **PROFIT TARGETS**:
   - TP1 (1-1.5%): Price & reasoning
   - TP2 (2-3%): Price & reasoning  
   - TP3 (4-5%): Price & reasoning (optional, only for very strong setups)

4. **EXECUTION PLAN**:
   - Best time to enter (consider volume patterns)
   - What to watch during the trade
   - Exit conditions (both profit and loss)

5. **CONFIDENCE SCORE** (0-100):
   - Your personal confidence in this setup
   - Key risk factors that could invalidate the trade

6. **ALTERNATIVE SCENARIO**:
   - What if price moves against you?
   - At what point do you reassess?

BE SPECIFIC WITH NUMBERS IN RUPIAH.`;
}

function createSwingPrompt(
    symbol: string,
    data: EnhancedStockData,
    mtf: MultiTimeframeAnalysis,
    news?: NewsSentiment
): string {
    const marketCapT = data.quote.marketCap ? (data.quote.marketCap / 1e12).toFixed(2) : "N/A";

    // Determine weekly trend from EMA alignment
    const weeklyTrend = data.indicators.ema50 && data.indicators.ema20
        ? (data.indicators.ema20 > data.indicators.ema50 ? "BULLISH" : "BEARISH")
        : "N/A";

    const dailyTF = mtf.timeframes.find((tf) => tf.interval === "1d");
    const dailyTrend = dailyTF?.trend || "N/A";

    const newsSection = news
        ? `
=== NEWS SENTIMENT ===
Overall Sentiment: ${news.overall} (Score: ${news.score}/100)
Recent Headlines:
${news.headlines.slice(0, 5).map((h) => `  • [${h.sentiment}] ${h.title}`).join("\n")}

Key Themes: ${news.themes.join(", ")}`
        : "";

    return `
STOCK: ${symbol}
SECTOR: ${data.quote.sector || "N/A"}
PRICE: ${formatRupiah(data.quote.price)}

=== FUNDAMENTAL DATA ===
Market Cap: Rp ${marketCapT}T
P/E Ratio: ${data.quote.pe?.toFixed(2) || "N/A"} (compare to sector avg)
P/B Ratio: ${data.quote.pb?.toFixed(2) || "N/A"}
Volume (Current): ${formatNumber(data.quote.volume)} shares

=== TECHNICAL STRUCTURE ===
Weekly Trend: ${weeklyTrend}
Daily Trend: ${dailyTrend}
Multi-TF Confluence: ${mtf.confluence.direction} (${mtf.confluence.strength}%)
Key Levels:
  └─ Resistance: ${formatRupiah(data.supportResistance.resistance[0])}
  └─ Support: ${formatRupiah(data.supportResistance.support[0])}
${newsSection}

=== TECHNICAL INDICATORS ===
RSI(14): ${data.indicators.rsi?.value?.toFixed(2) || "N/A"} - ${data.indicators.rsi?.interpretation || "N/A"}
MACD Crossover: ${data.indicators.macd?.crossover || "NONE"}
Bollinger Position: ${data.indicators.bollingerBands?.position || "N/A"}
EMA20: ${formatRupiah(data.indicators.ema20)}
EMA50: ${formatRupiah(data.indicators.ema50)}

=== MULTI-TIMEFRAME ANALYSIS ===
${mtf.timeframes.map((tf) =>
        `${tf.interval}: ${tf.trend} (${tf.strength}%)`
    ).join(" | ")}

=== ALGORITHMIC RECOMMENDATION ===
Action: ${data.recommendation.action}
Confidence: ${data.recommendation.confidence}%

---

PROVIDE SWING TRADE ANALYSIS:

1. **FUNDAMENTAL ASSESSMENT**:
   - Is the stock undervalued/fairly valued/overvalued?
   - Catalyst present? (earnings, sector rotation, policy change)
   - Competitive position in its sector

2. **TECHNICAL SETUP**:
   - Trend alignment (daily + weekly)
   - Entry zone (support level or breakout point)
   - Pattern recognition (ascending triangle, cup & handle, etc.)

3. **SWING TRADE PLAN**:
   - Entry Price: Rp X - Rp Y (range)
   - Stop Loss: Rp Z (below key support, max 8% risk)
   - Target 1 (50% position): Rp A (+10-15%)
   - Target 2 (30% position): Rp B (+20-25%)
   - Target 3 (20% position): Rp C (+30%+)
   - Expected duration: X - Y weeks

4. **RISK FACTORS**:
   - Company-specific risks
   - Sector risks
   - Macro risks (IHSG correction, currency, etc.)

5. **MONITORING PLAN**:
   - What news to watch
   - Technical levels to monitor
   - When to re-evaluate thesis

CONFIDENCE: X/100

BE SPECIFIC WITH NUMBERS IN RUPIAH.`;
}

// ============================================================================
// Retry Logic
// ============================================================================

const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 2000
): Promise<T> => {
    try {
        return await fn();
    } catch (error: unknown) {
        const errorObj = error as { message?: string; status?: number };
        const isQuotaError = errorObj.message?.includes("429") || errorObj.message?.includes("quota") || errorObj.status === 429;
        const isServerBusy = errorObj.message?.includes("503") || errorObj.status === 503;

        if (retries > 0 && (isQuotaError || isServerBusy)) {
            console.warn(`API Limit hit. Retrying in ${delay}ms... (${retries} attempts left)`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return retryWithBackoff(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};

// ============================================================================
// Main API Handler
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        const { type, data, prompt: userPrompt, mode, symbol }: AnalyzeRequest = await request.json();

        if (!type || !data) {
            return NextResponse.json(
                { error: "Type and data are required" },
                { status: 400 }
            );
        }

        const tradingMode = mode || "SWING";

        // --- TEXT ANALYSIS -> GROQ with Enhanced Prompts ---
        if (type === "text") {
            const groq = getGroqClient();
            if (!groq) {
                return NextResponse.json(
                    { error: "GROQ_API_KEY is not configured." },
                    { status: 500 }
                );
            }

            const stockData = data as EnhancedStockData;
            const stockSymbol = symbol || stockData.symbol || "UNKNOWN";

            // Fetch multi-timeframe analysis if not provided
            let mtfAnalysis: MultiTimeframeAnalysis | null = null;
            try {
                // Check cache first
                const cacheKeyMode = tradingMode === "SCALPING" ? "scalping" : "swing";
                mtfAnalysis = getCachedMTF(stockSymbol, cacheKeyMode);

                if (!mtfAnalysis) {
                    mtfAnalysis = await analyzeMultipleTimeframes(
                        stockSymbol,
                        cacheKeyMode
                    );
                    // Cache the result
                    setCachedMTF(stockSymbol, cacheKeyMode, mtfAnalysis);
                }
            } catch (error) {
                console.warn("Multi-timeframe analysis failed:", error);
                // Create minimal MTF analysis fallback
                mtfAnalysis = {
                    symbol: stockSymbol,
                    mode: tradingMode === "SCALPING" ? "scalping" : "swing",
                    timeframes: [],
                    confluence: { direction: "MIXED", strength: 0, agreement: "0/0 timeframes" },
                    recommendation: {
                        action: "WAIT",
                        confidence: 0,
                        entry_zone: { min: 0, max: 0 },
                        stop_loss: 0,
                        take_profit: [],
                    },
                    timestamp: new Date().toISOString(),
                };
            }

            // Generate the appropriate prompt
            const systemPrompt = tradingMode === "SCALPING" ? SCALPING_SYSTEM_PROMPT : SWING_SYSTEM_PROMPT;
            const analysisPrompt = tradingMode === "SCALPING"
                ? createScalpingPrompt(stockSymbol, stockData, mtfAnalysis)
                : createSwingPrompt(stockSymbol, stockData, mtfAnalysis);

            // Add user context if provided
            const finalPrompt = userPrompt
                ? `${analysisPrompt}\n\nADDITIONAL USER CONTEXT: ${userPrompt}`
                : analysisPrompt;

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: finalPrompt },
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                max_tokens: 2048,
            });

            return NextResponse.json({
                success: true,
                analysis: completion.choices[0]?.message?.content || "No analysis generated.",
                type: "text",
                mtfAnalysis: mtfAnalysis,
            });
        }

        // --- IMAGE ANALYSIS -> GEMINI ---
        else if (type === "image") {
            if (!process.env.GEMINI_API_KEY) {
                return NextResponse.json(
                    { error: "GEMINI_API_KEY is not configured." },
                    { status: 500 }
                );
            }

            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

            const base64Image = data as string;
            const imageData = base64Image.replace(/^data:image\/\w+;base64,/, "");

            const modeInstruction = tradingMode === "SCALPING"
                ? `SCALPING MODE: Focus on short-term candles (1m-5m charts). Look for immediate breakouts, impulsive moves, and failing structures. Suggest tight Stop Losses within 0.5-1% of entry.`
                : `SWING MODE: Focus on daily/weekly structure. Look for trend continuation, harmonic patterns, and major support/resistance flipping. Suggest wider stops (5-8%) and trailing targets.`;

            const systemInstruction = `You are an expert Technical Analyst specializing in IDX (Indonesian Stock Exchange) stocks.
CURRENT STRATEGY: ${tradingMode}

${modeInstruction}

ANALYSIS FOCUS:
- Identify chart patterns relevant to the strategy
- Mark key Support and Resistance levels in Rupiah
- Detect signals (Bullish/Bearish/Neutral)
- Analyze volume activity if visible
- Provide specific entry/exit price levels

FORMAT:
1. **PATTERN IDENTIFIED**: What pattern do you see?
2. **KEY LEVELS**: Support and Resistance in Rupiah
3. **SIGNAL**: 🟢 Bullish / 🔴 Bearish / 🟡 Neutral
4. **RECOMMENDATION**: Specific action with price levels
5. **RISK MANAGEMENT**: Stop loss and take profit suggestions

BE SPECIFIC WITH PRICE LEVELS IN RUPIAH.`;

            const analysisPrompt = userPrompt
                ? `Analyze this chart for ${tradingMode}. User context: ${userPrompt}`
                : `Analyze this chart for potential ${tradingMode} opportunities.`;

            const result = await retryWithBackoff(async () => {
                return await model.generateContent([
                    systemInstruction,
                    {
                        inlineData: {
                            mimeType: "image/png",
                            data: imageData,
                        },
                    },
                    analysisPrompt,
                ]);
            });

            const response = result.response;
            const analysisText = response.text();

            return NextResponse.json({
                success: true,
                analysis: analysisText,
                type: "image",
            });
        }

        return NextResponse.json(
            { error: "Invalid analysis type. Use 'text' or 'image'." },
            { status: 400 }
        );
    } catch (error: unknown) {
        console.error("AI API Error:", error);

        const errorObj = error as { message?: string; status?: number };
        const isQuotaError = errorObj.message?.includes("429") || errorObj.message?.includes("quota") || errorObj.status === 429;

        if (isQuotaError) {
            return NextResponse.json(
                { error: "Server is busy (Quota Exceeded). Please try again in a few moments." },
                { status: 429 }
            );
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: `Analysis failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}
