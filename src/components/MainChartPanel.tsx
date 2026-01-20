"use client";

import TradingViewChart from "@/components/TradingViewChart";
import { TradingMode } from "@/lib/types";
import { TRADINGVIEW } from "@/lib/constants";

interface MainChartPanelProps {
    symbol: string | null;
    tradingMode: TradingMode;
}

export default function MainChartPanel({ symbol, tradingMode }: MainChartPanelProps) {
    const interval = tradingMode === 'SCALPING' ? TRADINGVIEW.DEFAULT_INTERVAL.SCALPING : TRADINGVIEW.DEFAULT_INTERVAL.SWING;

    return (
        <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden shadow-sm relative group">
            {symbol ? (
                <>
                    {/* Toolbar / Header Overlay */}
                    <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border text-xs font-mono text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        <span>Chart: {symbol}</span>
                        <span className="text-border">|</span>
                        <span className={tradingMode === 'SCALPING' ? "text-profit" : "text-chart-2"}>
                            {tradingMode} ({interval === "5" ? "5m" : "Daily"})
                        </span>
                    </div>

                    <div className="flex-1 w-full" style={{ minHeight: "600px", height: "100%" }}>
                        <div className="w-full h-full relative">
                            <TradingViewChart symbol={symbol} interval={interval} />
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-secondary/5">
                    <div className="w-20 h-20 rounded-2xl bg-secondary/20 flex items-center justify-center mb-6 animate-pulse">
                        <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-medium text-foreground mb-2">Ready to Analyze</h3>
                    <p className="text-sm max-w-sm mx-auto">
                        Enter a stock ticker (e.g. <span className="text-primary font-mono">BBRI</span>) in the top bar to load the pro chart.
                    </p>
                </div>
            )}
        </div>
    );
}
