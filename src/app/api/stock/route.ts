import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// Initialize the Yahoo Finance instance
const yahooFinance = new YahooFinance();

interface QuoteResult {
    regularMarketPrice?: number;
    currency?: string;
    marketCap?: number;
    trailingPE?: number;
    priceToBook?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketVolume?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    regularMarketOpen?: number;
    regularMarketPreviousClose?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    shortName?: string;
    longName?: string;
}

export async function POST(request: NextRequest) {
    try {
        const { ticker } = await request.json();

        if (!ticker || typeof ticker !== "string") {
            return NextResponse.json(
                { error: "Ticker is required" },
                { status: 400 }
            );
        }

        // Append .JK suffix for IDX stocks if not present
        const symbol = ticker.toUpperCase().endsWith(".JK")
            ? ticker.toUpperCase()
            : `${ticker.toUpperCase()}.JK`;

        // Fetch stock data using quote method
        const quote = await yahooFinance.quote(symbol) as QuoteResult;

        if (!quote || !quote.regularMarketPrice) {
            return NextResponse.json(
                { error: `Stock ${symbol} not found or no data available` },
                { status: 404 }
            );
        }

        const stockData = {
            symbol: symbol,
            name: quote.longName || quote.shortName || symbol,
            price: quote.regularMarketPrice,
            currency: quote.currency || "IDR",
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            dayHigh: quote.regularMarketDayHigh,
            dayLow: quote.regularMarketDayLow,
            open: quote.regularMarketOpen,
            previousClose: quote.regularMarketPreviousClose,
            volume: quote.regularMarketVolume,
            marketCap: quote.marketCap,
            pe: quote.trailingPE,
            pb: quote.priceToBook,
            high52Week: quote.fiftyTwoWeekHigh,
            low52Week: quote.fiftyTwoWeekLow,
        };

        return NextResponse.json({ success: true, data: stockData });
    } catch (error) {
        console.error("Yahoo Finance API Error:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Handle specific Yahoo Finance errors
        if (errorMessage.includes("Not Found") || errorMessage.includes("no results")) {
            return NextResponse.json(
                { error: "Stock ticker not found. Please check the ticker symbol." },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: `Failed to fetch stock data: ${errorMessage}` },
            { status: 500 }
        );
    }
}
