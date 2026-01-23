'use client';

import { useState } from 'react';
import { BPJSCandidateCard } from './BPJSCandidateCard';
import { BPJSScanProgress } from './BPJSScanProgress';
import { toast } from 'sonner';

interface ScanResult {
    rank: number;
    score: any;
    aiAnalysis: any;
}

export function BPJSScreener() {
    const [isScanning, setIsScanning] = useState(false);
    const [results, setResults] = useState<ScanResult[]>([]);
    const [scanInfo, setScanInfo] = useState({
        timestamp: '',
        duration: 0,
        stocksScanned: 0,
        candidatesFound: 0,
    });
    const [error, setError] = useState('');

    const handleScan = async () => {
        setIsScanning(true);
        setError('');

        try {
            const response = await fetch('/api/screener/bpjs/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    universeSize: 50,
                    minScore: 60,
                    maxResults: 10,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setResults(data.results);
                setScanInfo({
                    timestamp: data.timestamp,
                    duration: data.scanDuration,
                    stocksScanned: data.stocksScanned,
                    candidatesFound: data.candidatesFound,
                });

                toast.success(`Scan selesai! ${data.candidatesFound} kandidat ditemukan`, {
                    description: `Waktu scan: ${(data.scanDuration / 1000).toFixed(1)} detik`,
                });
            } else {
                setError(data.error || 'Scan gagal');
                toast.error('Scan gagal', {
                    description: data.error,
                });
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Network error';
            setError(errorMsg);
            toast.error('Error', {
                description: errorMsg,
            });
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-xl">
                <h2 className="text-2xl font-bold mb-2">🎯 BPJS SCREENER</h2>
                <p className="text-blue-100">
                    Scan saham terbaik untuk Beli Pagi Jual Sore dengan AI
                </p>
            </div>

            {/* Market Status Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Market Status</p>
                        <p className="text-lg font-semibold text-green-600">OPEN</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Waktu Saat Ini</p>
                        <p className="text-lg font-semibold">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Last Scan</p>
                        <p className="text-lg font-semibold">
                            {scanInfo.timestamp
                                ? new Date(scanInfo.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Candidates</p>
                        <p className="text-lg font-semibold">{scanInfo.candidatesFound || 0}</p>
                    </div>
                </div>

                <button
                    onClick={handleScan}
                    disabled={isScanning}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                    {isScanning ? '🔍 Scanning...' : '🔍 SCAN NOW'}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-800 dark:text-red-200">⚠️ {error}</p>
                </div>
            )}

            {/* Scanning Progress */}
            {isScanning && <BPJSScanProgress />}

            {/* Results */}
            {!isScanning && results.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">🏆 TOP {results.length} BPJS CANDIDATES</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Sorted by Score • Scan time: {(scanInfo.duration / 1000).toFixed(1)}s
                        </p>
                    </div>

                    {results.map((result) => (
                        <BPJSCandidateCard key={result.score.symbol} result={result} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isScanning && results.length === 0 && scanInfo.timestamp && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center">
                    <p className="text-4xl mb-4">😔</p>
                    <h3 className="text-xl font-bold mb-2">No Strong BPJS Candidates Today</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Market kondisi sideways/bearish. Tunggu kondisi membaik atau coba scan ulang nanti.
                    </p>
                    <button
                        onClick={handleScan}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Scan Ulang
                    </button>
                </div>
            )}
        </div>
    );
}
