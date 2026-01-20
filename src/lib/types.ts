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

export type TradingMode = 'SCALPING' | 'SWING';
