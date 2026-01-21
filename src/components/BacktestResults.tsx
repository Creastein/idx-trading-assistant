"use client";

import React, { useMemo, useState } from "react";
import { type BacktestResult } from "@/lib/backtesting";
import {
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    Activity,
    Percent,
    AlertCircle,
    BarChart2,
    Calendar,
    DollarSign,
    ChevronDown,
    ChevronUp
} from "lucide-react";

interface BacktestResultsProps {
    results: BacktestResult;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const MetricCard = ({
    label,
    value,
    subValue,
    icon: Icon,
    trend,
    color,
    tooltip
}: {
    label: string;
    value: string | number;
    subValue?: string;
    icon: React.ElementType;
    trend?: "up" | "down" | "neutral";
    color?: "green" | "red" | "yellow" | "default";
    tooltip?: string;
}) => {
    const getColorClass = () => {
        switch (color) {
            case "green": return "text-profit";
            case "red": return "text-loss";
            case "yellow": return "text-yellow-400";
            default: return "text-foreground";
        }
    };

    return (
        <div className="bg-background/40 border border-border/10 rounded-xl p-4 flex flex-col gap-2 group hover:border-border/30 transition-all relative" title={tooltip}>
            <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
                <Icon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-end gap-2">
                <span className={`text-2xl font-mono font-bold ${getColorClass()}`}>
                    {value}
                </span>
                {subValue && (
                    <span className="text-xs text-muted-foreground mb-1 font-mono">
                        {subValue}
                    </span>
                )}
            </div>
            {trend && (
                <div className={`text-xs flex items-center gap-1 ${trend === "up" ? "text-profit" : trend === "down" ? "text-loss" : "text-muted-foreground"}`}>
                    {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trend === "up" ? "Positive" : "Negative"}
                </div>
            )}
        </div>
    );
};

export function BacktestResults({ results }: BacktestResultsProps) {
    const [showAllTrades, setShowAllTrades] = useState(false);

    // Calculate cumulative equity for chart
    const equityCurve = useMemo(() => {
        let currentEquity = 100_000_000; // Initial capital
        const dataPoints = [{ date: results.period.start, value: currentEquity }];

        // Sort trades by date
        const sortedTrades = [...results.trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Only process CLOSED trades (SELLs) which realize profit/loss
        const closedTrades = sortedTrades.filter(t => t.type === "SELL");

        closedTrades.forEach(trade => {
            // Reconstruct capital change: capital += (value - fees) - initial_cost
            // But we have `profit` in the trade object for SELLS
            if (trade.profit !== undefined) {
                currentEquity += trade.profit;
                dataPoints.push({ date: trade.date, value: currentEquity });
            }
        });

        return dataPoints;
    }, [results]);

    // Simple SVG Chart generator
    const renderChart = () => {
        if (equityCurve.length < 2) return null;

        const width = 800;
        const height = 200;
        const padding = 20;

        const minVal = Math.min(...equityCurve.map(d => d.value));
        const maxVal = Math.max(...equityCurve.map(d => d.value));
        const valRange = maxVal - minVal || 1;

        const points = equityCurve.map((d, i) => {
            const x = padding + (i / (equityCurve.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((d.value - minVal) / valRange) * (height - 2 * padding);
            return `${x},${y}`;
        }).join(" ");

        const isProfit = results.totalReturn >= 0;
        const strokeColor = isProfit ? "#22c55e" : "#ef4444"; // green-500 : red-500

        return (
            <div className="w-full h-[200px] mt-4 mb-2">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    {/* Grid lines */}
                    <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
                    <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />

                    {/* Main Line */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />

                    {/* Area fill (optional gradient effect) */}
                    <path
                        d={`M${padding},${height - padding} L${points.split(" ")[0]} ${points.split(" ").slice(1).join(" ")} L${width - padding},${height - padding} Z`}
                        fill={strokeColor}
                        fillOpacity="0.1"
                    />
                </svg>
                <div className="flex justify-between text-[10px] text-muted-foreground px-2 font-mono">
                    <span>{results.period.start}</span>
                    <span>{results.period.end}</span>
                </div>
            </div>
        );
    };

    const visibleTrades = showAllTrades ? results.trades : results.trades.slice(0, 50);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Header Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold tracking-tight text-white">Backtest Results: <span className="text-primary">{results.strategy}</span></h2>
                        {results.isViable ? (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase rounded-full border border-green-500/30">Viable</span>
                        ) : (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase rounded-full border border-red-500/30">Not Viable</span>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {results.period.start} — {results.period.end}</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Initial Cap: {formatCurrency(100_000_000)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Buy & Hold Comparison */}
                    <div className="text-right">
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">vs Buy & Hold</div>
                        <div className={`font-mono font-bold ${results.outperformsBuyHold ? 'text-profit' : 'text-loss'}`}>
                            {formatPercent(results.totalReturn - results.buyAndHoldReturn)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="Total Return"
                    value={formatPercent(results.totalReturn)}
                    subValue={formatCurrency(100_000_000 * (1 + results.totalReturn / 100) - 100_000_000)}
                    icon={TrendingUp}
                    color={results.totalReturn >= 0 ? "green" : "red"}
                    trend={results.totalReturn >= 0 ? "up" : "down"}
                    tooltip="Net profit/loss percentage over the period"
                />
                <MetricCard
                    label="Win Rate"
                    value={`${results.winRate.toFixed(1)}%`}
                    subValue={`${results.winningTrades}W - ${results.losingTrades}L`}
                    icon={Percent}
                    color={results.winRate >= 60 ? "green" : results.winRate >= 40 ? "yellow" : "red"}
                    tooltip="Percentage of profitable trades"
                />
                <MetricCard
                    label="Profit Factor"
                    value={results.profitFactor.toFixed(2)}
                    icon={BarChart2}
                    color={results.profitFactor >= 2 ? "green" : results.profitFactor >= 1.2 ? "yellow" : "red"}
                    tooltip="Gross Profit / Gross Loss. > 1.5 is ideal."
                />
                <MetricCard
                    label="Max Drawdown"
                    value={`-${results.maxDrawdown.toFixed(2)}%`}
                    icon={ArrowDownRight}
                    color={results.maxDrawdown > 20 ? "red" : results.maxDrawdown > 10 ? "yellow" : "green"}
                    tooltip="Maximum observed loss from a peak to a trough"
                />
            </div>

            {/* Secondary Metrics & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Additional Stats */}
                <div className="space-y-4">
                    <div className="bg-background/30 rounded-xl p-4 border border-border/10">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Risk Metrics</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Sharpe Ratio</span>
                                <span className={`font-mono font-bold ${results.sharpeRatio > 1.5 ? "text-profit" : results.sharpeRatio > 0 ? "text-yellow-400" : "text-loss"}`}>
                                    {results.sharpeRatio.toFixed(2)}
                                </span>
                            </div>
                            <div className="h-px bg-border/10"></div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Avg Win</span>
                                <span className="font-mono text-profit">{formatCurrency(results.averageWin)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Avg Loss</span>
                                <span className="font-mono text-loss">{formatCurrency(results.averageLoss)}</span>
                            </div>
                            <div className="h-px bg-border/10"></div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Largest Win</span>
                                <span className="font-mono text-profit">{formatCurrency(results.largestWin)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Largest Loss</span>
                                <span className="font-mono text-loss">{formatCurrency(results.largestLoss)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Equity Chart */}
                <div className="lg:col-span-2 bg-background/30 rounded-xl p-4 border border-border/10">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">Equity Curve</h3>
                    {renderChart()}
                    <div className="text-center text-xs text-muted-foreground italic mt-2">
                        *Chart shows equity growth from closed trades (approximate)
                    </div>
                </div>
            </div>

            {/* Trade Log */}
            <div className="bg-background/20 rounded-xl border border-border/10 overflow-hidden">
                <div className="p-4 border-b border-border/10 flex justify-between items-center">
                    <h3 className="font-bold text-sm">Trade Log ({results.trades.length})</h3>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <table className="w-full text-xs font-mono interactive-table">
                        <thead className="bg-background/40 sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                                <th className="p-3 text-left text-muted-foreground font-semibold">Date</th>
                                <th className="p-3 text-left text-muted-foreground font-semibold">Type</th>
                                <th className="p-3 text-right text-muted-foreground font-semibold">Price</th>
                                <th className="p-3 text-right text-muted-foreground font-semibold">Shares</th>
                                <th className="p-3 text-right text-muted-foreground font-semibold">Value</th>
                                <th className="p-3 text-right text-muted-foreground font-semibold">P/L</th>
                                <th className="p-3 text-left text-muted-foreground font-semibold pl-6">Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/5">
                            {visibleTrades.map((trade, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 text-muted-foreground">{trade.date}</td>
                                    <td className="p-3">
                                        <span className={`px-1.5 py-0.5 rounded ${trade.type === 'BUY' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                            {trade.type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">{trade.price.toLocaleString("id-ID")}</td>
                                    <td className="p-3 text-right">{trade.shares.toLocaleString("id-ID")}</td>
                                    <td className="p-3 text-right text-muted-foreground">{formatCurrency(trade.value)}</td>
                                    <td className={`p-3 text-right font-bold ${trade.profit && trade.profit > 0 ? 'text-profit' : trade.profit && trade.profit < 0 ? 'text-loss' : 'text-muted-foreground'}`}>
                                        {trade.profit ? formatCurrency(trade.profit) : "-"}
                                    </td>
                                    <td className="p-3 text-muted-foreground truncate max-w-[200px]" title={trade.reason}>
                                        {trade.reason}
                                    </td>
                                </tr>
                            ))}
                            {results.trades.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                        No trades executed during this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {results.trades.length > 50 && (
                    <div className="p-2 bg-background/30 text-center border-t border-border/10">
                        <button
                            onClick={() => setShowAllTrades(!showAllTrades)}
                            className="text-xs text-primary hover:text-primary/80 flex items-center justify-center gap-1 mx-auto"
                        >
                            {showAllTrades ? (
                                <>Show Less <ChevronUp className="w-3 h-3" /></>
                            ) : (
                                <>Show All ({results.trades.length}) <ChevronDown className="w-3 h-3" /></>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
