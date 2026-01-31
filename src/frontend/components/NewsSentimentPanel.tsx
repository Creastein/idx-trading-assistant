"use client";

import { useState, useEffect, useCallback } from "react";

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

// Helper function to safely format Unix timestamp to localized date
function formatNewsDate(timestamp: number | undefined): string {
    if (!timestamp || timestamp <= 0) {
        return 'Recently';
    }

    try {
        // timestamp is Unix time in seconds, convert to milliseconds
        const date = new Date(timestamp * 1000);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Recently';
        }

        // Format as Indonesian locale
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('[News] Date formatting error:', error);
        return 'Recently';
    }
}

export default function NewsSentimentPanel({ ticker }: { ticker: string }) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SentimentData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchSentiment = useCallback(async () => {
        if (!ticker) return;

        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/news", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticker }),
            });
            const result = await res.json();
            if (res.ok) {
                setData(result);
            } else {
                setError(result.error || "Failed to fetch news");
            }
        } catch (err) {
            console.error("Failed to fetch news sentiment", err);
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [ticker]);

    useEffect(() => {
        fetchSentiment();
    }, [fetchSentiment]);

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

        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 rounded-md">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-200">Market News</h3>
                        <p className="text-[10px] text-muted-foreground">Latest updates & sentiment analysis</p>
                    </div>
                </div>
                {data && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-border/20">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold">Mood:</span>
                        <span className={`text-xs font-bold ${getSentimentColor(data.sentiment)}`}>{getSentimentLabel(data.sentiment)}</span>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-auto">
                {!ticker ? (
                    <div className="text-center text-muted-foreground text-sm mt-10">
                        Select a stock to view news sentiment.
                    </div>
                ) : loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-24 bg-secondary/10 rounded-lg animate-pulse border border-border/10"></div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-loss mb-2">{error}</p>
                        <button onClick={fetchSentiment} className="text-xs underline text-muted-foreground hover:text-foreground">Try Again</button>
                    </div>
                ) : data ? (
                    <div className="space-y-6">
                        {/* AI Summary Card */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/10">
                            <div className="flex items-start gap-3">
                                <span className="text-xl">🤖</span>
                                <div>
                                    <h4 className="text-xs font-bold text-purple-400 uppercase mb-1">AI Summary</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {data.summary}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* News Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {data.news.map((item, idx) => (
                                <a
                                    key={idx}
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col p-4 rounded-xl bg-card border border-border/40 hover:border-border hover:shadow-sm transition-all group h-full"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                                            {item.publisher.substring(0, 1)}
                                        </div>
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate flex-1">
                                            {item.publisher}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {formatNewsDate(item.providerPublishTime)}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                                        {item.title}
                                    </h3>
                                </a>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground text-sm">
                        No news found.
                    </div>
                )}
            </div>
        </div>
    );
}
