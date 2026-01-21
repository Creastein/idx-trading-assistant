"use client";

import { MultiTimeframeAnalysis } from "@/backend/analysis/multiTimeframe";

interface MultiTimeframePanelProps {
    analysis: MultiTimeframeAnalysis | null;
}

export default function MultiTimeframePanel({ analysis }: MultiTimeframePanelProps) {
    if (!analysis) {
        return (
            <div className="w-full p-8 text-center border border-gray-800 rounded-lg bg-gray-900/50">
                <span className="text-4xl mb-3 block">📊</span>
                <p className="text-gray-400">Multi-timeframe analysis not available</p>
                <p className="text-xs text-gray-500 mt-2">Select a stock to view confluence analysis</p>
            </div>
        );
    }

    const getTrendColor = (trend: string) => {
        if (trend === "BULLISH") return "bg-green-500/10 border-green-500 text-green-500";
        if (trend === "BEARISH") return "bg-red-500/10 border-red-500 text-red-500";
        return "bg-gray-500/10 border-gray-500 text-gray-400";
    };

    const getConfluenceColor = (direction: string) => {
        if (direction === "BULLISH") return "bg-green-500/20 border-green-500/50 text-green-400";
        if (direction === "BEARISH") return "bg-red-500/20 border-red-500/50 text-red-400";
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
    };

    const getActionColor = (action: string) => {
        if (action === "BUY") return "bg-green-500 text-black";
        if (action === "SELL") return "bg-red-500 text-white";
        return "bg-gray-500 text-white";
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString("id-ID", { maximumFractionDigits: 0 });
    };

    const getIntervalLabel = (interval: string) => {
        const labels: Record<string, string> = {
            "1m": "1 Min",
            "5m": "5 Min",
            "15m": "15 Min",
            "60m": "1 Hour",
            "1d": "Daily",
            "1wk": "Weekly",
            "1mo": "Monthly"
        };
        return labels[interval] || interval;
    };

    return (
        <div className="w-full space-y-4">
            {/* Title with Info */}
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    📊 Multi-Timeframe Confluence
                    <span
                        className="text-xs text-gray-500 cursor-help"
                        title="Confluence analysis combines signals from multiple timeframes to provide higher-probability trade setups. When most timeframes agree, the signal is stronger."
                    >
                        ℹ️
                    </span>
                </h2>
                <span className="text-xs text-gray-500 font-mono">{analysis.mode.toUpperCase()}</span>
            </div>

            {/* Timeframe Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {analysis.timeframes.map((tf, idx) => (
                    <div
                        key={idx}
                        className={`p-4 rounded-lg border transition-all hover:border-opacity-75 ${getTrendColor(tf.trend)}`}
                    >
                        {/* Interval Label */}
                        <div className="text-xs font-mono text-gray-400 mb-2">{getIntervalLabel(tf.interval)}</div>

                        {/* Trend Direction */}
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-lg">
                                {tf.trend === "BULLISH" ? "🟢" : tf.trend === "BEARISH" ? "🔴" : "⚪"}
                            </span>
                            <span className="text-sm font-bold">{tf.trend}</span>
                        </div>

                        {/* Strength */}
                        <div className="mb-2">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Strength</span>
                                <span className="font-mono">{tf.strength}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${tf.trend === "BULLISH" ? "bg-green-500" :
                                        tf.trend === "BEARISH" ? "bg-red-500" : "bg-gray-500"
                                        }`}
                                    style={{ width: `${tf.strength}%` }}
                                />
                            </div>
                        </div>

                        {/* Key Levels */}
                        <div className="text-[10px] text-gray-500 space-y-0.5 border-t border-gray-700 pt-2">
                            <div className="flex justify-between">
                                <span>Support:</span>
                                <span className="font-mono">{formatPrice(tf.key_levels.support)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Resistance:</span>
                                <span className="font-mono">{formatPrice(tf.key_levels.resistance)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Confluence Summary Card */}
            <div className={`p-6 rounded-lg border-2 ${getConfluenceColor(analysis.confluence.direction)}`}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">
                            Overall Direction
                        </h3>
                        <div className="flex items-center gap-3">
                            <span className="text-4xl font-bold">{analysis.confluence.direction}</span>
                            <span className="text-2xl">
                                {analysis.confluence.direction === "BULLISH" ? "🚀" :
                                    analysis.confluence.direction === "BEARISH" ? "📉" : "➡️"}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold font-mono mb-1">
                            {analysis.confluence.strength}%
                        </div>
                        <div className="text-xs text-gray-400">{analysis.confluence.agreement}</div>
                    </div>
                </div>

                {/* Visual Agreement Indicator */}
                <div className="flex gap-2">
                    {analysis.timeframes.map((tf, idx) => (
                        <div
                            key={idx}
                            className={`flex-1 h-2 rounded-full ${tf.trend === analysis.confluence.direction
                                ? analysis.confluence.direction === "BULLISH"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                : "bg-gray-700"
                                }`}
                            title={`${getIntervalLabel(tf.interval)}: ${tf.trend}`}
                        />
                    ))}
                </div>
            </div>

            {/* Recommendation Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-4">
                    Trading Recommendation
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Action and Confidence */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <button
                                className={`px-6 py-3 rounded-lg font-bold text-lg ${getActionColor(analysis.recommendation.action)}`}
                                disabled
                            >
                                {analysis.recommendation.action}
                            </button>
                            <div>
                                <div className="text-sm text-gray-400">Confidence</div>
                                <div className="text-xl font-bold font-mono">{analysis.recommendation.confidence}%</div>
                            </div>
                        </div>

                        {/* Entry Zone */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                            <div className="text-xs text-blue-400 uppercase mb-2">Entry Zone</div>
                            <div className="flex items-center gap-2 text-sm font-mono">
                                <span className="text-gray-400">{formatPrice(analysis.recommendation.entry_zone.min)}</span>
                                <span className="text-gray-600">→</span>
                                <span className="text-gray-400">{formatPrice(analysis.recommendation.entry_zone.max)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Levels */}
                    <div className="space-y-2">
                        {/* Stop Loss */}
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-red-400 uppercase">Stop Loss</span>
                                <span className="text-sm font-mono font-bold text-red-300">
                                    {formatPrice(analysis.recommendation.stop_loss)}
                                </span>
                            </div>
                        </div>

                        {/* Take Profits */}
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-1.5">
                            <div className="text-xs text-green-400 uppercase mb-2">Take Profit Levels</div>
                            {analysis.recommendation.take_profit.map((tp, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-mono">TP{idx + 1}:</span>
                                    <span className="font-mono text-green-300">{formatPrice(tp)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
