"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import MainChartPanel from "@/frontend/components/MainChartPanel";

import { TechnicalIndicatorsPanel } from "@/frontend/components/TechnicalIndicatorsPanel";
import { TradingSignalsPanel } from "@/frontend/components/TradingSignalsPanel";
import { LoadingOverlay } from "@/frontend/components/LoadingSpinner";
import MultiTimeframePanel from "@/frontend/components/MultiTimeframePanel";
import ModeSelectionScreen from "@/frontend/components/ModeSelectionScreen";
import ScalpingCalculator from "@/frontend/components/ScalpingCalculator";
import RiskManagement from "@/frontend/components/RiskManagement";
import NewsSentimentPanel from "@/frontend/components/NewsSentimentPanel";
import AIVisionPanel from "@/frontend/components/AIVisionPanel";
import DataFreshnessIndicator from "@/frontend/components/DataFreshnessIndicator";
import DelayDisclaimerBanner from "@/frontend/components/DelayDisclaimerBanner";
import { BPJSScreener } from "@/frontend/components/BPJSScreener";
import { StockData, TradingMode, EnhancedStockData } from "@/shared/types";
import type { MultiTimeframeAnalysis } from "@/backend/analysis/multiTimeframe";
import { SettingsDialog } from "@/frontend/components/SettingsDialog";
import { StockSearch } from "@/frontend/components/StockSearch";
import { REFRESH_INTERVAL } from "@/shared/constants";
import { ScalpingScreener } from "@/frontend/components/ScalpingScreener";

// ============================================================================
// Main Component
// ============================================================================

