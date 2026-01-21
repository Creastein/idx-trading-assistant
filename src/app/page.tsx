"use client";

import { useState } from "react";
import { toast } from "sonner";
import MainChartPanel from "@/components/MainChartPanel";
import AnalysisSidebar from "@/components/AnalysisSidebar";
import ModeSelectionScreen from "@/components/ModeSelectionScreen";
import SidebarNavigation from "@/components/SidebarNavigation";
import { TechnicalIndicatorsPanel } from "@/components/TechnicalIndicatorsPanel";
import { TradingSignalsPanel } from "@/components/TradingSignalsPanel";
import { LoadingOverlay } from "@/components/LoadingSpinner";
import { StockData, TradingMode, EnhancedStockData } from "@/lib/types";

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

      // API returns flat StockData structure
      const data = result.data as StockData;

      // Set legacy stockData directly
      setStockData(data);

      // Create enhanced data with proper nested structure for indicator panels
      // Note: Current API doesn't return indicators, so we set them to null
      setEnhancedData({
        symbol: data.symbol,
        name: data.name,
        quote: {
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          volume: data.volume || 0,
          marketCap: data.marketCap || null,
          pe: data.pe || null,
          pb: data.pb || null,
          sector: null,
          previousClose: data.previousClose || 0,
          dayHigh: data.dayHigh || data.price,
          dayLow: data.dayLow || data.price,
        },
        indicators: {
          rsi: null,
          macd: null,
          bollingerBands: null,
          ema20: null,
          ema50: null,
          sma20: null,
          volumeAnalysis: null,
        },
        signals: [],
        supportResistance: {
          support: [],
          resistance: [],
        },
        atr: 0,
        recommendation: {
          action: "HOLD",
          confidence: 0,
          reasoning: ["Insufficient data"],
        },
      });

      setActiveSymbol(symbol.trim().toUpperCase());
      toast.success(`Data ${symbol.toUpperCase()} berhasil dimuat!`, {
        description: `Harga: Rp ${data.price?.toLocaleString("id-ID") || "N/A"}`,
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
          mode: tradingMode
        }),
      });
      const result = await response.json();
      if (response.ok) setTextAnalysis(result.analysis);
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
    <div className="min-h-screen bg-terminal-bg flex h-screen overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden mr-14">
        {/* Header - Borderless & Seamless */}
        <header className="bg-background/50 backdrop-blur-md sticky top-0 z-50 shrink-0">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-6">

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
                    {tradingMode === 'SCALPING' ? '⚡ SCALPING MODE' : '🌊 SWING MODE'}
                  </button>
                </div>
              </div>
            </div>

            {/* Search Bar - Seamless Integration */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Cari Ticker (cth: BBRI)..."
                className="w-full bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-none rounded-full py-2 pl-10 pr-12 text-sm transition-all shadow-sm focus:shadow-md focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:bg-background hover:text-primary transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <span className="text-[10px] font-bold opacity-0 group-focus-within:opacity-100 transition-opacity">↵</span>
                )}
              </button>
            </form>

            {/* Key Stats Inline */}
            {stockData && (
              <div className="hidden lg:flex items-center gap-6 pl-6 animate-in slide-in-from-right-4 fade-in duration-500">
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">Harga Terakhir</span>
                  <span className="text-lg font-mono font-bold text-foreground tracking-tight">{stockData.price?.toLocaleString("id-ID") || "N/A"}</span>
                </div>
                <div className="h-8 w-px bg-border/30"></div>
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">Perubahan</span>
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

              {/* Technical Indicators & Signals Grid (Below Chart) */}
              {enhancedData && (
                <div className="flex-shrink-0 p-4 border-t border-border/10 bg-background/30">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Technical Indicators Panel */}
                    <TechnicalIndicatorsPanel
                      indicators={enhancedData.indicators}
                      currentPrice={enhancedData.quote.price}
                    />

                    {/* Trading Signals Panel */}
                    <TradingSignalsPanel
                      signals={enhancedData.signals}
                      recommendation={enhancedData.recommendation}
                      isLoading={isLoading}
                    />
                  </div>
                </div>
              )}
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
