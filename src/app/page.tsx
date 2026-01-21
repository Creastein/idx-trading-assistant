"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import MainChartPanel from "@/components/MainChartPanel";
import AnalysisSidebar from "@/components/AnalysisSidebar";
import ModeSelectionScreen from "@/components/ModeSelectionScreen";
import SidebarNavigation from "@/components/SidebarNavigation";
import { TechnicalIndicatorsPanel } from "@/components/TechnicalIndicatorsPanel";
import { TradingSignalsPanel } from "@/components/TradingSignalsPanel";
import { LoadingOverlay } from "@/components/LoadingSpinner";
import MultiTimeframePanel from "@/components/MultiTimeframePanel";
import { StockData, TradingMode, EnhancedStockData } from "@/lib/types";
import type { MultiTimeframeAnalysis } from "@/lib/multiTimeframeAnalysis";
import { SettingsDialog } from "@/components/SettingsDialog";
import { StockSearch } from "@/components/StockSearch";

// ============================================================================
// Helper: Fetch Enhanced Stock Data
// ============================================================================

async function fetchEnhancedStockData(
  symbol: string,
  mode: "scalping" | "swing"
): Promise<EnhancedStockData> {
  const response = await fetch("/api/stock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker: symbol, mode }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch stock data");
  }

  return result.data as EnhancedStockData;
}

// ============================================================================
// Main Component
// ============================================================================

export default function Home() {
  const [tradingMode, setTradingMode] = useState<TradingMode | null>(null);

  const [ticker, setTicker] = useState("");
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  // Legacy stockData for backward compatibility
  const [stockData, setStockData] = useState<StockData | null>(null);

  // Enhanced Stock Data (with indicators)
  const [enhancedData, setEnhancedData] = useState<EnhancedStockData | null>(null);

  // Loading and Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"chart" | "fundamentals" | "news" | "vision" | "risk">("chart");

  // AI Text Analysis State
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [textAnalysis, setTextAnalysis] = useState<string | null>(null);

  // Multi-Timeframe Analysis State
  const [mtfAnalysis, setMtfAnalysis] = useState<MultiTimeframeAnalysis | null>(null);
  const [isLoadingMTF, setIsLoadingMTF] = useState(false);
  const [mtfLastUpdated, setMtfLastUpdated] = useState<number | null>(null);

  // ============================================================================
  // Load Stock Data (Enhanced)
  // ============================================================================

  const loadStock = async (symbol: string) => {
    if (!symbol.trim() || !tradingMode) return;

    setIsLoading(true);
    setError(null);
    setStockData(null);
    setEnhancedData(null);
    setTextAnalysis(null);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadStock(ticker);
  };

  // Auto-fetch MTF analysis when stock loads
  const fetchMTFAnalysis = async (symbol: string, mode: "SCALPING" | "SWING") => {
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
  };

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
  }, [enhancedData?.symbol, tradingMode]); // Trigger when symbol or mode changes

  const handleAnalyzeText = async () => {
    if (!stockData || !tradingMode) return;
    setIsAnalyzingText(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          data: enhancedData || stockData,
          mode: tradingMode,
          symbol: activeSymbol || stockData.symbol
        }),
      });
      const result = await response.json();
      if (response.ok) {
        setTextAnalysis(result.analysis);
        // MTF is now auto-triggered, but update if response includes it
        if (result.mtfAnalysis && !mtfAnalysis) {
          setMtfAnalysis(result.mtfAnalysis);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingText(false);
    }
  };

  // 1. Show Selection Screen if mode is not selected
  if (!tradingMode) {
    return <ModeSelectionScreen onSelectMode={setTradingMode} />;
  }

  return (
    <div className="min-h-[100dvh] bg-terminal-bg flex flex-col md:flex-row h-[100dvh] overflow-hidden user-select-none">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden mr-0 md:mr-14 pb-16 md:pb-0">
        {/* Header - Borderless & Seamless */}
        <header className="bg-background/50 backdrop-blur-md sticky top-0 z-30 shrink-0 border-b border-border/10">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3 lg:gap-6">

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
                initialValue={ticker}
              />
            </div>

            {/* Trading Mode & Settings */}
            <div className="flex items-center gap-2 lg:gap-3">
              <SettingsDialog />
            </div>

            {/* Key Stats Inline */}
            {stockData && (
              <div className="hidden lg:flex items-center gap-6 pl-6 animate-in slide-in-from-right-4 fade-in duration-500">
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
          </div>
        </header>

        {/* Main Content - Grid Layout */}
        <main className="flex-1 p-0 overflow-hidden">
          <div className="flex h-full">

            {/* Main Chart Area (Expandable) */}
            <div className={`flex flex-col h-full transition-all duration-300 overflow-y-auto ${activeTab === 'chart' ? 'w-full' : 'hidden lg:flex lg:w-3/4'}`}>

              {/* Loading State */}
              {isLoading && (
                <LoadingOverlay symbol={ticker} />
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

              {/* Technical Indicators & Signals Grid (Below Chart) - Always render to show states */}
              <div className="flex-shrink-0 p-4 border-t border-border/10 bg-background/30">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Technical Indicators Panel */}
                  <TechnicalIndicatorsPanel
                    indicators={enhancedData?.indicators || null}
                    currentPrice={enhancedData?.quote.price || 0}
                    error={error}
                    isLoading={isLoading}
                  />

                  {/* Trading Signals Panel */}
                  {enhancedData && (
                    <TradingSignalsPanel
                      signals={enhancedData.signals}
                      recommendation={enhancedData.recommendation}
                      isLoading={isLoading}
                    />
                  )}
                </div>

                {/* Multi-Timeframe Confluence Analysis */}
                {(mtfAnalysis || isLoadingMTF) && (
                  <div className="mt-8 pt-6 border-t border-border/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                          ⏱️ Multi-Timeframe
                        </span>
                        {mtfLastUpdated && !isLoadingMTF && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                            Updated {Math.floor((Date.now() - mtfLastUpdated) / 60000)}m ago
                          </span>
                        )}
                      </div>

                      <button
                        onClick={handleRefreshAnalysis}
                        disabled={isLoadingMTF}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-secondary/50 hover:bg-secondary text-foreground transition-colors disabled:opacity-50"
                      >
                        <svg className={`w-3.5 h-3.5 ${isLoadingMTF ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh Analysis
                      </button>
                    </div>

                    {isLoadingMTF ? (
                      <div className="p-12 text-center border border-dashed border-gray-800 rounded-lg bg-gray-900/30">
                        <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400 font-mono text-sm">Analyzing multiple timeframes...</p>
                        <p className="text-gray-600 text-xs mt-2">Checking {tradingMode === "SCALPING" ? "1m, 5m, 15m, 1h" : "1h, 4h, 1d, 1w"} charts</p>
                      </div>
                    ) : (
                      <MultiTimeframePanel analysis={mtfAnalysis} />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Tools (Collapsible) */}
            {activeTab !== 'chart' && (
              <div className="w-full lg:w-1/4 h-full overflow-hidden flex flex-col animate-in slide-in-from-right-10 fade-in duration-300 bg-background/50 border-l border-border/10 backdrop-blur-sm">
                <AnalysisSidebar
                  ticker={ticker}
                  stockData={stockData}
                  onAnalyzeText={handleAnalyzeText}
                  isAnalyzingText={isAnalyzingText}
                  textAnalysis={textAnalysis}
                  tradingMode={tradingMode}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Sidebar Navigation - Fixed Right */}
      <SidebarNavigation
        tradingMode={tradingMode}
        onBackToModeSelection={() => setTradingMode(null)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
