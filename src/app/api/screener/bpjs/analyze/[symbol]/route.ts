/**
 * BPJS Single Stock Analysis Endpoint
 * 
 * Analyze individual stock on-demand with BPJS scoring and AI recommendations.
 * 
 * Route: GET /api/screener/bpjs/analyze/[symbol]
 * Example: GET /api/screener/bpjs/analyze/BBRI
 * 
 * @module app/api/screener/bpjs/analyze/[symbol]
 */

import { NextRequest } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { calculateBPJSScore } from '@/lib/bpjs/scoring';
import { generateAIAnalysis } from '@/lib/bpjs/aiAnalyst';
import { getStockInfo } from '@/lib/bpjs/universe';
import type { EnhancedStockData } from '@/shared/types';
import {
    performTechnicalAnalysis,
    type TechnicalAnalysisResult,
} from '@/backend/analysis/indicators';

const yahooFinance = new YahooFinance();

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol: rawSymbol } = await params;
    const symbol = rawSymbol.toUpperCase();

    try {
        console.log(`[BPJS Analyze] Analyzing ${symbol}`);

        // Fetch stock data
        const symbolWithSuffix = `${symbol}.JK`;
        const quote = await yahooFinance.quote(symbolWithSuffix);

        if (!quote || !quote.regularMarketPrice) {
            throw new Error(`No quote data for ${symbol}`);
        }

        // Fetch historical data (90 days)
        const endDate = new Date();
        const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        const chartResult = await yahooFinance.chart(symbolWithSuffix, {
            period1: startDate,
            period2: endDate,
            interval: '1d',
        });

        const historicalData = chartResult.quotes || [];

        if (historicalData.length < 20) {
            throw new Error(`Insufficient historical data for ${symbol}`);
        }

        // Extract price arrays
        const closes = historicalData
            .map(q => q.close)
            .filter((c): c is number => c !== null && c !== undefined && !isNaN(c) && c > 0);

        const volumes = historicalData
            .map(q => q.volume)
            .filter((v): v is number => v !== null && v !== undefined && !isNaN(v) && v >= 0);

        if (closes.length < 20) {
            throw new Error(`Insufficient valid price data for ${symbol}`);
        }

        // Perform technical analysis
        const analysis: TechnicalAnalysisResult = performTechnicalAnalysis(closes, volumes);

        // Get stock info
        const stockInfo = getStockInfo(symbol);

        // Build EnhancedStockData
        const stockData: EnhancedStockData = {
            symbol: symbol,
            name: stockInfo?.name || quote.longName || quote.shortName || symbol,
            quote: {
                price: quote.regularMarketPrice,
                change: quote.regularMarketChange || 0,
                changePercent: quote.regularMarketChangePercent || 0,
                volume: quote.regularMarketVolume || 0,
                marketCap: quote.marketCap || null,
                pe: quote.trailingPE || null,
                pb: quote.priceToBook || null,
                sector: stockInfo?.sector || null,
                previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
                dayHigh: quote.regularMarketDayHigh || quote.regularMarketPrice,
                dayLow: quote.regularMarketDayLow || quote.regularMarketPrice,
            },
            indicators: {
                rsi: analysis.rsi ? {
                    value: analysis.rsi.current,
                    interpretation: analysis.rsi.current < 30 ? 'OVERSOLD' as const :
                        analysis.rsi.current > 70 ? 'OVERBOUGHT' as const : 'NEUTRAL' as const,
                } : { value: 50, interpretation: 'NEUTRAL' as const },
                macd: analysis.macd ? {
                    macd: analysis.macd.current.macd,
                    signal: analysis.macd.current.signal,
                    histogram: analysis.macd.current.histogram,
                    crossover: analysis.macd.crossover,
                } : { macd: 0, signal: 0, histogram: 0, crossover: 'NONE' as const },
                bollingerBands: analysis.bollingerBands ? {
                    upper: analysis.bollingerBands.current.upper,
                    middle: analysis.bollingerBands.current.middle,
                    lower: analysis.bollingerBands.current.lower,
                    bandwidth: analysis.bollingerBands.current.bandwidth,
                    position: quote.regularMarketPrice > analysis.bollingerBands.current.upper ? 'ABOVE_UPPER' as const :
                        quote.regularMarketPrice < analysis.bollingerBands.current.lower ? 'BELOW_LOWER' as const : 'WITHIN' as const,
                } : null,
                ema20: closes.length >= 20 ? closes.slice(-20).reduce((a, b) => a + b) / 20 : quote.regularMarketPrice,
                ema50: closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b) / 50 : quote.regularMarketPrice,
                sma20: closes.length >= 20 ? closes.slice(-20).reduce((a, b) => a + b) / 20 : null,
                volumeAnalysis: {
                    current: quote.regularMarketVolume || 0,
                    average: volumes.length > 0 ? volumes.reduce((a, b) => a + b) / volumes.length : 1,
                    ratio: volumes.length > 0 ? (quote.regularMarketVolume || 0) / (volumes.reduce((a, b) => a + b) / volumes.length) : 1,
                    isSpike: false,
                    trend: 'STABLE' as const,
                },
            },
            signals: [],
            supportResistance: {
                support: [],
                resistance: [],
            },
            atr: 0,
            recommendation: {
                action: 'HOLD' as const,
                confidence: 50,
                reasoning: [],
            },
        };

        // Calculate BPJS score
        const score = calculateBPJSScore(stockData);

        // Generate AI analysis
        const aiAnalysis = await generateAIAnalysis(score, stockData);

        console.log(`[BPJS Analyze] ${symbol} score: ${score.totalScore}/100, recommendation: ${aiAnalysis.recommendation}`);

        return Response.json({
            success: true,
            timestamp: new Date().toISOString(),
            symbol,
            score,
            aiAnalysis,
            stockData: {
                quote: stockData.quote,
                indicators: stockData.indicators,
            },
        });

    } catch (error) {
        console.error(`[BPJS Analyze] Error analyzing ${symbol}:`, error);
        return Response.json(
            {
                success: false,
                symbol,
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
