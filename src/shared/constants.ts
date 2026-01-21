// Trading Fee Constants for IDX (Indonesia Stock Exchange)
export const IDX_FEE = {
    BUY: 0.0015,       // 0.15%
    SELL: 0.0025,      // 0.25%
    TOTAL: 0.004,      // 0.40% round trip
} as const;

// TradingView Configuration
export const TRADINGVIEW = {
    EXCHANGE_PREFIX: 'IDX',
    TIMEZONE: 'Asia/Jakarta',
    LOCALE: 'id',
    DEFAULT_INTERVAL: {
        SCALPING: '5',
        SWING: 'D',
    },
} as const;

// AI Model Configuration
export const AI_MODELS = {
    GROQ: 'llama-3.3-70b-versatile',
    GEMINI: 'gemini-flash-latest',
} as const;

// Yahoo Finance Configuration
export const YAHOO_FINANCE = {
    IDX_SUFFIX: '.JK',
    NEWS_COUNT: 5,
} as const;
