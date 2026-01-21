'use client';

import { useState, useEffect } from 'react';

export default function DisclaimerBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const hasAccepted = localStorage.getItem('disclaimer_accepted');
        if (!hasAccepted) {
            setIsVisible(true);
            setIsExpanded(true); // Show full text on first visit
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('disclaimer_accepted', 'true');
        localStorage.setItem('disclaimer_accepted_date', new Date().toISOString());
        setIsVisible(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
    };

    if (!isVisible) {
        // Small button to re-open disclaimer
        return (
            <button
                onClick={() => {
                    setIsVisible(true);
                    setIsExpanded(false);
                }}
                className="fixed bottom-4 right-4 px-3 py-2 text-xs bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 rounded-lg hover:bg-yellow-500/30 transition-colors z-40 flex items-center gap-2"
                aria-label="View disclaimer"
            >
                <span className="text-lg">⚠️</span>
                <span>Disclaimer</span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-500/10 border-t-2 border-yellow-500 backdrop-blur-md z-50 shadow-2xl">
            <div className="max-w-7xl mx-auto p-4 md:p-6">
                <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">⚠️</span>
                            <h3 className="font-bold text-yellow-200 text-xl">
                                DISCLAIMER PENTING / IMPORTANT DISCLAIMER
                            </h3>
                        </div>

                        <div className={`text-yellow-100/90 text-sm space-y-3 ${isExpanded ? '' : 'line-clamp-2'}`}>
                            <p className="font-semibold text-yellow-50">
                                <strong>⚠️ DISCLAIMER:</strong> This application provides technical analysis and AI-powered insights for <strong>educational purposes only</strong>. It is <strong>NOT</strong> financial advice.
                            </p>
                            <p className="font-semibold text-yellow-50">
                                <strong>⚠️ PENAFIAN:</strong> Aplikasi ini menyediakan analisis teknikal dan wawasan AI untuk <strong>tujuan edukasi saja</strong>. Ini <strong>BUKAN</strong> merupakan nasihat keuangan.
                            </p>

                            {isExpanded && (
                                <div className="mt-4 space-y-3 border-t border-yellow-500/30 pt-3">
                                    <div>
                                        <h4 className="text-yellow-200 font-bold text-xs uppercase mb-1">Risk Warning / Peringatan Risiko:</h4>
                                        <ul className="list-disc list-inside space-y-1 ml-1 text-xs md:text-sm">
                                            <li>Trading stocks involves a <strong>significant risk of capital loss</strong>. / Trading saham melibatkan <strong>risiko kehilangan modal yang signifikan</strong>.</li>
                                            <li>Past performance <strong>does not guarantee</strong> future results. / Performa masa lalu <strong>tidak menjamin</strong> hasil di masa depan.</li>
                                            <li>Data from Yahoo Finance may be <strong>delayed up to 15 minutes</strong> for IDX. / Data dari Yahoo Finance mungkin <strong>tertunda hingga 15 menit</strong> untuk IDX.</li>
                                            <li>Always conduct your own due diligence. / Selalu lakukan riset independen Anda sendiri.</li>
                                        </ul>
                                    </div>

                                    <div className="bg-yellow-950/30 p-3 rounded-lg border border-yellow-500/20">
                                        <p className="text-xs text-yellow-200/80">
                                            <strong>By using this app, you acknowledge that:</strong> You are solely responsible for your investment decisions. The developers and providers of IDX Trading Assistant accept <strong>no liability</strong> for any financial losses or damages incurred. Consult a <strong>licensed financial advisor</strong> for personalized advice.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-yellow-200 text-sm underline hover:text-yellow-100 mt-3 font-medium"
                        >
                            {isExpanded ? '▲ Tampilkan Lebih Sedikit' : '▼ Baca Selengkapnya'}
                        </button>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[140px]">
                        <button
                            onClick={handleAccept}
                            className="px-5 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors shadow-lg whitespace-nowrap"
                        >
                            ✓ Saya Mengerti
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="px-5 py-2 bg-gray-700 text-gray-200 text-sm rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Tutup Sementara
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
