"use client";

import { useState, useEffect } from "react";
import AIVisionPanel from "./AIVisionPanel";
import NewsSentimentPanel from "./NewsSentimentPanel";
import ScalpingCalculator from "./ScalpingCalculator";
import { StockData, TradingMode } from "@/lib/types";

interface AnalysisSidebarProps {
    ticker: string;
    stockData: StockData | null;
    onAnalyzeText: () => void;
    isAnalyzingText: boolean;
    textAnalysis: string | null;
    tradingMode: TradingMode;
}

export default function AnalysisSidebar({
    ticker,
    stockData,
    onAnalyzeText,
    isAnalyzingText,
    textAnalysis,
    tradingMode
}: AnalysisSidebarProps) {
    const [activeTab, setActiveTab] = useState<"fundamentals" | "news" | "vision">("fundamentals");

    // Automatically switch default tab based on mode
    useEffect(() => {
        if (tradingMode === 'SCALPING') {
            setActiveTab("fundamentals"); // Re-using the 'fundamentals' key state but rendering Calculator content
        } else {
            setActiveTab("fundamentals");
        }
    }, [tradingMode]);

    return (
        <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            {/* Tabs Header */}
            <div className="flex items-center border-b border-border bg-muted/40">
                <button
                    onClick={() => setActiveTab("fundamentals")}
                    className={`flex-1 py-3 text-xs font-mono font-semibold transition-all border-b-2 ${activeTab === "fundamentals"
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                >
                    {tradingMode === 'SCALPING' ? 'CALCULATOR' : 'FUNDAMENTALS'}
                </button>
                <button
                    onClick={() => setActiveTab("news")}
                    className={`flex-1 py-3 text-xs font-mono font-semibold transition-all border-b-2 ${activeTab === "news"
                        ? "border-purple-500 text-purple-500 bg-purple-500/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                >
                    NEWS RADAR
                </button>
                <button
                    onClick={() => setActiveTab("vision")}
                    className={`flex-1 py-3 text-xs font-mono font-semibold transition-all border-b-2 ${activeTab === "vision"
                        ? "border-chart-2 text-chart-2 bg-chart-2/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                >
                    AI VISION
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden relative">

                {/* Fundamentals / Calculator Tab */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === "fundamentals" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"}`}>
                    {tradingMode === 'SCALPING' ? (
                        <ScalpingCalculator currentPrice={stockData?.price || 0} />
                    ) : (
                        // Swing Mode: Fundamentals Content
                        stockData ? (
                            <div className="h-full overflow-auto p-4 space-y-4">
                                {/* Key Stats Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-secondary/30 rounded-lg">
                                        <p className="text-[10px] text-muted-foreground font-mono uppercase">Market Cap</p>
                                        <p className="font-mono text-sm font-medium">{stockData.marketCap ? (stockData.marketCap / 1e12).toFixed(2) + "T" : "N/A"}</p>
                                    </div>
                                    <div className="p-3 bg-secondary/30 rounded-lg">
                                        <p className="text-[10px] text-muted-foreground font-mono uppercase">Volume</p>
                                        <p className="font-mono text-sm font-medium">{stockData.volume?.toLocaleString()}</p>
                                    </div>
                                    <div className="p-3 bg-secondary/30 rounded-lg">
                                        <p className="text-[10px] text-muted-foreground font-mono uppercase">P/E Ratio</p>
                                        <p className={`font-mono text-sm font-medium ${(stockData.pe ?? 0) > 20 ? "text-loss" : "text-profit"}`}>
                                            {stockData.pe?.toFixed(2) || "N/A"}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-secondary/30 rounded-lg">
                                        <p className="text-[10px] text-muted-foreground font-mono uppercase">P/B Ratio</p>
                                        <p className="font-mono text-sm font-medium">{stockData.pb?.toFixed(2) || "N/A"}</p>
                                    </div>
                                </div>

                                {/* AI Text Analysis Section */}
                                <div className="pt-4 border-t border-dashed border-border">
                                    <button
                                        onClick={onAnalyzeText}
                                        disabled={isAnalyzingText}
                                        className="w-full py-2 bg-secondary hover:bg-secondary/80 text-foreground font-mono text-xs rounded-lg transition-colors mb-4 flex items-center justify-center gap-2"
                                    >
                                        {isAnalyzingText ? (
                                            <>
                                                <span className="animate-spin">⟳</span> Analyzing...
                                            </>
                                        ) : (
                                            "⚡ Run AI Fundamental Analysis"
                                        )}
                                    </button>

                                    {textAnalysis && (
                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">
                                                    {textAnalysis}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                                <span className="text-4xl mb-2">📊</span>
                                <p className="text-sm">Search for a stock to view fundamentals.</p>
                            </div>
                        )
                    )}
                </div>

                {/* News Tab */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === "news" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"}`}>
                    <NewsSentimentPanel ticker={ticker} />
                </div>

                {/* Vision Tab */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === "vision" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"}`}>
                    <AIVisionPanel />
                </div>

            </div>
        </div>
    );
}
