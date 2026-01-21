"use client";

import { useState, useEffect, useCallback } from "react";
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
import { StockData, TradingMode, EnhancedStockData } from "@/shared/types";
import type { MultiTimeframeAnalysis } from "@/backend/analysis/multiTimeframe";
import { SettingsDialog } from "@/frontend/components/SettingsDialog";
import { StockSearch } from "@/frontend/components/StockSearch";

// ============================================================================


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

  // Tab Navigation State
  type Tab = 'analysis' | 'keystats' | 'tools' | 'news';
  const [activeTab, setActiveTab] = useState<Tab>('analysis');

  // ============================================================================
  // Load Stock Data (Enhanced)
  // ============================================================================

  const loadStock = async (symbol: string) => {
    if (!symbol.trim() || !tradingMode) return;

    setIsLoading(true);
    setError(null);
    setStockData(null);
    setEnhancedData(null);
    setActiveSymbol(null);

    try {
      const mode = tradingMode === "SCALPING" ? "scalping" : "swing";
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: symbol.trim(), mode }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch stock data");
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

      setActiveSymbol(symbol.trim().toUpperCase());
      toast.success(`Data ${symbol.toUpperCase()} berhasil dimuat!`, {
        description: `Harga: Rp ${enhancedResponse.quote.price?.toLocaleString("id-ID") || "N/A"}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
      setError(message);

      // Show specific toast based on error type
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

      console.error("Stock fetch error:", err);
    } finally {
      setIsLoading(false);
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
    toast.info("Menyegarkan data...");
    await Promise.all([
      loadStock(activeSymbol),
      fetchMTFAnalysis(activeSymbol, tradingMode)
    ]);
  };

  // Auto-trigger MTF when stock data loads
  useEffect(() => {
    if (enhancedData && activeSymbol && tradingMode) {
      console.log('[MTF] Auto-triggering analysis for', activeSymbol);
      fetchMTFAnalysis(activeSymbol, tradingMode);
    }
  }, [enhancedData, activeSymbol, tradingMode, fetchMTFAnalysis]); // Trigger when symbol or mode changes

  const handleAnalyzeText = async () => {
    if (!stockData || !tradingMode) return;
    // Removed unused text analysis handler logic since we switched to inline components
  };

  // 1. Show Selection Screen if mode is not selected
  if (!tradingMode) {
    return <ModeSelectionScreen onSelectMode={setTradingMode} />;
  }

  return (
    <div className="min-h-[100dvh] bg-terminal-bg flex flex-col md:flex-row h-[100dvh] overflow-hidden user-select-none">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden ml-0 pb-16 md:pb-0">
        {/* Header - Borderless & Seamless */}
        <header className="bg-background/50 backdrop-blur-md sticky top-0 z-30 shrink-0 border-b border-border/10">
          <div className="w-full px-4 py-3 flex items-center justify-between gap-3 lg:gap-6">

            {/* Brand (No Back Button) */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center shadow-lg shadow-primary/20">
                <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="hidden md:block">
                <h1 className="font-mono text-lg font-bold tracking-tight text-foreground leading-none">
                  IDX PRO TERMINAL
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
                    AI TRADING ASSISTANT
                  </p>
                  <span className="text-[10px] text-border">|</span>
                  <button
                    onClick={() => setTradingMode(null)}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tradingMode === 'SCALPING' ? 'bg-profit/10 text-profit' : 'bg-chart-2/10 text-chart-2'} hover:bg-muted transition-colors`}
                  >
                    {tradingMode === 'SCALPING' ? '⚡ SCALPING' : '🌊 SWING'}
                  </button>
                </div>
              </div>
            </div>

            {/* Search Bar - Seamless Integration */}
            <div className="flex-1 max-w-md">
              <StockSearch
                onSelect={(symbol) => loadStock(symbol)}
                isLoading={isLoading}
              />
            </div>

            {/* Right Section: Stats + Settings */}
            <div className="flex items-center gap-4 lg:gap-6 ml-auto">
              {/* Key Stats Inline */}
              {stockData && (
                <div className="hidden lg:flex items-center gap-6 animate-in slide-in-from-right-4 fade-in duration-500">
                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">Last Price</span>
                    <span className="text-lg font-mono font-bold text-foreground tracking-tight">{stockData.price?.toLocaleString("id-ID") || "N/A"}</span>
                  </div>
                  <div className="h-8 w-px bg-border/30"></div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">Change</span>
                    <span className={`text-lg font-mono font-bold tracking-tight ${(stockData.change || 0) >= 0 ? "text-profit" : "text-loss"}`}>
                      {(stockData.change || 0) >= 0 ? "+" : ""}{(stockData.changePercent || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg animate-in fade-in">
                  <span className="text-red-400 text-xs">⚠️ {error}</span>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                </div>
              )}

              {/* Settings Button - Rightmost */}
              <SettingsDialog />
            </div>
          </div>
        </header>

        {/* Main Content - Flex Column Layout */}
        <main className="flex-1 p-0 overflow-hidden flex flex-col relative">

          {/* Main Chart Area (Full Width) */}
          <div className="flex flex-col flex-1 overflow-y-auto">

            {/* Loading State */}
            {isLoading && (
              <LoadingOverlay symbol={activeSymbol || "Loading..."} />
            )}

            {/* Chart (hidden during loading) */}
            {!isLoading && (
              <div className="flex-shrink-0" style={{ minHeight: '60%' }}>
                <MainChartPanel
                  symbol={activeSymbol}
                  tradingMode={tradingMode}
                />
              </div>
            )}

            {/* Tab Navigation - Centered Floating Pill Design */}
            <div className="flex justify-center py-4 relative z-10">
              <div className="inline-flex items-center p-1.5 bg-gray-900/90 border border-white/10 rounded-full backdrop-blur-xl shadow-2xl">
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

                  {/* 4. AI Vision Panel */}
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
        </main>
      </div>
    </div>
  );
}