export default function Home() {
  const [tradingMode, setTradingMode] = useState<TradingMode | null>(null);

  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  // Legacy stockData for backward compatibility
  const [stockData, setStockData] = useState<StockData | null>(null);

  // Enhanced Stock Data (with indicators)
  const [enhancedData, setEnhancedData] = useState<EnhancedStockData | null>(null);

  // Loading and Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-Timeframe Analysis State
  const [mtfAnalysis, setMtfAnalysis] = useState<MultiTimeframeAnalysis | null>(null);
  const [isLoadingMTF, setIsLoadingMTF] = useState(false);
  const [mtfLastUpdated, setMtfLastUpdated] = useState<number | null>(null);

  // Auto-refresh state
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tab Navigation State
  type Tab = 'analysis' | 'keystats' | 'tools' | 'news';
  const [activeTab, setActiveTab] = useState<Tab>('analysis');

  // ============================================================================
  // Load Stock Data (Enhanced)
  // ============================================================================

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

      // API now returns EnhancedStockData directly
      const enhancedResponse = result.data as EnhancedStockData;

      // Set legacy stockData for backward compatibility
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

      // Use enhanced data directly from API (with indicators!)
      setEnhancedData(enhancedResponse);

      // Update lastUpdated timestamp
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

      // Show specific toast based on error type (only if not silent)
      if (!silent) {
        if (message.includes("not found") || message.includes("Not Found")) {
          toast.error("Simbol saham tidak ditemukan", {
            description: "Periksa kembali kode ticker yang Anda masukkan.",
          });
        } else if (message.includes("network") || message.includes("Network")) {
          toast.error("Kesalahan jaringan", {
            description: "Periksa koneksi internet Anda.",
          });
        } else if (message.includes("rate") || message.includes("limit") || message.includes("429")) {
          toast.warning("Terlalu banyak permintaan", {
            description: "Mohon tunggu sebentar sebelum mencoba lagi.",
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

  // Auto-fetch MTF analysis when stock loads
  const fetchMTFAnalysis = useCallback(async (symbol: string, mode: "SCALPING" | "SWING") => {
    if (!symbol) return;

    setIsLoadingMTF(true);
    try {
      const response = await fetch("/api/analyze/multi-timeframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol,
          mode: mode
        }),
      });
      const result = await response.json();

      if (response.ok) {
        setMtfAnalysis(result);
        setMtfLastUpdated(Date.now());
        console.log('[MTF] Analysis loaded:', result.confluence);
        // Only show toast if it's a manual refresh or initial load, preventing spam if we add polling later
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

    // Refresh both stock data and MTF
    const promises = [loadStock(activeSymbol)];

    if (tradingMode !== 'BPJS') {
      promises.push(fetchMTFAnalysis(activeSymbol, tradingMode));
    }

    toast.info("Menyegarkan data...");
    await Promise.all(promises);
  };

  // Auto-trigger MTF when stock data loads
  useEffect(() => {
    if (enhancedData && activeSymbol && tradingMode && tradingMode !== 'BPJS') {
      console.log('[MTF] Auto-triggering analysis for', activeSymbol);
      fetchMTFAnalysis(activeSymbol, tradingMode);
    }
  }, [enhancedData, activeSymbol, tradingMode, fetchMTFAnalysis]); // Trigger when symbol or mode changes

  // Auto-refresh effect
  useEffect(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Only set up auto-refresh if we have an active symbol
    if (!activeSymbol || !tradingMode) return;

    const interval = tradingMode === "SCALPING"
      ? REFRESH_INTERVAL.SCALPING
      : tradingMode === "SWING"
        ? REFRESH_INTERVAL.SWING
        : 0; // No auto-refresh for BPJS main mode (handled internally by screener)

    if (interval === 0) return;

    console.log(`[Auto-Refresh] Setting up ${tradingMode} mode refresh every ${interval / 1000}s`);

    refreshTimerRef.current = setInterval(() => {
      console.log(`[Auto-Refresh] Refreshing ${activeSymbol}...`);
      loadStock(activeSymbol, true); // Silent refresh
    }, interval);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (refreshTimerRef.current) {
        console.log('[Auto-Refresh] Cleaning up timer');
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [activeSymbol, tradingMode]); // Re-run when symbol or mode changes

  const handleManualRefresh = () => {
    if (activeSymbol) {
      loadStock(activeSymbol, true);
    }
  };

  const handleAnalyzeText = async () => {
    if (!stockData || !tradingMode) return;
    // Removed unused text analysis handler logic since we switched to inline components
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (!tradingMode) {
    return <ModeSelectionScreen onSelectMode={setTradingMode} />;
  }

  // --- Scalping Mode "Lobby" (Screener) ---
  if (tradingMode === 'SCALPING' && !activeSymbol) {
    return (
      <main className="min-h-screen bg-terminal-bg p-6">
        {/* Simple Header */}
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
          {/* Reuse StockSearch for direct access */}
          <div className="w-64">
            <StockSearch onSelect={loadStock} isLoading={isLoading} />
          </div>
        </div>

        <ScalpingScreener onSelectStock={loadStock} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-terminal-bg flex flex-col font-sans text-foreground selection:bg-primary/20">
      {/* 1. Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center gap-4 px-4">

          {/* Logo / Home */}
          <button
            onClick={() => setTradingMode(null)}
            className="mr-2 flex items-center space-x-2 transition-opacity hover:opacity-80"
          >
            <span className="hidden font-bold sm:inline-block">IDX TERMINAL</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
              {tradingMode}
            </span>
          </button>

          {/* Quick Nav Back to Screener (Scalping Only) */}
          {tradingMode === 'SCALPING' && (
            <button
              onClick={() => setActiveSymbol(null)}
              className="text-xs flex items-center gap-1 text-muted-foreground hover:text-profit transition-colors border-r border-border pr-4 mr-2"
            >
              ← Screener
            </button>
          )}

          {/* Central Search */}
          <div className="flex-1 flex justify-center">
            <StockSearch onSelect={loadStock} isLoading={isLoading} initialValue={activeSymbol || ""} />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <SettingsDialog />
          </div>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <div className="flex-1 flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Top Info Bar: Price & Ticker */}
          {stockData && (
            <div className="border-b border-border/40 bg-card/10 px-6 py-4 backdrop-blur-md">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{stockData.symbol}</h2>
                  <p className="text-sm text-muted-foreground">{stockData.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold">
                    {stockData.price?.toLocaleString("id-ID")}
                  </div>
                  <div className={`text-sm font-mono ${(stockData.change || 0) >= 0 ? "text-profit" : "text-loss"}`}>
                    {(stockData.change || 0) >= 0 ? "+" : ""}{(stockData.changePercent || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="container max-w-screen-2xl p-4 md:p-6 lg:p-8 pb-20">

              {/* Tab Navigation */}
              <div className="flex justify-center mb-8 sticky top-0 z-30 pt-2 pb-4 bg-terminal-bg/95 backdrop-blur-sm -mx-4 px-4 border-b border-border/10">
                <div className="inline-flex items-center p-1.5 rounded-full bg-secondary/30 border border-white/5 backdrop-blur-md">
                  {(['analysis', 'keystats', 'tools', 'news'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`
                       px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 relative
                       ${activeTab === tab
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'}
                     `}
                    >
                      {tab === 'analysis' && 'Analysis'}
                      {tab === 'keystats' && 'Key Stats'}
                      {tab === 'tools' && 'Tools'}
                      {tab === 'news' && 'News'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content Area */}
              <div className="flex-shrink-0 p-4 bg-background/30 min-h-[400px]">

                {/* ======================= ANALYSIS TAB ======================= */}
                {activeTab === 'analysis' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-7xl mx-auto">

                    {/* Data Freshness Indicator */}
                    {activeSymbol && lastUpdated && (
                      <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border/10">
                        <DataFreshnessIndicator
                          lastUpdated={lastUpdated}
                          tradingMode={tradingMode}
                          isRefreshing={isRefreshing}
                          onRefresh={handleManualRefresh}
                        />
                      </div>
                    )}

                    {/* Delay Disclaimer Banner */}
                    <DelayDisclaimerBanner />

                    {/* 0. Chart Section */}
                    {activeSymbol && (
                      <div className="space-y-4">
                        <MainChartPanel
                          symbol={activeSymbol}
                          tradingMode={tradingMode}
                        />
                      </div>
                    )}

                    {/* 1. Technical Indicators Section */}
                    <div className="space-y-4">
                      {/* Component has internal header, so we only provide container */}
                      <TechnicalIndicatorsPanel
                        indicators={enhancedData?.indicators || null}
                        currentPrice={enhancedData?.quote.price || 0}
                        error={error}
                        isLoading={isLoading}
                      />
                    </div>

                    {/* 2. Trading Signals (Scalping Mode Only) */}
                    {enhancedData && tradingMode === 'SCALPING' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="h-px flex-1 bg-border/20"></div>
                          <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">⚡ Scalping Signals</span>
                          <div className="h-px flex-1 bg-border/20"></div>
                        </div>
                        <TradingSignalsPanel
                          signals={enhancedData.signals}
                          recommendation={enhancedData.recommendation}
                          isLoading={isLoading}
                        />
                      </div>
                    )}

                    {/* 3. Multi-Timeframe Analysis (Swing Mode Only) */}
                    {(mtfAnalysis || isLoadingMTF) && tradingMode === 'SWING' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 w-full">
                            <div className="h-px flex-1 bg-border/20"></div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">
                                ⏱️ Multi-Timeframe
                              </span>
                              {mtfLastUpdated && !isLoadingMTF && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 whitespace-nowrap">
                                  {Math.floor((Date.now() - mtfLastUpdated) / 60000)}m ago
                                </span>
                              )}
                            </div>
                            <div className="h-px flex-1 bg-border/20"></div>
                          </div>

                          <button
                            onClick={handleRefreshAnalysis}
                            disabled={isLoadingMTF}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/20 hover:bg-secondary/40 text-foreground transition-all border border-white/5 disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            <svg className={`w-3.5 h-3.5 ${isLoadingMTF ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isLoadingMTF ? 'Scanning...' : 'Refresh'}
                          </button>
                        </div>

                        {isLoadingMTF ? (
                          <div className="p-12 text-center border border-dashed border-gray-800 rounded-xl bg-gray-900/30">
                            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-400 font-mono text-sm">Analyzing market structure across timeframes...</p>
                          </div>
                        ) : (
                          <MultiTimeframePanel analysis={mtfAnalysis} />
                        )}
                      </div>
                    )}

                    {/* 4. AI Vision Analysis (if active) */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="h-px flex-1 bg-border/20"></div>
                        <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">👁️ AI Vision Analysis</span>
                        <div className="h-px flex-1 bg-border/20"></div>
                      </div>
                      <AIVisionPanel />
                    </div>

                  </div>
                )}



                {/* ======================= KEY STATS TAB ======================= */}
                {activeTab === 'keystats' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {stockData ? (
                      <div>
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">📊 Fundamental Analysis</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-secondary/20 rounded-lg">
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

                        {tradingMode === 'SCALPING' && (
                          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <p className="text-yellow-200 text-xs">⚠️ Fundamental data is usually less relevant for Scalping (short-term) strategies.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">Select a stock to view statistics</div>
                    )}
                  </div>
                )}

                {/* ======================= TOOLS TAB ======================= */}
                {activeTab === 'tools' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Scalping Calculator (Scalping Mode) */}
                    {tradingMode === 'SCALPING' && stockData && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">💰 Scalping Calculator</h3>
                        <ScalpingCalculator currentPrice={stockData.price} />
                      </div>
                    )}
                  </div>
                )}

                {/* ======================= NEWS TAB ======================= */}
                {activeTab === 'news' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
          </div>
        </div>
      </div>
    </main>
  );
}
