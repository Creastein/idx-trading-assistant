/**
 * BPJS Scoring Algorithm
 * 
 * Multi-factor scoring system (0-100 scale) for BPJS (Beli Pagi Jual Sore) trading strategy.
 * 
 * Scoring Breakdown:
 * - Gap Performance: 0-20 points (gap up strength)
 * - Volume Surge: 0-20 points (institutional interest)
 * - RSI Position: 0-15 points (momentum zone)
 * - MACD Signal: 0-15 points (trend confirmation)
 * - Bollinger Position: 0-10 points (overbought/oversold)
 * - EMA Trend: 0-10 points (trend strength)
 * - News Sentiment: 0-5 points (market sentiment)
 * - Sector Momentum: 0-5 points (sector strength)
 * 
 * @module lib/bpjs/scoring
 */

import type { EnhancedStockData } from '@/shared/types';
import { getStockInfo } from './universe';

export interface BPJSScore {
    symbol: string;
    companyName: string;
    sector: string;
    totalScore: number; // 0-100
    breakdown: {
        gapPerformance: number;    // 0-20
        volumeSurge: number;       // 0-20
        rsiPosition: number;       // 0-15
        macdSignal: number;        // 0-15
        bollingerPosition: number; // 0-10
        emaTrend: number;          // 0-10
        newsSentiment: number;     // 0-5
        sectorMomentum: number;    // 0-5
    };
    quote: {
        currentPrice: number;
        open: number;
        prevClose: number;
        gapPercent: number;
        volume: number;
        avgVolume: number;
        volumeRatio: number;
    };
    supportResistance: {
        support: number[];
        resistance: number[];
    };
}

/**
 * Calculate comprehensive BPJS score for a stock
 * @param stockData Enhanced stock data with all indicators
 * @returns BPJSScore with total score and breakdown
 */
export function calculateBPJSScore(stockData: EnhancedStockData, newsScore: number = 3): BPJSScore {
    // Calculate individual scores
    const breakdown = {
        gapPerformance: scoreGapPerformance(
            stockData.quote.price,
            stockData.quote.previousClose
        ),
        volumeSurge: scoreVolumeSurge(
            stockData.quote.volume,
            stockData.indicators.volumeAnalysis?.average || stockData.quote.volume
        ),
        rsiPosition: scoreRSI(
            stockData.indicators.rsi?.value || 50
        ),
        macdSignal: scoreMACDSignal(
            stockData.indicators.macd
        ),
        bollingerPosition: scoreBollingerPosition(
            stockData.quote.price,
            stockData.indicators.bollingerBands
        ),
        emaTrend: scoreEMATrend(
            stockData.quote.price,
            stockData.indicators.ema20 || stockData.quote.price,
            stockData.indicators.ema50 || stockData.quote.price
        ),
        newsSentiment: newsScore, // Real sentiment 0-5
        sectorMomentum: 3, // Placeholder - would need sector index data
    };

    // Calculate total score
    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

    // Get stock metadata
    const stockInfo = getStockInfo(stockData.symbol);

    return {
        symbol: stockData.symbol,
        companyName: stockInfo?.name || stockData.name || stockData.symbol,
        sector: stockInfo?.sector || 'Others',
        totalScore: Math.round(totalScore),
        breakdown,
        quote: {
            currentPrice: stockData.quote.price,
            open: stockData.quote.price, // Use current as proxy if open not available
            prevClose: stockData.quote.previousClose,
            gapPercent: ((stockData.quote.price - stockData.quote.previousClose) / stockData.quote.previousClose) * 100,
            volume: stockData.quote.volume,
            avgVolume: stockData.indicators.volumeAnalysis?.average || stockData.quote.volume,
            volumeRatio: stockData.indicators.volumeAnalysis?.ratio || 1,
        },
        supportResistance: stockData.supportResistance || { support: [], resistance: [] },
    };
}

// ============================================================================
// Individual Scoring Functions
// ============================================================================

/**
 * Score gap performance (0-20 points)
 * 
 * Logic:
 * - Gap 1-3%: Optimal (20 pts) - momentum without overextension
 * - Gap 3-5%: Medium (15 pts) - need caution
 * - Gap >7%: Risky (5 pts) - likely profit-taking
 * - Gap down: 0 pts - not suitable for BPJS
 */
function scoreGapPerformance(current: number, prevClose: number): number {
    const gap = ((current - prevClose) / prevClose) * 100;

    if (gap < 0) return 0; // Gap down = tidak cocok BPJS
    if (gap >= 0 && gap < 1) return 10; // Small gap = safe
    if (gap >= 1 && gap < 3) return 20; // Optimal gap
    if (gap >= 3 && gap < 5) return 15; // Medium gap
    if (gap >= 5 && gap < 7) return 10; // Large gap = risky
    if (gap >= 7) return 5; // Very large gap = very risky

    return 0;
}

/**
 * Score volume surge (0-20 points)
 * 
 * Logic:
 * - Volume >150%: Strong momentum (15 pts)
 * - Volume >200%: Breakout potential (20 pts)
 * - Volume >300%: Extreme, possible bubble (15 pts)
 */
