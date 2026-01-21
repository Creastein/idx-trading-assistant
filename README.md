
# 📈 IDX Trading Assistant v2.0
> **Professional AI-Powered Trading Terminal for Indonesian Stock Exchange**

![Version Badge](https://img.shields.io/badge/version-2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.3-black.svg)
![AI](https://img.shields.io/badge/AI-Gemini%20%2B%20Groq-purple.svg)

A comprehensive, institutional-grade trading dashboard designed specifically for the Indonesian Stock Exchange (IDX). This application leverages state-of-the-art AI (Google Gemini 2.0 & Groq Llama-3.3) to provide real-time technical analysis, automated signal generation, and risk management strategies.

---

## ✨ Features

### 🎯 Advanced Technical Analysis
- **7 Core Indicators**: Automatically calculates RSI, MACD, Bollinger Bands, EMA, SMA, Volume, and ATR.
- **Smart Detection**: Algorithms identify crossovers, divergences, and band squeezes instantly.
- **Support & Resistance**: Dynamic level detection based on pivot points and historical price action.
- **Enhanced Data**: Fetches real-time market data via Yahoo Finance API with robust caching.

### 🤖 AI-Powered Insights
- **Dual-AI Architecture**: 
  - **Visual AI (Gemini 2.0 Flash)**: Analyzes chart patterns and "sees" the trend like a human trader.
  - **Analytical AI (Groq Llama-3.3)**: Processes raw numeric data for fundamental and technical correlation.
- **Confidence Scoring**: Every trade recommendation comes with a 0-100% confidence score based on indicator confluence.
- **Context-Aware**: AI explains *why* a signal is generated (e.g., "Bullish divergence on RSI aligned with MACD crossover").

### 📊 Multi-Timeframe Analysis (MTF)
- **Scalping Mode**: Analyzes 1m, 5m, 15m, and 1h charts for short-term confluence.
- **Swing Mode**: Aligns 1h, 4h, 1D, and 1W trends for reliable position trading.
- **Trend Confluence**: Visual dashboard showing agreement across timeframes to filter out noise.

### 🛡️ Risk Management Tools
- **Position Size Calculator**: Input your capital and risk tolerance (e.g., 2%) to get exact lot sizes.
- **Smart R:R**: Calculates Risk:Reward ratio automatically based on entry, stop loss, and take profit levels.
- **Portfolio Monitor**: Tracks exposure and ensures you never risk more than your set limit.
- **Fee Calculator**: Built-in IDX fee structure (0.15% Buy / 0.25% Sell) for accurate net profit estimation.

### 🧪 Strategy Backtesting
- **Simulate Strategies**: Test RSI Reversal, MACD Crossover, and Bollinger Bounce strategies.
- **Historical Data**: Run simulations on 30, 60, 90, or 180 days of historical price action.
- **Performance Metrics**: Get detailed reports on Win Rate, Profit Factor, Max Drawdown, and Total Return.
- **Realistic Testing**: Includes fee simulation and slippage estimates.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16.1.3](https://nextjs.org/) (App Router)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: Shadcn/UI + Lucide Icons
- **AI Models**: Google Gemini 2.0 Flash + Groq (Llama-3.3-70B)
- **Market Data**: `yahoo-finance2` API
- **State Management**: React Context + Hooks

---

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/idx-trading-assistant.git
   cd idx-trading-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env.local` file in the root directory:
   ```env
   # AI API Keys
   GEMINI_API_KEY=your_gemini_api_key_here
   GROQ_API_KEY=your_groq_api_key_here

   # Next.js Config
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📖 Usage Guide

### 1. Select Trading Mode
Choose **Scalping** (intraday) or **Swing** (multi-day) mode upon launch. This adjusts the AI's sensitivity and chart timeframes.

### 2. Analyze a Stock
- Use the **Search Bar** (top) to enter a ticker (e.g., `BBRI`, `GOTO`). 
- The autocomplete will suggest popular IDX stocks.
- The app will instantly fetch data, calculate indicators, and generate an AI report.

### 3. Review Analysis
- **Left Panel (Chart)**: View price action and main indicators.
- **Bottom Panel (Indicators)**: Check RSI, MACD, and Oscillator status.
- **Right Panel (Signals)**: Read the AI's "Buy", "Sell", or "Hold" recommendation and reasoning.

### 4. Manage Risk
- Open the **Risk Calculator** tab.
- Enter your Entry Price and Stop Loss.
- Result: The app tells you exactly how many lots to buy to match your risk profile.

### 5. Backtest Strategy
- Navigate to the **/backtest** page.
- Select a stock and strategy (e.g., RSI Reversal).
- Click "Run Backtest" to see how that strategy performed over the last 3 months.

---

## 🔌 API Documentation

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/api/stock` | Base stock data + indicators | `{ ticker: "BBCA", mode: "swing" }` |
| `POST` | `/api/analyze` | Full AI textual analysis | `{ type: "text", data: {...} }` |
| `POST` | `/api/analyze/multi-timeframe` | MTF Confluence Check | `{ symbol: "TLKM", mode: "SCALPING" }` |
| `POST` | `/api/news` | News Sentiment Analysis | `{ symbol: "ASII" }` |

---

## 🛣️ Roadmap

- [ ] **Real-time WebSocket Data**: integration for live price updates.
- [ ] **Portfolio Tracking**: Save your actual trades and track P&L.
- [ ] **Price Prediction Module**: Machine Learning model (LSTM) for price forecasting.
- [ ] **Mobile Application**: Native React Native app for on-the-go trading.
- [ ] **Alerts**: Push notifications for price breakouts.

---

## ⚠️ Disclaimer

**EDUCATIONAL PURPOSES ONLY.**

This application provides market analysis based on technical indicators and artificial intelligence. **It is NOT financial advice.**

- **Risk of Loss**: Trading stocks involves a high level of risk and may not be suitable for all investors. You could lose some or all of your initial investment.
- **Data Accuracy**: Data is sourced from Yahoo Finance and may be delayed by up to 15 minutes.
- **No Guarantee**: Past performance of any trading system or methodology is not necessarily indicative of future results.

**Always conduct your own due diligence and consult with a licensed financial advisor before making any investment decisions.**

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- **Anthropic Claude**: For assistance in architectural design and code generation.
- **Google IDX**: For the robust cloud development environment.
- **TradingView**: For the inspiration behind the charting interface.
- **Lucide Icons**: For the beautiful open-source icon set.

---

*Built with ❤️ for Indonesian Traders*
