'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, Activity, DollarSign, Shield, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';

interface SwingConfluence {
    factor: string;
    score: number;
    weight: number;
    met: boolean;
    details: string;
}

interface SwingSignal {
    symbol: string;
    companyName: string;
    price: number;
    score: number;
    riskRewardRatio: number;
    confluenceFactors: SwingConfluence[];
    recommendation: {
        action: 'BUY' | 'WAIT';
        entryZone: [number, number];
        stopLoss: number;
        targets: number[];
        confidence: number;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    timestamp: string;
}

export function SwingScreener() {
    const [signals, setSignals] = useState<SwingSignal[]>([]);
    const [loading, setLoading] = useState(false);

    const runScan = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/screener/swing');
            const data = await res.json();
            if (data.success) {
                setSignals(data.data);
                toast.success(`Found ${data.count} swing setups!`);
            } else {
                toast.error('Scan failed');
            }
        } catch (e) {
            toast.error('Error running scan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 w-full max-w-7xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Expert Swing AI
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        High-Probability Setups (100-500 IDR) • 7-Factor Confluence
                    </p>
                </div>
                <button
                    onClick={runScan}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {loading ? (
                        <>
                            <Activity className="animate-spin h-4 w-4" /> Scanning Market...
                        </>
                    ) : (
                        <>
                            Start AI Scan <Activity className="h-4 w-4" />
                        </>
                    )}
                </button>
            </div>

            {signals.length === 0 && !loading && (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <Activity className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300">Ready to Scan</h3>
                    <p className="text-gray-500">Initialize the Expert AI to find high-probability swing trades.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {signals.map((signal) => (
                    <SwingCard key={signal.symbol} signal={signal} />
                ))}
            </div>
        </div>
    );
}

function SwingCard({ signal }: { signal: SwingSignal }) {
    const { recommendation, confluenceFactors } = signal;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-indigo-500/50 transition-colors group">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-2xl font-bold font-mono text-gray-900 dark:text-gray-100">{signal.symbol}</h3>
                        <span className="px-2 py-0.5 rounded text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                            Rp {signal.price}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{signal.companyName}</p>
                </div>
                <div className="text-right">
                    <div className="flex flex-col items-end">
                        <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                            {signal.score}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            AI Score
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-0">
                {/* Action Banner */}
                <div className={`
                    py-3 px-5 flex justify-between items-center
                    ${recommendation.action === 'BUY' ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300' : 'bg-yellow-50 text-yellow-700'}
                `}>
                    <div className="flex items-center gap-2">
                        {recommendation.action === 'BUY' ? <TrendingUp className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        <span className="font-bold tracking-tight">{recommendation.action} SIGNAL</span>
                    </div>
                    {recommendation.confidence >= 80 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white">High Conf.</span>
                    )}
                </div>

                {/* Strategy Grid */}
                <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700">
                    <div className="bg-white dark:bg-gray-800 p-4">
                        <span className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1 mb-1">
                            <DollarSign className="h-3 w-3" /> Entry Zone
                        </span>
                        <p className="font-mono font-medium text-sm text-gray-900 dark:text-gray-100">
                            {recommendation.entryZone[0]} - {recommendation.entryZone[1]}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4">
                        <span className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1 mb-1">
                            <Shield className="h-3 w-3" /> Stop Loss
                        </span>
                        <p className="font-mono font-medium text-sm text-red-500">
                            {recommendation.stopLoss}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4">
                        <span className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1 mb-1">
                            <TrendingUp className="h-3 w-3" /> Targets
                        </span>
                        <div className="flex gap-2">
                            {recommendation.targets.map((t, i) => (
                                <span key={i} className="font-mono font-medium text-sm text-green-600">
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4">
                        <span className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1 mb-1">
                            <BarChart2 className="h-3 w-3" /> Risk/Reward
                        </span>
                        <p className="font-mono font-medium text-sm text-gray-900 dark:text-gray-100">
                            1:{signal.riskRewardRatio}
                        </p>
                    </div>
                </div>

                {/* Confluence List */}
                <div className="p-5">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                        7-Factor Confluence
                    </h4>
                    <div className="space-y-3">
                        {confluenceFactors.map((f, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <div className={`mt-0.5 ${f.met ? 'text-green-500' : 'text-gray-300'}`}>
                                    {f.met ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className={`text-sm font-medium ${f.met ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                                            {f.factor}
                                        </p>
                                        <span className="text-[10px] text-gray-400">{f.score}%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{f.details}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
