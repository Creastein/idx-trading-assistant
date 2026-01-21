"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { executeBacktest } from "./actions";
import { BacktestResults } from "@/components/BacktestResults";
import { type BacktestResult } from "@/lib/backtesting";
import {
    Play,
    RefreshCw,
    Info,
    History,
    TrendingUp,
    AlertTriangle
} from "lucide-react";

export default function BacktestPage() {
    // Form State
    const [symbol, setSymbol] = useState("");
    const [strategy, setStrategy] = useState("RSI");
    const [period, setPeriod] = useState(30);

    // Execution State
    const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRunBacktest = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!symbol) {
            toast.error("Please enter a stock symbol");
            return;
        }

        // Auto-append .JK if missing (UX helper)
        const processedSymbol = symbol.toUpperCase().endsWith(".JK")
            ? symbol.toUpperCase()
            : symbol.includes(".") ? symbol.toUpperCase() : `${symbol.toUpperCase()}.JK`;

        setIsLoading(true);
        setBacktestResults(null);
        setError(null);

        // Display loading toast
        const loadingToast = toast.loading(`Testing ${strategy} on ${processedSymbol} (${period} days)...`);

        try {
            const result = await executeBacktest(processedSymbol, strategy, period);
            setBacktestResults(result);
            toast.success("Backtest completed successfully", { id: loadingToast });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Backtest failed";
            setError(message);
            toast.error(message, { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setBacktestResults(null);
        setSymbol("");
        setError(null);
    };

    return (
        <div className="min-h-screen bg-terminal-bg text-foreground p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="space-y-2 border-b border-white/10 pb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <History className="w-8 h-8 text-primary" />
                        Strategy Backtesting
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Test technical trading strategies on historical market data to validate performance.
                    </p>
                </header>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Left Column: Configuration Form */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-background/30 border border-border/10 rounded-xl p-6 shadow-lg backdrop-blur-sm">
                            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
                                <TrendingUp className="w-4 h-4 text-primary" /> Configuration
                            </h2>

                            <form onSubmit={handleRunBacktest} className="space-y-5">
                                {/* Symbol Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">Stock Symbol</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full bg-background/50 border border-border/20 rounded-lg px-4 py-3 text-white placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all uppercase font-mono"
                                            placeholder="e.g. BBRI, TLKM"
                                            value={symbol}
                                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Using Yahoo Finance data (JK suffix handled automatically)</p>
                                </div>

                                {/* Strategy Selector */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">Strategy</label>
                                    <select
                                        className="w-full bg-background/50 border border-border/20 rounded-lg px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none"
                                        value={strategy}
                                        onChange={(e) => setStrategy(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="RSI">RSI Reversal (30/70)</option>
                                        <option value="MACD">MACD Crossover</option>
                                        <option value="BOLLINGER">Bollinger Bounce</option>
                                        <option value="MULTI">Multi-Indicator Confluence</option>
                                    </select>
                                </div>

                                {/* Period Selector */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">Lookback Period</label>
                                    <select
                                        className="w-full bg-background/50 border border-border/20 rounded-lg px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none"
                                        value={period}
                                        onChange={(e) => setPeriod(Number(e.target.value))}
                                        disabled={isLoading}
                                    >
                                        <option value={30}>Last 30 Days (1 Month)</option>
                                        <option value={60}>Last 60 Days (2 Months)</option>
                                        <option value={90}>Last 90 Days (3 Months)</option>
                                        <option value={180}>Last 180 Days (6 Months)</option>
                                        <option value={365}>Last 365 Days (1 Year)</option>
                                    </select>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isLoading || !symbol}
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-primary/40"
                                    >
                                        {isLoading ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-5 h-5 fill-current" />
                                                Run Backtest
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Information Panel */}
                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-5 space-y-4">
                            <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                                <Info className="w-4 h-4" /> Trading Parameters
                            </h3>
                            <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                                <li>Initial Capital: <span className="text-foreground font-mono">Rp 100.000.000</span></li>
                                <li>Position Size: <span className="text-foreground font-mono">95%</span> of equity</li>
                                <li>Trading Fees: <span className="text-foreground font-mono">0.15%</span> Buy, <span className="text-foreground font-mono">0.25%</span> Sell</li>
                                <li>Stop Loss: <span className="text-foreground font-mono">2%</span> fixed</li>
                            </ul>
                        </div>

                        <div className="text-[10px] text-yellow-500/60 text-center px-4 leading-relaxed border-t border-yellow-500/10 pt-4 mt-4">
                            <strong>⚠️ IMPORTANT DISCLAIMER:</strong> Past performance backtesting results are hypothetical and do not guarantee future returns. Actual trading involves risks, slippage, and fees not fully simulated here. Use for educational purposes only.
                        </div>
                    </div>

                    {/* Right Column: Results Display */}
                    <div className="md:col-span-2">
                        {backtestResults ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                                <BacktestResults results={backtestResults} />

                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={handleClear}
                                        className="text-sm font-medium text-muted-foreground hover:text-white transition-colors"
                                    >
                                        Run Another Test
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-background/20 border border-border/10 rounded-xl border-dashed">
                                <div className="w-16 h-16 rounded-full bg-background/50 flex items-center justify-center mb-6">
                                    <BarChart2IconPlaceholder />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Ready to Backtest</h3>
                                <p className="text-muted-foreground max-w-sm mb-8">
                                    Configure your strategy parameters on the left and click "Run Backtest" to see detailed performance analysis.
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground/50 opacity-50">
                                    <div className="h-20 w-16 bg-white/10 rounded-md"></div>
                                    <div className="h-32 w-16 bg-white/10 rounded-md"></div>
                                    <div className="h-12 w-16 bg-white/10 rounded-md"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function BarChart2IconPlaceholder() {
    return (
        <svg className="w-8 h-8 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 20V10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 20V4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 20V14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
