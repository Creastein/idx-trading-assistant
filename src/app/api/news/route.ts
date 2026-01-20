import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import Groq from "groq-sdk";

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
        let newsItems: any[] = [];
        try {
            // Yahoo Finance2 search usually returns news
            const result: any = await yahooFinance.search(ticker, { newsCount: 5 });
            newsItems = result.news || [];
        } catch (err) {
            console.error("Yahoo News fetch failed:", err);
            // Fallback or empty (client will handle empty state)
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

        const headlinesText = newsItems.map((n: any) => `- ${n.title} (${n.publisher})`).join("\n");

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
            model: "llama-3.3-70b-versatile",
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
            news: newsItems.map((n: any) => ({
                title: n.title,
                publisher: n.publisher,
                link: n.link,
                providerPublishTime: n.providerPublishTime
            }))
        });

    } catch (error: any) {
        console.error("News API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
