"use client";

import { useState, useEffect } from "react";

interface NewsItem {
    title: string;
    publisher: string;
    link: string;
    providerPublishTime?: number;
}

interface SentimentData {
    sentiment: number;
    summary: string;
    news: NewsItem[];
}

export default function NewsSentimentPanel({ ticker }: { ticker: string }) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SentimentData | null>(null);

    useEffect(() => {
        if (ticker) {
            fetchSentiment();
        }
    }, [ticker]);

    const fetchSentiment = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/news", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticker }),
            });
            const result = await res.json();
            if (res.ok) {
                setData(result);
            }
        } catch (error) {
            console.error("Failed to fetch news sentiment", error);
        } finally {
            setLoading(false);
        }
    };

    const getSentimentColor = (score: number) => {
        if (score >= 70) return "text-profit";
        if (score <= 30) return "text-loss";
        return "text-yellow-500";
    };

    const getSentimentLabel = (score: number) => {
        if (score >= 70) return "Bullish";
        if (score >= 55) return "Slightly Bullish";
        if (score <= 30) return "Bearish";
        if (score <= 45) return "Slightly Bearish";
        return "Neutral";
    };

    return (
        <div className="terminal-panel flex flex-col h-full bg-secondary/5 border-l border-border">
            <div className="terminal-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <span>News Radar</span>
                </div>
                <span className="text-xs text-purple-400 font-semibold">Groq AI</span>
            </div>

            <div className="flex-1 p-4 overflow-auto space-y-6">
                {!ticker ? (
                    <div className="text-center text-muted-foreground text-sm mt-10">
                        Select a stock to view news sentiment.
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center h-40">
                        <svg className="w-6 h-6 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : data ? (
                    <>
                        {/* Sentiment Gauge */}
                        <div className="text-center">
                            <h3 className="text-xs font-mono text-muted-foreground mb-2">MARKET MOOD</h3>
                            <div className={`text-3xl font-bold font-mono ${getSentimentColor(data.sentiment)}`}>
                                {data.sentiment}/100
                            </div>
                            <div className={`text-sm font-semibold tracking-wider uppercase ${getSentimentColor(data.sentiment)}`}>
                                {getSentimentLabel(data.sentiment)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 border-t border-dashed border-border pt-2 leading-relaxed">
                                "{data.summary}"
                            </p>
                        </div>

                        {/* News List */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Latest swing Drivers</h4>
                            {data.news.slice(0, 5).map((item, idx) => (
                                <a
                                    key={idx}
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-3 rounded-lg bg-card/50 border border-border hover:border-purple-400/50 transition-all group"
                                >
                                    <h5 className="text-xs font-medium text-foreground group-hover:text-purple-300 line-clamp-2 mb-1">
                                        {item.title}
                                    </h5>
                                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                                        <span>{item.publisher}</span>
                                        {item.providerPublishTime && (
                                            <span>{new Date(item.providerPublishTime * 1000).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </a>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center text-muted-foreground text-sm">
                        No news data available.
                    </div>
                )}
            </div>
        </div>
    );
}
