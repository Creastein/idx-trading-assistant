import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();
import Groq from "groq-sdk";
import { YAHOO_FINANCE, AI_MODELS } from "@/shared/constants";

// Yahoo Finance Types
interface YahooNewsItem {
    title: string;
    publisher: string;
    link: string;
    providerPublishTime?: number | Date;
}
// ... (skip down to mapping)


interface YahooSearchResult {
    news?: YahooNewsItem[];
}

// Initialize Groq
const getGroqClient = () => {
    if (!process.env.GROQ_API_KEY) return null;
    return new Groq({
        apiKey: process.env.GROQ_API_KEY,
    });
};

export async function POST(request: NextRequest) {
    try {
        const { ticker } = await request.json();

        if (!ticker) {
            return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
        }

        // 1. Fetch News from Yahoo Finance
        let newsItems: YahooNewsItem[] = [];
        try {
            const result = await yahooFinance.search(ticker, { newsCount: YAHOO_FINANCE.NEWS_COUNT }) as YahooSearchResult;
            newsItems = result.news || [];
        } catch (err) {
            console.error("Yahoo News fetch failed:", err);
        }

        if (newsItems.length === 0) {
            return NextResponse.json({
                sentiment: 50,
                summary: "No recent news found to analyze sentiment.",
                news: []
            });
        }

        // 2. Analyze with AI (Groq/Llama 3)
        const groq = getGroqClient();
        if (!groq) {
            return NextResponse.json({ error: "GROQ_API_KEY missing" }, { status: 500 });
        }

        const headlinesText = newsItems.map((n) => `- ${n.title} (${n.publisher})`).join("\n");

        const systemPrompt = `You are an expert Stock Sentiment Analyst for Swing Trading.
Your job is to read news headlines and determine the market sentiment score (0-100) and provide a strategic summary.

SCORING:
0-30: Bearish/Negative (Bad news, panic, downtrend risks)
31-49: Slightly Bearish
50: Neutral/Mixed
51-69: Slightly Bullish
70-100: Bullish/Positive (Good earnings, growth, partnership)

SWING STRATEGY:
Focus on news that affects trend continuity over a few days to weeks. Ignore intraday noise.

OUTPUT FORMAT:
Return ONLY a valid JSON object:
{
  "score": number, // 0-100
  "summary": "string" // Short, actionable summary (max 2 sentences)
}`;

        const userPrompt = `Analyze the sentiment for ticker ${ticker} based on these news headlines:\n\n${headlinesText}`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: AI_MODELS.GROQ,
            temperature: 0.5,
            response_format: { type: "json_object" }
        });

        const aiResultRaw = completion.choices[0]?.message?.content || "{}";
        let aiResult = { score: 50, summary: "Analysis failed to parse." };

        try {
            aiResult = JSON.parse(aiResultRaw);
        } catch (e) {
            console.error("Failed to parse AI JSON:", e);
        }

        return NextResponse.json({
            sentiment: aiResult.score,
            summary: aiResult.summary,
            news: newsItems.map((n) => ({
                title: n.title,
                publisher: n.publisher,
                link: n.link,
                providerPublishTime: n.providerPublishTime
            }))
        });

    } catch (error: unknown) {
        console.error("News API Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
