export interface StockData {
    symbol: string;
    name: string;
    price: number;
    currency: string;
    change: number;
    changePercent: number;
    volume?: number;
    marketCap?: number;
    pe?: number;
    pb?: number;
    dayHigh?: number;
    dayLow?: number;
    open?: number;
    previousClose?: number;
    high52Week?: number;
    low52Week?: number;
}

export type TradingMode = 'SCALPING' | 'SWING' | 'BPJS';

// ============================================================================
// Enhanced Stock Data Types (for Technical Indicators)
// ============================================================================

export interface IndicatorResult {
    value: number;
    interpretation: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL" | "BULLISH" | "BEARISH";
}

export interface MACDResult {
    macd: number;
    signal: number;
    histogram: number;
    crossover: "BULLISH" | "BEARISH" | "NONE";
}

export interface BollingerBandsResult {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    position: "ABOVE_UPPER" | "BELOW_LOWER" | "WITHIN";
}

export interface VolumeAnalysisResult {
    current: number;
    average: number;
    ratio: number;
    isSpike: boolean;
    trend: "INCREASING" | "DECREASING" | "STABLE";
}

export interface Signal {
    type: "BUY" | "SELL";
    indicator: string;
    reason: string;
    strength: "WEAK" | "MEDIUM" | "STRONG";
    price: number;
}

export interface StockNews {
    title: string;
    publisher: string;
    link: string;
    publishTime: string;
}

export interface Recommendation {
    action: string;
    confidence: number;
    reasoning: string[];
}

export interface EnhancedStockData {
    symbol: string;
    name: string;
    quote: {
        price: number;
        change: number;
        changePercent: number;
        volume: number;
        marketCap: number | null;
        pe: number | null;
        pb: number | null;
        sector: string | null;
        previousClose: number;
        dayHigh: number;
        dayLow: number;
    };
    indicators: {
        rsi: IndicatorResult | null;
        macd: MACDResult | null;
        bollingerBands: BollingerBandsResult | null;
        ema20: number | null;
        ema50: number | null;
        sma20: number | null;
        volumeAnalysis: VolumeAnalysisResult | null;
    };
    signals: Signal[];
    supportResistance: {
        support: number[];
        resistance: number[];
    };
    atr: number;
    news?: StockNews[];
    recommendation: Recommendation;
    lastUpdated?: number;
    financials?: {
        incomeStatement: {
            date: string;
            revenue: number;
            netIncome: number;
        }[];
        profitMargins: number;
        revenueGrowth: number;
    };
}

export interface MarketContext {
    ihsg: {
        price: number;
        changePercent: number;
        trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    };
    usdidr: {
        price: number;
        changePercent: number;
    };
}

