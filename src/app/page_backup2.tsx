"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import MainChartPanel from "@/frontend/components/MainChartPanel";
import { TechnicalIndicatorsPanel } from "@/frontend/components/TechnicalIndicatorsPanel";
import { TradingSignalsPanel } from "@/frontend/components/TradingSignalsPanel";
import MultiTimeframePanel from "@/frontend/components/MultiTimeframePanel";
import ModeSelectionScreen from "@/frontend/components/ModeSelectionScreen";
import ScalpingCalculator from "@/frontend/components/ScalpingCalculator";
import NewsSentimentPanel from "@/frontend/components/NewsSentimentPanel";
import AIVisionPanel from "@/frontend/components/AIVisionPanel";
import DataFreshnessIndicator from "@/frontend/components/DataFreshnessIndicator";
import DelayDisclaimerBanner from "@/frontend/components/DelayDisclaimerBanner";
import { StockData, TradingMode, EnhancedStockData } from "@/shared/types";
import type { MultiTimeframeAnalysis } from "@/backend/analysis/multiTimeframe";
import { SettingsDialog } from "@/frontend/components/SettingsDialog";
import { StockSearch } from "@/frontend/components/StockSearch";
import { REFRESH_INTERVAL } from "@/shared/constants";
import { ScalpingScreener } from "@/frontend/components/ScalpingScreener";

