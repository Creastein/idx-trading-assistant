"use client";

import AIVisionPanel from "./AIVisionPanel";
import NewsSentimentPanel from "./NewsSentimentPanel";
import ScalpingCalculator from "./ScalpingCalculator";
import RiskManagement from "./RiskManagement";
import { StockData, TradingMode } from "@/shared/types";

interface AnalysisSidebarProps {
    ticker: string;
    stockData: StockData | null;
    onAnalyzeText: () => void;
    isAnalyzingText: boolean;
    textAnalysis: string | null;
    tradingMode: TradingMode;
    activeTab: "chart" | "fundamentals" | "news" | "vision" | "risk";
    onTabChange: (tab: "chart" | "fundamentals" | "news" | "vision" | "risk") => void;
}

export default function AnalysisSidebar({
    ticker,
    stockData,
    onAnalyzeText,
    isAnalyzingText,
    textAnalysis,
    tradingMode,
    activeTab,
    onTabChange
}: AnalysisSidebarProps) {
    return (
        <div className="flex flex-col h-full bg-card overflow-hidden">
            {/* Tabs Header - Horizontal with Close Button */}
            <div className="flex items-center justify-between gap-1 px-4 py-2 border-b border-border/50 bg-card">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onTabChange("fundamentals")}
                        className={`px-4 py-2 text-xs font-mono font-semibold transition-all rounded-lg ${activeTab === "fundamentals"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            }`}
                    >
                        {tradingMode === 'SCALPING' ? 'KALKULATOR' : 'FUNDAMENTAL'}
                    </button>
                    <button
                        onClick={() => onTabChange("risk")}
                        className={`px-4 py-2 text-xs font-mono font-semibold transition-all rounded-lg ${activeTab === "risk"
                            ? "bg-yellow-500 text-yellow-950"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            }`}
                    >
                        RISIKO
                    </button>
                    {/* News Tab - SWING MODE ONLY */}
                    {tradingMode === 'SWING' && (
                        <button
                            onClick={() => onTabChange("news")}
                            className={`px-4 py-2 text-xs font-mono font-semibold transition-all rounded-lg ${activeTab === "news"
                                ? "bg-purple-500 text-purple-50"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                }`}
                        >
                            BERITA
                        </button>
                    )}
                    <button
                        onClick={() => onTabChange("vision")}
                        className={`px-4 py-2 text-xs font-mono font-semibold transition-all rounded-lg ${activeTab === "vision"
                            ? "bg-chart-2 text-chart-2-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            }`}
                    >
                        AI
                    </button>
                </div>
                {/* Close Button */}
                <button
                    onClick={() => onTabChange("chart")}
                    className="p-1.5 hover:bg-muted/60 rounded transition-colors text-muted-foreground hover:text-foreground"
                    title="Close panel"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden relative">

                {/* Fundamentals / Calculator Tab */}
                <div className={`absolute inset-0 transition-opacity duration-300 overflow-auto ${activeTab === "fundamentals" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"}`}>
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

                {/* Risk Management Tab */}
                <div className={`absolute inset-0 transition-opacity duration-300 overflow-auto ${activeTab === "risk" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"}`}>
                    <RiskManagement />
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
