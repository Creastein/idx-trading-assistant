"use client";

import { useState } from "react";
import MainChartPanel from "@/components/MainChartPanel";
import AnalysisSidebar from "@/components/AnalysisSidebar";
import ModeSelectionScreen from "@/components/ModeSelectionScreen";
import { StockData, TradingMode } from "@/lib/types";



export default function Home() {
  const [tradingMode, setTradingMode] = useState<TradingMode | null>(null);

  const [ticker, setTicker] = useState("");
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // AI Text Analysis State
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [textAnalysis, setTextAnalysis] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setIsLoading(true);
    setStockData(null);
    setTextAnalysis(null);
    setActiveSymbol(null);

    try {
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: ticker.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setStockData(result.data);
      setActiveSymbol(ticker.trim().toUpperCase());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
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
          data: stockData,
          mode: tradingMode // Pass the mode to API
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
    <div className="min-h-screen bg-terminal-bg flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="border-b border-terminal-border bg-card/80 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-6">

          {/* Brand & Mode Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center shadow-lg shadow-primary/20 cursor-pointer" onClick={() => setTradingMode(null)}>
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

          {/* Search Bar - Centered */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="SEARCH TICKER (e.g. BBRI)..."
              className="w-full bg-secondary/50 border border-border rounded-lg py-2 pl-4 pr-12 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </form>

          {/* Key Stats Inline */}
          {stockData && (
            <div className="hidden lg:flex items-center gap-6 font-mono border-l border-border pl-6 animate-in slide-in-from-right-4 fade-in duration-500">
              <div>
                <span className="text-xs text-muted-foreground block">LAST PRICE</span>
                <span className="text-lg font-bold text-foreground">{stockData.price.toLocaleString("id-ID")}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">CHANGE</span>
                <span className={`text-lg font-bold ${stockData.change >= 0 ? "text-profit" : "text-loss"}`}>
                  {stockData.change >= 0 ? "+" : ""}{stockData.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          )}

        </div>
      </header>

      {/* Main Content - Grid Layout */}
      <main className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">

          {/* Main Chart Area (70-75% width) - Spans 9 columns */}
          <div className="lg:col-span-9 h-[500px] lg:h-full flex flex-col">
            <MainChartPanel
              symbol={activeSymbol}
              tradingMode={tradingMode}
            />
          </div>

          {/* Sidebar Tools (25-30% width) - Spans 3 columns */}
          <div className="lg:col-span-3 h-full overflow-hidden flex flex-col">
            <AnalysisSidebar
              ticker={ticker}
              stockData={stockData}
              onAnalyzeText={handleAnalyzeText}
              isAnalyzingText={isAnalyzingText}
              textAnalysis={textAnalysis}
              tradingMode={tradingMode}
            />
          </div>

        </div>
      </main>
    </div>
  );
}
