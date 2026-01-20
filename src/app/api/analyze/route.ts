import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

// Initialize Gemini (for Image Analysis)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Initialize Groq (for Text/Fundamental Analysis)
// We initialize lazily or handle missing key in the handler to avoid startup crashes if key is missing
const getGroqClient = () => {
    if (!process.env.GROQ_API_KEY) return null;
    return new Groq({
        apiKey: process.env.GROQ_API_KEY,
    });
};

interface AnalyzeRequest {
    type: "text" | "image";
    data: unknown;
    prompt?: string;
    mode?: "SCALPING" | "SWING";
}

interface StockData {
    symbol: string;
    name: string;
    price: number;
    currency: string;
    change: number;
    changePercent: number;
    pe?: number;
    pb?: number;
    marketCap?: number;
    volume?: number;
    dayHigh?: number;
    dayLow?: number;
}

const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 2000
): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        // Check for 429 (Too Many Requests) or 503 (Service Unavailable)
        const isQuotaError = error.message?.includes("429") || error.message?.includes("quota") || error.status === 429;
        const isServerBusy = error.message?.includes("503") || error.status === 503;

        if (retries > 0 && (isQuotaError || isServerBusy)) {
            console.warn(`API Limit hit. Retrying in ${delay}ms... (${retries} attempts left)`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return retryWithBackoff(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};

export async function POST(request: NextRequest) {
    try {
        const { type, data, prompt: userPrompt, mode }: AnalyzeRequest = await request.json();

        if (!type || !data) {
            return NextResponse.json(
                { error: "Type and data are required" },
                { status: 400 }
            );
        }

        const tradingMode = mode || "SWING"; // Default to SWING

        // --- HYBRID AI STRATEGY ---

        // 1. TEXT ANALYSIS -> GROQ (Llama-3.3-70b-versatile)
        if (type === "text") {
            const groq = getGroqClient();
            if (!groq) {
                return NextResponse.json(
                    { error: "GROQ_API_KEY is not configured." },
                    { status: 500 }
                );
            }

            const stockData = data as StockData;

            // Construct the detailed data prompt
            const analysisPrompt = `Analyze this IDX stock data for a ${tradingMode} STRATEGY:

Stock: ${stockData.symbol} (${stockData.name})
Current Price: ${stockData.currency} ${stockData.price?.toLocaleString()}
Change: ${stockData.change >= 0 ? "+" : ""}${stockData.change?.toLocaleString()} (${stockData.changePercent?.toFixed(2)}%)
Day Range: ${stockData.dayLow?.toLocaleString()} - ${stockData.dayHigh?.toLocaleString()}
Volume: ${stockData.volume?.toLocaleString()}
Market Cap: ${stockData.marketCap ? (stockData.marketCap / 1e12).toFixed(2) + "T IDR" : "N/A"}
P/E Ratio: ${stockData.pe?.toFixed(2) || "N/A"}
P/B Ratio: ${stockData.pb?.toFixed(2) || "N/A"}

${userPrompt ? `Additional context: ${userPrompt}` : ""}

Provide your expert analysis in exactly 3 bullet points, followed by a specific recommendation for ${tradingMode}.`;

            // Dynamic System Persona
            const systemContent = tradingMode === 'SCALPING'
                ? "You are an Aggressive Scalper. Focus entirely on Volatility, Volume, and Day Range. Ignore long-term fundamentals like P/E. If volume is low, say it's bad for scalping. Keep it fast and punchy."
                : "You are a Structural Swing Trader. Analyze the provided financial data with a focus on Trend Continuity, Valuations (PER/PBV), and Market Cap suitability. Keep it concise.";

            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: systemContent
                    },
                    {
                        role: "user",
                        content: analysisPrompt
                    }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                max_tokens: 1024,
            });

            return NextResponse.json({
                success: true,
                analysis: completion.choices[0]?.message?.content || "No analysis generated.",
                type: "text",
            });
        }

        // 2. IMAGE ANALYSIS -> GEMINI (Google Generative AI)
        else if (type === "image") {
            if (!process.env.GEMINI_API_KEY) {
                return NextResponse.json(
                    { error: "GEMINI_API_KEY is not configured." },
                    { status: 500 }
                );
            }

            // Use gemini-flash-latest (Stable 1.5 Flash aliased) which is available in your key
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

            const base64Image = data as string;
            const imageData = base64Image.replace(/^data:image\/\w+;base64,/, "");

            const modeInstruction = tradingMode === 'SCALPING'
                ? "SCALPING MODE: Focus on short-term candles (1m-5m charts). Look for immediate breakouts, impulsive moves, and failing structures. Suggest tight Stop Losses."
                : "SWING MODE: Focus on daily/weekly structure. Look for trend continuation, harmonic patterns, and major support/resistance flipping. Suggest wider stops and trailing targets.";

            const systemInstruction = `You are an expert Technical Analyst specializing in IDX stocks.
CURRENT STRATEGY: ${tradingMode}

${modeInstruction}

ANALYSIS FOCUS:
- Identify chart patterns relevant to the strategy
- Mark key Support and Resistance levels
- Detect signals (Bullish/Bearish)
- Analyze volume activity if visible

FORMAT:
- Use clear sections: Observations, Levels, Signal
- Use emoji indicators (🟢, 🔴, 🟡)
- Keep it concise`;

            const analysisPrompt = userPrompt
                ? `Analyze this chart for ${tradingMode}. User hint: ${userPrompt}`
                : `Analyze this chart for potential ${tradingMode} opportunities.`;

            // Wrap the generation with retry logic
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

    } catch (error: any) {
        console.error("AI API Error:", error);

        const isQuotaError = error.message?.includes("429") || error.message?.includes("quota") || error.status === 429;

        if (isQuotaError) {
            return NextResponse.json(
                { error: "Server is busy (Quota Exceeded). Please try again in a few moments." },
                { status: 429 } // Return explicitly as 429
            );
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: `Analysis failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}
