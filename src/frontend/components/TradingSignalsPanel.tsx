"use client";

// ============================================================================
// Type Definitions
// ============================================================================

interface Signal {
    type: "BUY" | "SELL";
    indicator: string;
    reason: string;
    strength: "WEAK" | "MEDIUM" | "STRONG";
    price: number;
}

interface Recommendation {
    action: string;
    confidence: number;
    reasoning: string[];
}

interface TradingSignalsPanelProps {
    signals: Signal[];
    recommendation: Recommendation | null;
    isLoading?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
};

const getActionConfig = (action: string) => {
    const configs: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
        STRONG_BUY: { bg: "bg-green-500/20", border: "border-green-500", text: "text-green-400", emoji: "🚀" },
        BUY: { bg: "bg-green-500/10", border: "border-green-600", text: "text-green-500", emoji: "🟢" },
        HOLD: { bg: "bg-gray-500/10", border: "border-gray-600", text: "text-gray-400", emoji: "⏸️" },
        SELL: { bg: "bg-red-500/10", border: "border-red-600", text: "text-red-500", emoji: "🔴" },
        STRONG_SELL: { bg: "bg-red-500/20", border: "border-red-500", text: "text-red-400", emoji: "⛔" },
    };
    return configs[action] || configs.HOLD;
};

const getStrengthConfig = (strength: string) => {
    const configs: Record<string, { bg: string; text: string }> = {
        STRONG: { bg: "bg-purple-500/20", text: "text-purple-400" },
        MEDIUM: { bg: "bg-blue-500/20", text: "text-blue-400" },
        WEAK: { bg: "bg-gray-500/20", text: "text-gray-400" },
    };
    return configs[strength] || configs.WEAK;
};

// ============================================================================
// Sub-Components
// ============================================================================

const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-800 rounded-lg"></div>
        <div className="space-y-2">
            <div className="h-16 bg-gray-800 rounded-lg"></div>
            <div className="h-16 bg-gray-800 rounded-lg"></div>
        </div>
    </div>
);

const RecommendationCard = ({ recommendation }: { recommendation: Recommendation }) => {
    const config = getActionConfig(recommendation.action);

    return (
        <div className={`${config.bg} border ${config.border} rounded-xl p-4 md:p-5 transition-all`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{config.emoji}</span>
                    <div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rekomendasi</h3>
                        <p className={`text-xl md:text-2xl font-bold ${config.text}`}>
                            {recommendation.action.replace("_", " ")}
                        </p>
                    </div>
                </div>
                <div className="text-left md:text-right flex items-center md:block gap-4 md:gap-0 border-t md:border-t-0 border-gray-700/50 pt-2 md:pt-0 mt-2 md:mt-0">
                    <p className="text-xs text-gray-500 uppercase">Confidence</p>
                    <p className={`text-2xl md:text-3xl font-mono font-bold ${config.text}`}>
                        {recommendation.confidence}%
                    </p>
                </div>
            </div>

            {recommendation.reasoning.length > 0 && (
                <div className="border-t border-gray-700 pt-3 mt-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Alasan:</h4>
                    <ul className="space-y-1.5">
                        {recommendation.reasoning.map((reason, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                                <span className="text-gray-500 mt-0.5">•</span>
                                <span>{reason}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const SignalCard = ({ signal }: { signal: Signal }) => {
    const isPositive = signal.type === "BUY";
    const strengthConfig = getStrengthConfig(signal.strength);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {/* Type Badge */}
                    <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${isPositive
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                            }`}
                    >
                        {signal.type}
                    </span>
                    {/* Strength Badge */}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${strengthConfig.bg} ${strengthConfig.text}`}>
                        {signal.strength}
                    </span>
                </div>
                {/* Indicator Name */}
                <span className="text-xs font-mono text-gray-500">{signal.indicator}</span>
            </div>

            <p className="text-sm text-gray-300 mb-2">{signal.reason}</p>

            <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Price Level:</span>
                <span className="font-mono font-medium text-white">{formatPrice(signal.price)}</span>
            </div>
        </div>
    );
};

const EmptySignals = () => (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
        <div className="text-3xl mb-2">🔍</div>
        <p className="text-gray-400 text-sm">Tidak ada sinyal kuat yang terdeteksi</p>
        <p className="text-gray-500 text-xs mt-1">Pasar mungkin dalam kondisi sideways atau belum ada indikator yang jelas.</p>
    </div>
);

// ============================================================================
// Main Component
// ============================================================================

export function TradingSignalsPanel({ signals, recommendation, isLoading = false }: TradingSignalsPanelProps) {
    if (isLoading) {
        return (
            <div className="w-full">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                    📡 Trading Signals
                </h2>
                <LoadingSkeleton />
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    📡 Trading Signals
                </h2>
                <span className="text-[10px] text-yellow-500/80 font-medium px-2 py-1 bg-yellow-500/10 rounded border border-yellow-500/20">
                    Educational Only
                </span>
            </div>

            <div className="space-y-4">
                {/* Overall Recommendation */}
                {recommendation ? (
                    <RecommendationCard recommendation={recommendation} />
                ) : (
                    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center text-gray-500">
                        Tidak ada rekomendasi tersedia
                    </div>
                )}

                {/* Individual Signals Section */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Signal Aktif ({signals.length})
                    </h3>

                    {signals.length > 0 ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                            {signals.map((signal, index) => (
                                <SignalCard key={index} signal={signal} />
                            ))}
                        </div>
                    ) : (
                        <EmptySignals />
                    )}
                </div>
            </div>
        </div>
    );
}
