"use client";

import { useState, useEffect } from "react";
import { TrendingUp, RefreshCw, AlertTriangle, ArrowRight, Zap, Activity } from "lucide-react";
import { toast } from "sonner";

interface ScalpingResult {
    symbol: string;
    price: number;
    changePercent: number;
    score: number;
    signal: "BUY" | "SELL" | "HOLD";
    reason: string[];
    metrics: {
        rsi: number;
        volumeRatio: number;
        stochasticK: number;
        stochasticD: number;
        volatility: number;
    };
}

interface ScalpingScreenerProps {
    onSelectStock: (symbol: string) => void;
}

export function ScalpingScreener({ onSelectStock }: ScalpingScreenerProps) {
    const [results, setResults] = useState<ScalpingResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const fetchScanner = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/screener/scalping", { method: "POST" });
            const data = await response.json();

            if (data.success) {
                setResults(data.results);
                setLastUpdated(new Date());
            } else {
                toast.error("Scanner failed: " + data.error);
            }
        } catch (error) {
            toast.error("Network error scanning market");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Initial scan
        fetchScanner();

        // Auto-refresh interval
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(fetchScanner, 60000); // 1 minute
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const getScoreColor = (score: number) => {
        if (score >= 70) return "text-emerald-400";
        if (score >= 50) return "text-yellow-400";
        return "text-red-400";
    };

    const getSignalBadge = (signal: string) => {
        switch (signal) {
            case "BUY": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
            case "SELL": return "bg-red-500/20 text-red-400 border-red-500/50";
            default: return "bg-secondary text-muted-foreground border-border";
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card/50 backdrop-blur-sm border border-border p-6 rounded-2xl shadow-xl">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        Scalping Radar
                        <span className="text-xs font-mono font-normal bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20">
                            LIVE
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Momentum Engine: Scanning top active stocks for rapid setups.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                        <div className="text-xs text-muted-foreground">Last Scan</div>
                        <div className="text-sm font-mono">{lastUpdated ? lastUpdated.toLocaleTimeString() : "--:--:--"}</div>
                    </div>

                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`p-2 rounded-lg border transition-all ${autoRefresh ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-secondary/20 border-border text-muted-foreground hover:bg-secondary/50'}`}
                        title="Auto-Refresh (1m)"
                    >
                        <Activity className={`w-5 h-5 ${autoRefresh ? 'animate-pulse' : ''}`} />
                    </button>

                    <button
                        onClick={fetchScanner}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Scan Market
                    </button>
                </div>
            </div>

            {/* Grid Results */}
            {results.length === 0 && !isLoading ? (
                <div className="text-center py-20 bg-card/30 rounded-2xl border border-dashed border-border">
                    <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">Scanner Ready</h3>
                    <p className="text-muted-foreground">Click "Scan Market" to find opportunities.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.map((item) => (
                        <div
                            key={item.symbol}
                            onClick={() => onSelectStock(item.symbol)}
                            className="group relative bg-card hover:bg-secondary/20 border border-border hover:border-primary/50 rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg overflow-hidden"
                        >
                            {/* Score Indicator */}
                            <div className="absolute top-0 right-0 p-3">
                                <div className={`text-2xl font-black font-mono opacity-20 ${getScoreColor(item.score)}`}>
                                    {item.score}
                                </div>
                            </div>

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-xl font-bold tracking-tight">{item.symbol}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded border ${getSignalBadge(item.signal)} font-mono font-bold`}>
                                            {item.signal}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2 font-mono">
                                        <span className="text-lg">{item.price.toLocaleString()}</span>
                                        <span className={`text-xs ${item.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-secondary/30 rounded p-2 text-center">
                                    <div className="text-[10px] text-muted-foreground uppercase">RVol</div>
                                    <div className={`text-sm font-mono font-bold ${item.metrics.volumeRatio > 1.5 ? 'text-emerald-400' : ''}`}>
                                        {item.metrics.volumeRatio.toFixed(1)}x
                                    </div>
                                </div>
                                <div className="bg-secondary/30 rounded p-2 text-center">
                                    <div className="text-[10px] text-muted-foreground uppercase">RSI</div>
                                    <div className={`text-sm font-mono font-bold ${item.metrics.rsi > 70 || item.metrics.rsi < 30 ? 'text-yellow-400' : ''}`}>
                                        {item.metrics.rsi.toFixed(0)}
                                    </div>
                                </div>
                                <div className="bg-secondary/30 rounded p-2 text-center">
                                    <div className="text-[10px] text-muted-foreground uppercase">Volat</div>
                                    <div className={`text-sm font-mono font-bold ${item.metrics.volatility > 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {item.metrics.volatility.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            {/* Reasons */}
                            {item.reason.length > 0 ? (
                                <div className="space-y-1">
                                    {item.reason.slice(0, 2).map((r, i) => (
                                        <div key={i} className="text-xs flex items-center gap-1.5 text-muted-foreground">
                                            <div className="w-1 h-1 rounded-full bg-primary" />
                                            {r}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground/50 italic">No specific setup detected</div>
                            )}

                            {/* Hover Action */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
