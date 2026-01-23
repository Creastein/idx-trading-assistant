'use client';

import { useState } from 'react';

interface Props {
    result: {
        rank: number;
        score: any;
        aiAnalysis: any;
    };
}

export function BPJSCandidateCard({ result }: Props) {
    const [expanded, setExpanded] = useState(false);
    const { rank, score, aiAnalysis } = result;

    const getRecommendationColor = (rec: string) => {
        switch (rec) {
            case 'BUY': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
            case 'HOLD': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
            case 'AVOID': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
        }
    };

    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-green-600';
        if (s >= 70) return 'text-blue-600';
        if (s >= 60) return 'text-yellow-600';
        return 'text-gray-600';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl font-bold text-gray-400">#{rank}</span>
                            <div>
                                <h3 className="text-xl font-bold">{score.symbol}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{score.companyName}</p>
                            </div>
                        </div>
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {score.sector}
                        </span>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">BPJS Score</p>
                        <p className={`text-4xl font-bold ${getScoreColor(score.totalScore)}`}>
                            {score.totalScore}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">💰 Price</p>
                    <p className="font-semibold">Rp {score.quote.currentPrice.toLocaleString('id-ID')}</p>
                    <p className={`text-xs ${score.quote.gapPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {score.quote.gapPercent > 0 ? '+' : ''}{score.quote.gapPercent.toFixed(2)}% gap
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">📊 Volume</p>
                    <p className="font-semibold">{score.quote.volumeRatio.toFixed(1)}x avg</p>
                    <p className="text-xs text-gray-600">
                        {score.quote.volumeRatio > 1.5 ? '🔥 Strong' : '✓ Normal'}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">📈 RSI</p>
                    <p className="font-semibold">{score.breakdown.rsiPosition}/15</p>
                    <p className="text-xs text-green-600">✅ Good Zone</p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">📉 MACD</p>
                    <p className="font-semibold">{score.breakdown.macdSignal}/15</p>
                    <p className="text-xs text-gray-600">Momentum</p>
                </div>
            </div>

            {/* AI Recommendation Summary */}
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-lg font-bold border ${getRecommendationColor(aiAnalysis.recommendation)}`}>
                            🤖 {aiAnalysis.recommendation}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Confidence: {aiAnalysis.confidence}%
                        </span>
                    </div>
                </div>

                {/* Main Reasons */}
                <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Alasan Utama:
                    </p>
                    <ul className="space-y-2">
                        {aiAnalysis.reasons.slice(0, 3).map((reason: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                                <span className="text-blue-600 font-semibold flex-shrink-0">{idx + 1}.</span>
                                <span>{reason}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Strategy Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">📍 Entry</p>
                        <p className="font-semibold text-sm">
                            Rp {aiAnalysis.strategy.entryZone.min.toLocaleString('id-ID')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">🎯 Target</p>
                        <p className="font-semibold text-sm text-green-600">
                            Rp {aiAnalysis.strategy.targetProfit.price.toLocaleString('id-ID')}
                        </p>
                        <p className="text-xs text-green-600">+{aiAnalysis.strategy.targetProfit.percent.toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">🛑 Stop Loss</p>
                        <p className="font-semibold text-sm text-red-600">
                            Rp {aiAnalysis.strategy.stopLoss.price.toLocaleString('id-ID')}
                        </p>
                        <p className="text-xs text-red-600">-{aiAnalysis.strategy.stopLoss.percent.toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">⚖️ R:R</p>
                        <p className="font-semibold text-sm">1:{aiAnalysis.strategy.riskReward.toFixed(1)}</p>
                        <p className="text-xs text-green-600">✅ Good</p>
                    </div>
                </div>

                {/* Risks */}
                <div>
                    <p className="text-sm font-semibold text-red-600 mb-2">⚠️ Risiko:</p>
                    <ul className="space-y-1">
                        {aiAnalysis.risks.slice(0, 2).map((risk: string, idx: number) => (
                            <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex gap-2">
                                <span className="flex-shrink-0">•</span>
                                <span>{risk}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Expand Button */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-semibold py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                    {expanded ? '▲ Hide Details' : '▼ View Full Analysis'}
                </button>

                {/* Expanded Content */}
                {expanded && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div>
                            <p className="text-sm font-semibold mb-2">📝 Catatan Tambahan:</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {aiAnalysis.additionalNotes}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-semibold mb-2">📊 Score Breakdown:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(score.breakdown).map(([key, value]: [string, any]) => (
                                    <div key={key} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                                        <span className="text-gray-600 dark:text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                        <span className="font-semibold">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
