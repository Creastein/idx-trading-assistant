# IDX Trading Assistant 🚀

A professional AI-powered trading terminal for Indonesian Stock Exchange (IDX) built with Next.js 16 and React 19.

## ✨ Features

### Trading Modes
- **⚡ Scalping Mode** - Focus on short-term trades with quick entry/exit calculator
- **🌊 Swing Mode** - Fundamental analysis for medium-term positions

### AI-Powered Analysis
- **🧠 Groq (Llama-3.3-70B)** - Fast text/fundamental analysis
- **👁️ Gemini Vision** - Chart pattern recognition and technical analysis from uploaded images

### Core Features
- 📊 **TradingView Integration** - Real-time interactive charts for IDX stocks
- 📰 **News Radar** - AI-powered news sentiment analysis
- 🧮 **Scalping Calculator** - TP/SL/Break-even with IDX fee calculation (0.15% buy, 0.25% sell)
- 📈 **Live Stock Data** - Real-time data via Yahoo Finance

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.3 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| AI | Google Gemini, Groq SDK |
| Data | Yahoo Finance API |
| Charts | TradingView Widgets |
| Language | TypeScript 5 |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd idx-trading-assistant

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` with:

```env
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/     # AI analysis endpoint (Gemini + Groq)
│   │   ├── news/        # News sentiment analysis
│   │   └── stock/       # Yahoo Finance stock data
│   ├── page.tsx         # Main trading terminal
│   └── globals.css      # Design system
├── components/
│   ├── AIVisionPanel.tsx      # Image upload & Gemini analysis
│   ├── AnalysisSidebar.tsx    # Tabbed sidebar (Fundamentals/News/Vision)
│   ├── MainChartPanel.tsx     # TradingView chart container
│   ├── ModeSelectionScreen.tsx # Scalping/Swing mode selector
│   ├── NewsSentimentPanel.tsx  # News & sentiment display
│   ├── ScalpingCalculator.tsx  # TP/SL calculator
│   └── TradingViewChart.tsx    # TradingView widget wrapper
└── lib/
    └── types.ts               # Shared TypeScript types
```

## 🎨 Design System

The app uses a custom dark trading terminal theme with:
- **Profit color**: Green (`oklch(0.7 0.2 145)`)
- **Loss color**: Red (`oklch(0.65 0.22 25)`)
- **Chart colors**: Blue, green, red, yellow, purple palette

## 📝 API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stock` | POST | Fetch stock data from Yahoo Finance |
| `/api/analyze` | POST | AI analysis (text or image) |
| `/api/news` | POST | News sentiment analysis |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

---

Built with ❤️ for Indonesian traders
