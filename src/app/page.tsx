"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion"; // Animation Import
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
import { AnimatedTabs } from "@/frontend/components/AnimatedTabs"; // New Import
import { AnimatedNumber, AnimatedPriceChange } from "@/frontend/components/AnimatedNumber"; // New Import
import { FinancialsPanel } from "@/frontend/components/FinancialsPanel"; // New Import
import { SwingScreener } from "@/frontend/components/SwingScreener";

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
                toast.success(`Data ${symbol.toUpperCase()} berhasil dimuat!`);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
            setError(message);

            if (!silent) {
                toast.error("Gagal memuat data saham", { description: message });
            }
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
                body: JSON.stringify({ symbol, mode }),
            });
            const result = await response.json();
            if (response.ok) {
                setMtfAnalysis(result);
                setMtfLastUpdated(Date.now());
            }
        } catch (err) {
            console.error('[MTF] Failed:', err);
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
        const interval = tradingMode === "SCALPING" ? REFRESH_INTERVAL.SCALPING : tradingMode === "SWING" ? REFRESH_INTERVAL.SWING : 0;
        if (interval === 0) return;
        refreshTimerRef.current = setInterval(() => loadStock(activeSymbol, true), interval);
        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
        };
    }, [activeSymbol, tradingMode]);

    const handleManualRefresh = () => {
        if (activeSymbol) loadStock(activeSymbol, true);
    };

    if (!tradingMode) {
        return <ModeSelectionScreen onSelectMode={setTradingMode} />;
    }



    if (tradingMode === 'SCALPING' && !activeSymbol) {
        return (
            <main className="min-h-screen bg-terminal-bg p-6">
                <div className="max-w-6xl mx-auto flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setTradingMode(null)} className="text-muted-foreground hover:text-foreground">
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

    if (tradingMode === 'SWING' && !activeSymbol) {
        return (
            <main className="min-h-screen bg-terminal-bg p-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setTradingMode(null)} className="text-muted-foreground hover:text-foreground">
                            ← Change Mode
                        </button>
                        <h1 className="text-2xl font-bold font-mono text-indigo-400">🌊 SWING MODE</h1>
                    </div>
                    <div className="w-64">
                        <StockSearch onSelect={loadStock} isLoading={isLoading} />
                    </div>
                </div>
                <SwingScreener />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-terminal-bg flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur">
                <div className="container flex h-14 max-w-screen-2xl items-center gap-4 px-6">
                    {/* Navigation Area */}
                    <div className="flex items-center gap-3 mr-4">
                        {/* 1. Home / Mode Switch */}
                        <button
                            onClick={() => setTradingMode(null)}
                            className="p-2 -ml-2 rounded-md hover:bg-secondary/20 text-muted-foreground hover:text-foreground transition-all"
                            title="Back to Mode Selection"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        </button>

                        <div className="h-4 w-px bg-border/40 mx-1" />

                        {/* 2. Brand */}
                        <span className="font-bold tracking-tight hidden sm:block">IDX TERMINAL</span>

                        {/* 3. Current Mode Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tradingMode === 'SCALPING'
                            ? 'bg-profit/10 text-profit border border-profit/20'
                            : 'bg-chart-2/10 text-chart-2 border border-chart-2/20'
                            }`}>
                            {tradingMode}
                        </span>
                    </div>

                    {/* Back to Screener (Contextual) */}
                    {tradingMode === 'SCALPING' && (
                        <button
                            onClick={() => setActiveSymbol(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary/10 hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-all border border-transparent hover:border-border/40 mr-4"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                            Screener
                        </button>
                    )}

                    <div className="flex-1 flex justify-center">
                        <StockSearch onSelect={loadStock} isLoading={isLoading} initialValue={activeSymbol || ""} />
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Stock Info - Compact in Header */}
                        {activeSymbol && stockData && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 border-l border-border/40 pl-4"
                            >
                                <div className="text-right">
                                    <div className="flex items-center gap-1.5 justify-end">
                                        <span className="text-sm font-bold">{stockData.symbol}</span>
                                        <span className="text-[10px] text-muted-foreground">•</span>
                                        <AnimatedNumber
                                            value={stockData.price || 0}
                                            className="text-xs font-mono font-bold"
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <AnimatedPriceChange
                                            value={stockData.change || 0}
                                            percent={stockData.changePercent || 0}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <SettingsDialog />
                    </div>
                </div>
            </header>

            {/* Chart - Maximized Height */}
            {activeSymbol && (
                <div className="border-b border-border/40 bg-background">
                    <div className="w-full h-[650px] overflow-hidden">
                        <MainChartPanel symbol={activeSymbol} tradingMode={tradingMode} />
                    </div>
                </div>
            )}

            {/* Tabs - Animated */}
            <div className="border-b border-border/40 bg-background/50 px-6 py-2.5">
                <div className="max-w-7xl mx-auto flex justify-center">
                    <AnimatedTabs
                        tabs={[
                            { id: 'analysis', label: 'Analysis' },
                            { id: 'keystats', label: 'Key Stats' },
                            { id: 'tools', label: 'Tools' },
                            { id: 'news', label: 'News' },
                        ]}
                        activeTab={activeTab}
                        onChange={(id) => setActiveTab(id as Tab)}
                        className="bg-secondary/20 p-1 rounded-lg"
                    />
                </div>
            </div>

            {/* Content - Animated Transitions */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto p-6 space-y-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'analysis' && (
                                <div className="space-y-6">
                                    {activeSymbol && lastUpdated && (
                                        <div className="bg-secondary/10 rounded-lg p-3 border border-border/20">
                                            <DataFreshnessIndicator
                                                lastUpdated={lastUpdated}
                                                tradingMode={tradingMode}
                                                isRefreshing={isRefreshing}
                                                onRefresh={handleManualRefresh}
                                            />
                                        </div>
                                    )}

                                    <DelayDisclaimerBanner />

                                    <div className="bg-card/5 rounded-lg p-5 border border-border/10">
                                        <TechnicalIndicatorsPanel
                                            indicators={enhancedData?.indicators || null}
                                            currentPrice={enhancedData?.quote.price || 0}
                                            error={error}
                                            isLoading={isLoading}
                                        />
                                    </div>

                                    {enhancedData && tradingMode === 'SCALPING' && (
                                        <div className="bg-card/5 rounded-lg p-5 border border-border/10">
                                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <span>⚡</span> Scalping Signals
                                            </h3>
                                            <TradingSignalsPanel
                                                signals={enhancedData.signals}
                                                recommendation={enhancedData.recommendation}
                                                isLoading={isLoading}
                                            />
                                        </div>
                                    )}

                                    {(mtfAnalysis || isLoadingMTF) && tradingMode === 'SWING' && (
                                        <div className="bg-card/5 rounded-lg p-5 border border-border/10">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                                    <span>⏱️</span> Multi-Timeframe
                                                </h3>
                                                <button
                                                    onClick={handleRefreshAnalysis}
                                                    disabled={isLoadingMTF}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/20 hover:bg-secondary/40 disabled:opacity-50 border border-border/20"
                                                >
                                                    {isLoadingMTF ? 'Scanning...' : 'Refresh'}
                                                </button>
                                            </div>
                                            {isLoadingMTF ? (
                                                <div className="p-12 text-center">
                                                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                                                    <p className="text-gray-400 text-sm">Analyzing...</p>
                                                </div>
                                            ) : (
                                                <MultiTimeframePanel analysis={mtfAnalysis} />
                                            )}
                                        </div>
                                    )}

                                    <div className="bg-card/5 rounded-lg p-5 border border-border/10">
                                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span>👁️</span> AI Vision Analysis
                                        </h3>
                                        <AIVisionPanel />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'keystats' && (
                                <div className="space-y-6">
                                    {/* Google Finance Style Financials Chart */}
                                    {enhancedData?.financials && (
                                        <div className="bg-card/5 rounded-lg p-6 border border-border/10">
                                            <FinancialsPanel financials={enhancedData.financials} />
                                        </div>
                                    )}

                                    <div className="bg-card/5 rounded-lg p-6 border border-border/10">
                                        {stockData ? (
                                            <>
                                                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">📊 Key Statistics</h3>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="p-4 bg-secondary/20 rounded-lg border border-border/10">
                                                        <p className="text-[10px] text-muted-foreground font-mono uppercase mb-2">Market Cap</p>
                                                        <p className="font-mono text-lg font-bold">{stockData.marketCap ? (stockData.marketCap / 1e12).toFixed(2) + "T" : "N/A"}</p>
                                                    </div>
                                                    <div className="p-4 bg-secondary/20 rounded-lg border border-border/10">
                                                        <p className="text-[10px] text-muted-foreground font-mono uppercase mb-2">Volume</p>
                                                        <p className="font-mono text-lg font-bold">{stockData.volume?.toLocaleString()}</p>
                                                    </div>
                                                    <div className="p-4 bg-secondary/20 rounded-lg border border-border/10">
                                                        <p className="text-[10px] text-muted-foreground font-mono uppercase mb-2">P/E Ratio</p>
                                                        <p className="font-mono text-lg font-bold">{stockData.pe?.toFixed(2) || "N/A"}</p>
                                                    </div>
                                                    <div className="p-4 bg-secondary/20 rounded-lg border border-border/10">
                                                        <p className="text-[10px] text-muted-foreground font-mono uppercase mb-2">P/B Ratio</p>
                                                        <p className="font-mono text-lg font-bold">{stockData.pb?.toFixed(2) || "N/A"}</p>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="p-12 text-center text-muted-foreground">Select a stock to view statistics</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'tools' && (
                                <div className="bg-card/5 rounded-lg p-6 border border-border/10">
                                    {tradingMode === 'SCALPING' && stockData ? (
                                        <>
                                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">💰 Scalping Calculator</h3>
                                            <ScalpingCalculator currentPrice={stockData.price} />
                                        </>
                                    ) : (
                                        <div className="p-12 text-center text-muted-foreground">No tools available</div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'news' && (
                                <div className="bg-card/5 rounded-lg p-6 border border-border/10">
                                    {activeSymbol ? (
                                        <>
                                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">📰 News Sentiment</h3>
                                            <NewsSentimentPanel ticker={activeSymbol} />
                                        </>
                                    ) : (
                                        <div className="p-12 text-center text-muted-foreground">Select a stock to view news</div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );
}