function scoreVolumeSurge(currentVol: number, avgVol: number): number {
    if (avgVol === 0) return 5; // Prevent division by zero

    const ratio = currentVol / avgVol;

    if (ratio < 0.8) return 0; // Low volume = no interest
    if (ratio >= 0.8 && ratio < 1.2) return 5; // Normal
    if (ratio >= 1.2 && ratio < 1.5) return 10; // Above average
    if (ratio >= 1.5 && ratio < 2.0) return 15; // Strong interest
    if (ratio >= 2.0 && ratio < 3.0) return 20; // Very strong
    if (ratio >= 3.0) return 15; // Extreme (bisa jadi panic buying)

    return 0;
}

/**
 * Score RSI position (0-15 points)
 * 
 * Logic:
 * - RSI 50-65: Sweet spot (15 pts) - momentum bullish tapi belum overheated
 * - RSI >70: Overbought (5 pts) - risky for BPJS
 */
function scoreRSI(rsi: number): number {
    if (rsi < 30) return 5; // Oversold, tapi risky untuk BPJS
    if (rsi >= 30 && rsi < 40) return 10; // Recovering
    if (rsi >= 40 && rsi < 50) return 12; // Good entry zone
    if (rsi >= 50 && rsi <= 65) return 15; // Sweet spot
    if (rsi > 65 && rsi <= 70) return 10; // Approaching overbought
    if (rsi > 70) return 5; // Overbought, risky

    return 0;
}

/**
 * Score MACD signal (0-15 points)
 * 
 * Logic:
 * - Bullish crossover: Fresh signal (15 pts)
 * - Positive histogram: Still bullish (10 pts)
 * - Negative histogram: Bearish (3 pts)
 */
function scoreMACDSignal(macd: any): number {
    if (!macd) return 5; // No MACD data

    // Crossover bonus
    if (macd.crossover === 'BULLISH') {
        return 15; // Fresh bullish signal
    } else if (macd.crossover === 'BEARISH') {
        return 0; // Bearish = skip
    }

    // No crossover, check histogram
    if (macd.histogram > 0) {
        return 10; // Still bullish momentum
    } else if (macd.histogram < 0) {
        return 3; // Bearish momentum
    }

    return 5; // Neutral
}

/**
 * Score Bollinger Bands position (0-10 points)
 * 
 * Logic:
 * - Near lower band: Bounce potential (10 pts)
 * - Middle: Safe zone (10 pts)
 * - Near upper band: Resistance, risky (3 pts)
 */
function scoreBollingerPosition(price: number, bb: any): number {
    if (!bb || !bb.upper || !bb.lower) return 5; // No BB data

    const range = bb.upper - bb.lower;
    if (range === 0) return 5; // Invalid range

    const position = (price - bb.lower) / range; // 0 = lower band, 1 = upper band

    if (position < 0.2) return 10; // Near lower band = bounce potential
    if (position >= 0.2 && position < 0.4) return 8;
    if (position >= 0.4 && position < 0.6) return 10; // Middle = neutral good
    if (position >= 0.6 && position < 0.8) return 6;
    if (position >= 0.8) return 3; // Near upper band = overbought

    return 5;
}

/**
 * Score EMA trend (0-10 points)
 * 
 * Logic:
 * - Price > EMA20 > EMA50: Strong uptrend (10 pts)
 * - Price < EMA20: Downtrend, risky (3 pts)
 */
function scoreEMATrend(price: number, ema20: number, ema50: number): number {
    let score = 0;

    // Price vs EMA20
    if (price > ema20) {
        score += 5; // Above short-term trend
    } else {
        score += 2;
    }

    // Price vs EMA50
    if (price > ema50) {
        score += 3; // Above long-term trend
    } else {
        score += 1;
    }

    // EMA20 vs EMA50 (golden cross)
    if (ema20 > ema50) {
        score += 2; // Uptrend confirmed
    }

    return Math.min(score, 10);
}

/**
 * Batch calculate scores for multiple stocks
 * @param stocksData Array of enhanced stock data
 * @returns Array of BPJS scores sorted by total score (descending)
 */
export function calculateBatchScores(stocksData: EnhancedStockData[]): BPJSScore[] {
    const scores = stocksData.map(calculateBPJSScore);

    // Sort by total score descending
    return scores.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Filter candidates by minimum score
 * @param scores Array of BPJS scores
 * @param minScore Minimum score threshold (default: 60)
 * @returns Filtered array of scores
 */
export function filterCandidates(scores: BPJSScore[], minScore: number = 60): BPJSScore[] {
    return scores.filter(score => score.totalScore >= minScore);
}

/**
 * Get top N candidates
 * @param scores Array of BPJS scores (should be sorted)
 * @param limit Number of top candidates (default: 10)
 * @returns Top N scores
 */
export function getTopCandidates(scores: BPJSScore[], limit: number = 10): BPJSScore[] {
    return scores.slice(0, limit);
}