export default function Home() {
    const [tradingMode, setTradingMode] = useState<TradingMode | null>(null);
    const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
    const [stockData, setStockData] = useState<StockData | null>(null);
    const [enhancedData, setEnhancedData] = useState<EnhancedStockData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mtfAnalysis, setMtfAnalysis] = useState<MultiTimeframeAnalysis | null>(null);
    const [isLoadingMTF, setIsLoadingMTF] = useState(false);
    const [mtfLastUpdated, setMtfLastUpdated] = useState<number | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

    type Tab = 'analysis' | 'keystats' | 'tools' | 'news';
    const [activeTab, setActiveTab] = useState<Tab>('analysis');

    const loadStock = async (symbol: string, silent = false) => {
        if (!symbol.trim() || !tradingMode) return;

        if (!silent) {
            setIsLoading(true);
            setError(null);
            setStockData(null);
            setEnhancedData(null);
            setActiveSymbol(null);
        } else {
            setIsRefreshing(true);
        }

        try {
            const mode = tradingMode === "SCALPING" ? "scalping" : "swing";
            const response = await fetch("/api/stock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticker: symbol.trim(), mode }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error((result.error || "Failed to fetch stock data") + (result.details ? `: ${result.details}` : ""));
            }

            const enhancedResponse = result.data as EnhancedStockData;

            setStockData({
                symbol: enhancedResponse.symbol,
                name: enhancedResponse.name,
                price: enhancedResponse.quote.price,
                currency: "IDR",
                change: enhancedResponse.quote.change,
                changePercent: enhancedResponse.quote.changePercent,
                volume: enhancedResponse.quote.volume,
                marketCap: enhancedResponse.quote.marketCap || undefined,
                pe: enhancedResponse.quote.pe || undefined,
                pb: enhancedResponse.quote.pb || undefined,
                previousClose: enhancedResponse.quote.previousClose,
                dayHigh: enhancedResponse.quote.dayHigh,
                dayLow: enhancedResponse.quote.dayLow,
            });

            setEnhancedData(enhancedResponse);
            const timestamp = enhancedResponse.lastUpdated || Date.now();
            setLastUpdated(timestamp);
            setActiveSymbol(symbol.trim().toUpperCase());

            if (!silent) {
                toast.success(`Data ${symbol.toUpperCase()} berhasil dimuat!`, {
                    description: `Harga: Rp ${enhancedResponse.quote.price?.toLocaleString("id-ID") || "N/A"}`,
                });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
            setError(message);

            if (!silent) {
                if (message.includes("not found") || message.includes("Not Found")) {
                    toast.error("Simbol saham tidak ditemukan", {
                        description: "Periksa kembali kode ticker yang Anda masukkan.",
                    });
                } else {
                    toast.error("Gagal memuat data saham", {
                        description: message,
                    });
                }
            }

            console.error("Stock fetch error:", err);
        } finally {
            if (!silent) {
                setIsLoading(false);
            } else {
                setIsRefreshing(false);
            }
        }
    };

    const fetchMTFAnalysis = useCallback(async (symbol: string, mode: "SCALPING" | "SWING") => {
        if (!symbol) return;

        setIsLoadingMTF(true);
        try {
            const response = await fetch("/api/analyze/multi-timeframe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol: symbol, mode: mode }),
            });
            const result = await response.json();

            if (response.ok) {
                setMtfAnalysis(result);
                setMtfLastUpdated(Date.now());
                toast.success(`Analisis Multi-Timeframe Selesai`, {
                    description: `Konfluensi: ${result.confluence.direction} (${result.confluence.strength}%)`,
                });
            } else {
                throw new Error(result.error || "Failed to fetch MTF analysis");
            }
        } catch (err) {
            console.error('[MTF] Failed to fetch analysis:', err);
            toast.error("Gagal memuat analisis Multi-Timeframe", {
                description: err instanceof Error ? err.message : "Terjadi kesalahan sistem"
            });
        } finally {
            setIsLoadingMTF(false);
        }
    }, []);

    const handleRefreshAnalysis = async () => {
        if (!activeSymbol || !tradingMode) return;
        const promises = [loadStock(activeSymbol)];
        if (tradingMode !== 'BPJS') {
            promises.push(fetchMTFAnalysis(activeSymbol, tradingMode));
        }
        toast.info("Menyegarkan data...");
        await Promise.all(promises);
    };

    useEffect(() => {
        if (enhancedData && activeSymbol && tradingMode && tradingMode !== 'BPJS') {
            fetchMTFAnalysis(activeSymbol, tradingMode);
        }
    }, [enhancedData, activeSymbol, tradingMode, fetchMTFAnalysis]);

    useEffect(() => {
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }

        if (!activeSymbol || !tradingMode) return;

        const interval = tradingMode === "SCALPING"
            ? REFRESH_INTERVAL.SCALPING
            : tradingMode === "SWING"
                ? REFRESH_INTERVAL.SWING
                : 0;

        if (interval === 0) return;

        refreshTimerRef.current = setInterval(() => {
            loadStock(activeSymbol, true);
        }, interval);

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
        };
    }, [activeSymbol, tradingMode]);

    const handleManualRefresh = () => {
        if (activeSymbol) {
            loadStock(activeSymbol, true);
        }
    };

    // ============================================================================
    // RENDER
    // ============================================================================

    if (!tradingMode) {
        return <ModeSelectionScreen onSelectMode={setTradingMode} />;
    }

    if (tradingMode === 'SCALPING' && !activeSymbol) {
        return (
            <main className="min-h-screen bg-terminal-bg p-6">
                <div className="max-w-6xl mx-auto flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setTradingMode(null)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ← Change Mode
                        </button>
                        <h1 className="text-2xl font-bold font-mono text-profit">⚡ SCALPING MODE</h1>
                    </div>
                    <div className="w-64">
                        <StockSearch onSelect={loadStock} isLoading={isLoading} />
                    </div>
                </div>
                <ScalpingScreener onSelectStock={loadStock} />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-terminal-bg flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
                <div className="container flex h-14 max-w-screen-2xl items-center gap-4 px-4">
                    <button
                        onClick={() => setTradingMode(null)}
                        className="mr-2 flex items-center space-x-2 transition-opacity hover:opacity-80"
                    >
                        <span className="hidden font-bold sm:inline-block">IDX TERMINAL</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                            {tradingMode}
                        </span>
                    </button>

                    {tradingMode === 'SCALPING' && (
                        <button
                            onClick={() => setActiveSymbol(null)}
                            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-profit transition-colors border-r border-border pr-4 mr-2"
                        >
                            ← Screener
                        </button>
                    )}

                    <div className="flex-1 flex justify-center">
                        <StockSearch onSelect={loadStock} isLoading={isLoading} initialValue={activeSymbol || ""} />
                    </div>

                    <div className="flex items-center gap-2">
                        <SettingsDialog />
                    </div>
                </div>
            </header>

            {/* Stock Info Header */}
            {stockData && (
                <div className="border-b border-border/40 bg-card/10 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{stockData.symbol}</h1>
                            <p className="text-sm text-muted-foreground mt-1">{stockData.name}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-mono font-bold">
                                {stockData.price?.toLocaleString("id-ID")}
                            </div>
                            <div className={`text-base font-mono ${(stockData.change || 0) >= 0 ? "text-profit" : "text-loss"}`}>
                                {(stockData.change || 0) >= 0 ? "+" : ""}{(stockData.changePercent || 0).toFixed(2)}%
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chart Section */}
            {activeSymbol && (
                <div className="border-b border-border/40 bg-background">
                    <div className="w-full h-[500px]">
                        <MainChartPanel symbol={activeSymbol} tradingMode={tradingMode} />
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="border-b border-border/40 bg-background/50 px-6 py-3">
                <div className="max-w-7xl mx-auto flex justify-center">
                    <div className="inline-flex items-center p-1.5 rounded-full bg-secondary/30 border border-white/5">
                        {(['analysis', 'keystats', 'tools', 'news'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === tab
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tab === 'analysis' && 'Analysis'}
                                {tab === 'keystats' && 'Key Stats'}
                                {tab === 'tools' && 'Tools'}
                                {tab === 'news' && 'News'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto bg-terminal-bg">
                <div className="max-w-7xl mx-auto p-6">

                    {activeTab === 'analysis' && (
                        <div className="space-y-8">
                            {activeSymbol && lastUpdated && (
                                <DataFreshnessIndicator
                                    lastUpdated={lastUpdated}
                                    tradingMode={tradingMode}
                                    isRefreshing={isRefreshing}
                                    onRefresh={handleManualRefresh}
                                />
                            )}

                            <DelayDisclaimerBanner />

                            <TechnicalIndicatorsPanel
                                indicators={enhancedData?.indicators || null}
                                currentPrice={enhancedData?.quote.price || 0}
                                error={error}
                                isLoading={isLoading}
                            />

                            {enhancedData && tradingMode === 'SCALPING' && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">⚡ Scalping Signals</h3>
                                    <TradingSignalsPanel
                                        signals={enhancedData.signals}
                                        recommendation={enhancedData.recommendation}
                                        isLoading={isLoading}
                                    />
                                </div>
                            )}

                            {(mtfAnalysis || isLoadingMTF) && tradingMode === 'SWING' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">⏱️ Multi-Timeframe</h3>
                                        <button
                                            onClick={handleRefreshAnalysis}
                                            disabled={isLoadingMTF}
                                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/20 hover:bg-secondary/40 disabled:opacity-50"
                                        >
                                            {isLoadingMTF ? 'Scanning...' : 'Refresh'}
                                        </button>
                                    </div>
                                    {isLoadingMTF ? (
                                        <div className="p-12 text-center">
                                            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                                            <p className="text-gray-400 font-mono text-sm">Analyzing...</p>
                                        </div>
                                    ) : (
                                        <MultiTimeframePanel analysis={mtfAnalysis} />
                                    )}
                                </div>
                            )}

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">👁️ AI Vision Analysis</h3>
                                <AIVisionPanel />
                            </div>
                        </div>
                    )}

                    {activeTab === 'keystats' && (
                        <div>
                            {stockData ? (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">📊 Fundamental Analysis</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="p-3 bg-secondary/30 rounded-lg">
                                            <p className="text-[10px] text-muted-foreground font-mono uppercase">Market Cap</p>
                                            <p className="font-mono text-sm font-medium">{stockData.marketCap ? (stockData.marketCap / 1e12).toFixed(2) + "T" : "N/A"}</p>
                                        </div>
                                        <div className="p-3 bg-secondary/30 rounded-lg">
                                            <p className="text-[10px] text-muted-foreground font-mono uppercase">Volume</p>
                                            <p className="font-mono text-sm font-medium">{stockData.volume?.toLocaleString()}</p>
                                        </div>
                                        <div className="p-3 bg-secondary/30 rounded-lg">
                                            <p className="text-[10px] text-muted-foreground font-mono uppercase">P/E Ratio</p>
                                            <p className="font-mono text-sm font-medium">{stockData.pe?.toFixed(2) || "N/A"}</p>
                                        </div>
                                        <div className="p-3 bg-secondary/30 rounded-lg">
                                            <p className="text-[10px] text-muted-foreground font-mono uppercase">P/B Ratio</p>
                                            <p className="font-mono text-sm font-medium">{stockData.pb?.toFixed(2) || "N/A"}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground">Select a stock to view statistics</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'tools' && (
                        <div>
                            {tradingMode === 'SCALPING' && stockData && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">💰 Scalping Calculator</h3>
                                    <ScalpingCalculator currentPrice={stockData.price} />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'news' && (
                        <div>
                            {activeSymbol ? (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">📰 News Sentiment</h3>
                                    <NewsSentimentPanel ticker={activeSymbol} />
                                </div>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground">Select a stock to view news</div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </main>
    );
}
