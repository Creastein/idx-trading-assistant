"use client";

// ============================================================================
// Type Definitions (mirroring from API for frontend use)
// ============================================================================

interface IndicatorResult {
    value: number;
    interpretation: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL" | "BULLISH" | "BEARISH";
}

interface MACDResult {
    macd: number;
    signal: number;
    histogram: number;
    crossover: "BULLISH" | "BEARISH" | "NONE";
}

interface BollingerBandsResult {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    position: "ABOVE_UPPER" | "BELOW_LOWER" | "WITHIN";
}

interface VolumeAnalysisResult {
    current: number;
    average: number;
    ratio: number;
    isSpike: boolean;
    trend: "INCREASING" | "DECREASING" | "STABLE";
}

interface Indicators {
    rsi: IndicatorResult | null;
    macd: MACDResult | null;
    bollingerBands: BollingerBandsResult | null;
    ema20: number | null;
    ema50: number | null;
    sma20: number | null;
    volumeAnalysis: VolumeAnalysisResult | null; // Changed type as per instruction
}

interface TechnicalIndicatorsPanelProps {
    indicators: Indicators | null;
    currentPrice: number;
    error?: string | null;
    isLoading?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

const formatNumber = (value: number | null | undefined, decimals = 2): string => {
    if (value === null || value === undefined) return "N/A";
    return value.toLocaleString("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatVolume = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "N/A";
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toString();
};

// ============================================================================
// Sub-Components (Indicator Cards)
// ============================================================================

const IndicatorCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 transition-all hover:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
        {children}
    </div>
);

const RSICard = ({ rsi }: { rsi: IndicatorResult | null }) => {
    if (!rsi) return <IndicatorCard title="RSI (14)"><span className="text-gray-500">No data</span></IndicatorCard>;

    const value = rsi.value;
    let color = "text-yellow-500";
    let emoji = "➡️";
    let label = "Neutral";

    if (value < 30) {
        color = "text-green-500";
        emoji = "🟢";
        label = "Oversold (Buy Signal)";
    } else if (value > 70) {
        color = "text-red-500";
        emoji = "🔴";
        label = "Overbought (Sell Signal)";
    }

    return (
        <IndicatorCard title="RSI (14)">
            <div className="flex items-center justify-between">
                <span className={`text-2xl font-mono font-bold ${color}`}>{formatNumber(value, 1)}</span>
                <span className="text-xl">{emoji}</span>
            </div>
            <p className={`text-xs mt-2 ${color}`}>{label}</p>
            <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${value < 30 ? "bg-green-500" : value > 70 ? "bg-red-500" : "bg-yellow-500"}`}
                    style={{ width: `${Math.min(value, 100)}%` }}
                />
            </div>
        </IndicatorCard>
    );
};

const MACDCard = ({ macd }: { macd: MACDResult | null }) => {
    if (!macd) return <IndicatorCard title="MACD"><span className="text-gray-500">No data</span></IndicatorCard>;

    let color = "text-gray-400";
    let emoji = "➡️";
    let label = "No Crossover";

    if (macd.crossover === "BULLISH") {
        color = "text-green-500";
        emoji = "🟢";
        label = "Bullish Crossover";
    } else if (macd.crossover === "BEARISH") {
        color = "text-red-500";
        emoji = "🔴";
        label = "Bearish Crossover";
    }

    return (
        <IndicatorCard title="MACD">
            <div className="flex items-center justify-between mb-2">
                <span className={`text-lg font-mono font-bold ${color}`}>{formatNumber(macd.macd)}</span>
                <span className="text-xl">{emoji}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <span className="text-gray-500">Signal:</span>
                    <span className="ml-1 font-mono text-gray-300">{formatNumber(macd.signal)}</span>
                </div>
                <div>
                    <span className="text-gray-500">Histogram:</span>
                    <span className={`ml-1 font-mono ${macd.histogram >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {formatNumber(macd.histogram)}
                    </span>
                </div>
            </div>
            <p className={`text-xs mt-2 ${color}`}>{label}</p>
        </IndicatorCard>
    );
};

const BollingerBandsCard = ({ bb, currentPrice }: { bb: BollingerBandsResult | null; currentPrice: number }) => {
    if (!bb) return <IndicatorCard title="Bollinger Bands"><span className="text-gray-500">No data</span></IndicatorCard>;

    let positionColor = "text-yellow-500";
    let positionEmoji = "➡️";
    let positionLabel = "Within Bands";

    if (bb.position === "ABOVE_UPPER") {
        positionColor = "text-red-500";
        positionEmoji = "🔺";
        positionLabel = "Above Upper (Overbought)";
    } else if (bb.position === "BELOW_LOWER") {
        positionColor = "text-green-500";
        positionEmoji = "🔻";
        positionLabel = "Below Lower (Oversold)";
    }

    return (
        <IndicatorCard title="Bollinger Bands">
            <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold ${positionColor}`}>{positionLabel}</span>
                <span className="text-lg">{positionEmoji}</span>
            </div>
            <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                    <span className="text-red-400">Upper:</span>
                    <span className="font-mono text-gray-300">{formatNumber(bb.upper)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Middle:</span>
                    <span className="font-mono text-gray-300">{formatNumber(bb.middle)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-green-400">Lower:</span>
                    <span className="font-mono text-gray-300">{formatNumber(bb.lower)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                    <span className="text-gray-500">Price:</span>
                    <span className="font-mono font-bold text-white">{formatNumber(currentPrice)}</span>
                </div>
            </div>
        </IndicatorCard>
    );
};

const EMACard = ({ ema20, ema50, currentPrice }: { ema20: number | null; ema50: number | null; currentPrice: number }) => {
    const priceAboveEma20 = ema20 !== null && currentPrice > ema20;
    const priceAboveEma50 = ema50 !== null && currentPrice > ema50;
    const isBullish = priceAboveEma20 && priceAboveEma50;
    const isBearish = !priceAboveEma20 && !priceAboveEma50;

    let emoji = "➡️";
    let label = "Mixed Trend";
    let color = "text-yellow-500";

    if (isBullish) {
        emoji = "🟢";
        label = "Bullish (Above EMAs)";
        color = "text-green-500";
    } else if (isBearish) {
        emoji = "🔴";
        label = "Bearish (Below EMAs)";
        color = "text-red-500";
    }

    return (
        <IndicatorCard title="EMA Analysis">
            <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold ${color}`}>{label}</span>
                <span className="text-lg">{emoji}</span>
            </div>
            <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">EMA 20:</span>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-300">{formatNumber(ema20)}</span>
                        <span className={priceAboveEma20 ? "text-green-400" : "text-red-400"}>
                            {priceAboveEma20 ? "▲" : "▼"}
                        </span>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">EMA 50:</span>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-300">{formatNumber(ema50)}</span>
                        <span className={priceAboveEma50 ? "text-green-400" : "text-red-400"}>
                            {priceAboveEma50 ? "▲" : "▼"}
                        </span>
                    </div>
                </div>
            </div>
        </IndicatorCard>
    );
};

const VolumeCard = ({ volumeAnalysis }: { volumeAnalysis: VolumeAnalysisResult | null }) => {
    if (!volumeAnalysis) return <IndicatorCard title="Volume"><span className="text-gray-500">No data</span></IndicatorCard>;

    let trendEmoji = "➡️";
    let trendColor = "text-gray-400";

    if (volumeAnalysis.trend === "INCREASING") {
        trendEmoji = "📈";
        trendColor = "text-green-500";
    } else if (volumeAnalysis.trend === "DECREASING") {
        trendEmoji = "📉";
        trendColor = "text-red-500";
    }

    return (
        <IndicatorCard title="Volume">
            <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-mono font-bold text-white">{formatVolume(volumeAnalysis.current)}</span>
                {volumeAnalysis.isSpike && <span className="text-lg" title="Volume Spike!">🚀</span>}
            </div>
            <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                    <span className="text-gray-500">Average:</span>
                    <span className="font-mono text-gray-300">{formatVolume(volumeAnalysis.average)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Ratio:</span>
                    <span className={`font-mono ${volumeAnalysis.ratio > 1.5 ? "text-green-400" : "text-gray-300"}`}>
                        {formatNumber(volumeAnalysis.ratio, 2)}x
                    </span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-700 pt-1 mt-1">
                    <span className="text-gray-500">Trend:</span>
                    <span className={`font-mono flex items-center gap-1 ${trendColor}`}>
                        {trendEmoji} {volumeAnalysis.trend}
                    </span>
                </div>
            </div>
            {volumeAnalysis.isSpike && (
                <p className="text-xs text-green-400 mt-2">⚡ Volume Spike Detected!</p>
            )}
        </IndicatorCard>
    );
};

const SMACard = ({ sma20, currentPrice }: { sma20: number | null; currentPrice: number }) => {
    const priceAboveSma = sma20 !== null && currentPrice > sma20;

    return (
        <IndicatorCard title="SMA 20">
            <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-bold text-white">{formatNumber(sma20)}</span>
                <span className={`text-xl ${priceAboveSma ? "text-green-500" : "text-red-500"}`}>
                    {priceAboveSma ? "🟢" : "🔴"}
                </span>
            </div>
            <p className={`text-xs mt-2 ${priceAboveSma ? "text-green-400" : "text-red-400"}`}>
                Price is {priceAboveSma ? "above" : "below"} SMA 20
            </p>
        </IndicatorCard>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export function TechnicalIndicatorsPanel({
    indicators,
    currentPrice,
    error,
    isLoading = false
}: TechnicalIndicatorsPanelProps) {

    // Error state
    if (error) {
        return (
            <div className="w-full">
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-px flex-1 bg-gray-800"></div>
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        📊 Technical Indicators
                    </h2>
                    <div className="h-px flex-1 bg-gray-800"></div>
                </div>
                <div className="p-6 border-2 border-red-500/50 bg-red-500/10 rounded-lg">
                    <div className="flex items-start gap-3">
                        <span className="text-3xl">⚠️</span>
                        <div className="flex-1">
                            <h3 className="font-bold text-red-400 text-lg mb-2">
                                Error Loading Technical Indicators
                            </h3>
                            <p className="text-sm text-red-300 mb-3">{error}</p>
                            <div className="text-xs text-red-400/70 mb-4">
                                <p>Possible causes:</p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                    <li>Insufficient historical data for this stock</li>
                                    <li>Data provider (Yahoo Finance) temporary issue</li>
                                    <li>Stock symbol may be invalid or delisted</li>
                                </ul>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded text-sm font-medium transition-colors text-red-300"
                            >
                                🔄 Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="w-full">
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-px flex-1 bg-gray-800"></div>
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        📊 Technical Indicators
                        <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                    </h2>
                    <div className="h-px flex-1 bg-gray-800"></div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-gray-900 border border-gray-800 p-4 rounded-lg animate-pulse">
                            <div className="h-3 bg-gray-700 rounded w-20 mb-3"></div>
                            <div className="h-8 bg-gray-700 rounded w-16 mb-2"></div>
                            <div className="h-2 bg-gray-700 rounded w-24"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // No data state (different from error)
    if (!indicators) {
        return (
            <div className="w-full">
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-px flex-1 bg-gray-800"></div>
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        📊 Technical Indicators
                    </h2>
                    <div className="h-px flex-1 bg-gray-800"></div>
                </div>
                <div className="p-8 text-center border border-gray-800 rounded-lg bg-gray-900/50">
                    <span className="text-4xl mb-3 block">📈</span>
                    <p className="text-gray-400">Select a stock to view technical indicators</p>
                    <p className="text-xs text-gray-500 mt-2">Enter a ticker symbol above (e.g., BBRI, BBCA, TLKM)</p>
                </div>
            </div>
        );
    }

    // Normal render with indicators data
    return (
        <div className="w-full">
            <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-gray-800"></div>
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    📊 Technical Indicators
                </h2>
                <div className="h-px flex-1 bg-gray-800"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                <RSICard rsi={indicators.rsi} />
                <MACDCard macd={indicators.macd} />
                <BollingerBandsCard bb={indicators.bollingerBands} currentPrice={currentPrice} />
                <EMACard ema20={indicators.ema20} ema50={indicators.ema50} currentPrice={currentPrice} />
                <VolumeCard volumeAnalysis={indicators.volumeAnalysis} />
                <SMACard sma20={indicators.sma20} currentPrice={currentPrice} />
            </div>
        </div>
    );
}
