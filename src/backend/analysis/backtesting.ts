/**
 * Simple Backtesting Framework for IDX Trading Assistant
 * 
 * Validates strategy performance on historical data with:
 * - RSI, MACD, Bollinger Bands, Multi-indicator strategies
 * - IDX transaction fees (0.15% buy, 0.25% sell)
 * - Key metrics: Win rate, Profit factor, Max drawdown, Sharpe ratio
 */

import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();
import {
    calculateRSI,
    calculateMACD,
    calculateBollingerBands,
    type IndicatorResult,
    type MACDResult,
    type BollingerBandsResult,
} from "./indicators";

// ============================================================================
// Type Definitions
// ============================================================================

export interface Trade {
    type: "BUY" | "SELL";
    date: string;
    price: number;
    shares: number;
    value: number;
    fees: number;
    profit?: number;
    profitPercent?: number;
    reason: string;
}

export interface BacktestResult {
    strategy: string;
    symbol: string;
    period: { start: string; end: string };
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalReturn: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    trades: Trade[];
    buyAndHoldReturn: number;
    outperformsBuyHold: boolean;
    isViable: boolean;
}

export interface StrategyRanking {
    rankings: {
        rank: number;
        strategy: string;
        score: number;
        winRate: number;
        totalReturn: number;
        sharpeRatio: number;
        isViable: boolean;
    }[];
    bestStrategy: string;
    worstStrategy: string;
}

interface HistoricalQuote {
    date: Date;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
}

interface ChartResult {
    quotes: HistoricalQuote[];
}

type StrategyType = "RSI" | "MACD" | "BOLLINGER" | "MULTI";

// ============================================================================
// Constants
// ============================================================================

const IDX_FEES = {
    BUY: 0.0015,   // 0.15%
    SELL: 0.0025,  // 0.25%
};

const INITIAL_CAPITAL = 100_000_000; // 100M IDR
const POSITION_SIZE = 0.95; // 95% of available capital per trade
const STOP_LOSS_PERCENT = 0.02; // 2% stop loss

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fetch historical data for backtesting
 */
async function fetchHistoricalData(
    symbol: string,
    daysBack: number
): Promise<HistoricalQuote[]> {
    try {
        const symbolWithSuffix = symbol.toUpperCase().endsWith(".JK")
            ? symbol
            : `${symbol.toUpperCase()}.JK`;

        const endDate = new Date();
        const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

        const chartResult = await yahooFinance.chart(symbolWithSuffix, {
            period1: startDate,
            period2: endDate,
            interval: "1d",
        }) as ChartResult;

        return chartResult.quotes.filter(
            (q) => q.close !== null && q.date !== null
        );
    } catch (error) {
        console.error(`Failed to fetch data for ${symbol}:`, error);
        return [];
    }
}

/**
 * Calculate trading fees
 */
function calculateFees(value: number, type: "BUY" | "SELL"): number {
    return value * (type === "BUY" ? IDX_FEES.BUY : IDX_FEES.SELL);
}

/**
 * Calculate Sharpe Ratio
 */
function calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
        returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // Annualized (assuming daily returns)
    const annualizedReturn = avgReturn * 252;
    const annualizedStdDev = stdDev * Math.sqrt(252);
    const riskFreeRate = 0.06; // 6% annual (Indonesia rate)

    return (annualizedReturn - riskFreeRate) / annualizedStdDev;
}

/**
 * Calculate Maximum Drawdown
 */
function calculateMaxDrawdown(equityCurve: number[]): number {
    if (equityCurve.length === 0) return 0;

    let maxDrawdown = 0;
    let peak = equityCurve[0];

    for (const value of equityCurve) {
        if (value > peak) peak = value;
        const drawdown = (peak - value) / peak;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return maxDrawdown * 100;
}

// ============================================================================
// Strategy Implementations
// ============================================================================

interface StrategySignal {
    action: "BUY" | "SELL" | "HOLD";
    reason: string;
}

/**
 * RSI Strategy: Buy when RSI < 30, Sell when RSI > 70
 */
function rsiStrategy(
    rsi: IndicatorResult | null,
    index: number,
    inPosition: boolean,
    entryPrice: number,
    currentPrice: number
): StrategySignal {
    if (!rsi || index >= rsi.values.length) {
        return { action: "HOLD", reason: "Insufficient data" };
    }

    const rsiValue = rsi.values[index];

    // Stop loss check
    if (inPosition && currentPrice <= entryPrice * (1 - STOP_LOSS_PERCENT)) {
        return { action: "SELL", reason: `Stop loss triggered at ${STOP_LOSS_PERCENT * 100}%` };
    }

    if (!inPosition && rsiValue < 30) {
        return { action: "BUY", reason: `RSI oversold at ${rsiValue.toFixed(2)}` };
    }

    if (inPosition && rsiValue > 70) {
        return { action: "SELL", reason: `RSI overbought at ${rsiValue.toFixed(2)}` };
    }

    return { action: "HOLD", reason: "No signal" };
}

/**
 * MACD Strategy: Buy on bullish crossover, Sell on bearish crossover
 */
function macdStrategy(
    macd: MACDResult | null,
    index: number,
    inPosition: boolean,
    entryPrice: number,
    currentPrice: number
): StrategySignal {
    if (!macd || index >= macd.histogram.length || index < 1) {
        return { action: "HOLD", reason: "Insufficient data" };
    }

    // Stop loss check
    if (inPosition && currentPrice <= entryPrice * (1 - STOP_LOSS_PERCENT)) {
        return { action: "SELL", reason: `Stop loss triggered at ${STOP_LOSS_PERCENT * 100}%` };
    }

    const currentHist = macd.histogram[index];
    const prevHist = macd.histogram[index - 1];

    // Bullish crossover
    if (!inPosition && prevHist < 0 && currentHist >= 0) {
        return { action: "BUY", reason: "Bullish MACD crossover" };
    }

    // Bearish crossover
    if (inPosition && prevHist > 0 && currentHist <= 0) {
        return { action: "SELL", reason: "Bearish MACD crossover" };
    }

    return { action: "HOLD", reason: "No signal" };
}

/**
 * Bollinger Bands Strategy: Buy at lower band, Sell at upper band
 */
function bollingerStrategy(
    bb: BollingerBandsResult | null,
    index: number,
    inPosition: boolean,
    entryPrice: number,
    currentPrice: number
): StrategySignal {
    if (!bb || index >= bb.lower.length) {
        return { action: "HOLD", reason: "Insufficient data" };
    }

    // Stop loss check
    if (inPosition && currentPrice <= entryPrice * (1 - STOP_LOSS_PERCENT)) {
        return { action: "SELL", reason: `Stop loss triggered at ${STOP_LOSS_PERCENT * 100}%` };
    }

    const lowerBand = bb.lower[index];
    const upperBand = bb.upper[index];

    if (!inPosition && currentPrice <= lowerBand) {
        return { action: "BUY", reason: `Price at lower Bollinger Band (${lowerBand.toFixed(0)})` };
    }

    if (inPosition && currentPrice >= upperBand) {
        return { action: "SELL", reason: `Price at upper Bollinger Band (${upperBand.toFixed(0)})` };
    }

    return { action: "HOLD", reason: "No signal" };
}

/**
 * Multi-indicator Strategy: Requires 2+ indicators to agree
 */
function multiIndicatorStrategy(
    rsi: IndicatorResult | null,
    macd: MACDResult | null,
    bb: BollingerBandsResult | null,
    index: number,
    inPosition: boolean,
    entryPrice: number,
    currentPrice: number
): StrategySignal {
    // Stop loss check
    if (inPosition && currentPrice <= entryPrice * (1 - STOP_LOSS_PERCENT)) {
        return { action: "SELL", reason: `Stop loss triggered at ${STOP_LOSS_PERCENT * 100}%` };
    }

    let buySignals = 0;
    let sellSignals = 0;
    const reasons: string[] = [];

    // RSI signal
    if (rsi && index < rsi.values.length) {
        const rsiValue = rsi.values[index];
        if (rsiValue < 30) {
            buySignals++;
            reasons.push(`RSI oversold (${rsiValue.toFixed(2)})`);
        } else if (rsiValue > 70) {
            sellSignals++;
            reasons.push(`RSI overbought (${rsiValue.toFixed(2)})`);
        }
    }

    // MACD signal
    if (macd && index < macd.histogram.length && index >= 1) {
        const currentHist = macd.histogram[index];
        const prevHist = macd.histogram[index - 1];
        if (prevHist < 0 && currentHist >= 0) {
            buySignals++;
            reasons.push("Bullish MACD crossover");
        } else if (prevHist > 0 && currentHist <= 0) {
            sellSignals++;
            reasons.push("Bearish MACD crossover");
        }
    }

    // Bollinger Bands signal
    if (bb && index < bb.lower.length) {
        if (currentPrice <= bb.lower[index]) {
            buySignals++;
            reasons.push("Price at lower BB");
        } else if (currentPrice >= bb.upper[index]) {
            sellSignals++;
            reasons.push("Price at upper BB");
        }
    }

    // Require 2+ signals to agree
    if (!inPosition && buySignals >= 2) {
        return { action: "BUY", reason: `Multi-indicator BUY: ${reasons.join(", ")}` };
    }

    if (inPosition && sellSignals >= 2) {
        return { action: "SELL", reason: `Multi-indicator SELL: ${reasons.join(", ")}` };
    }

    return { action: "HOLD", reason: "Insufficient signal confluence" };
}

// ============================================================================
// Main Backtesting Function
// ============================================================================

/**
 * Run backtest for a specific strategy
 */
export async function runBacktest(
    symbol: string,
    strategy: StrategyType,
    mode: "scalping" | "swing",
    customDays?: number
): Promise<BacktestResult> {
    const daysBack = customDays || (mode === "scalping" ? 30 : 90);
    const historical = await fetchHistoricalData(symbol, daysBack);

    if (historical.length < 30) {
        throw new Error(`Insufficient data for backtest: ${historical.length} days`);
    }

    // Extract price data
    const closes = historical
        .map((q) => q.close)
        .filter((c): c is number => c !== null);

    // Calculate indicators
    const rsi = calculateRSI(closes);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes);

    // Initialize trading state
    let capital = INITIAL_CAPITAL;
    let shares = 0;
    let entryPrice = 0;
    let inPosition = false;
    const trades: Trade[] = [];
    const equityCurve: number[] = [capital];
    const dailyReturns: number[] = [];

    // Calculate indicator offset (indicators need warm-up period)
    const startIndex = 26; // MACD needs 26 periods minimum

    // Run backtest
    for (let i = startIndex; i < closes.length; i++) {
        const currentPrice = closes[i];
        const date = historical[i].date.toISOString().split("T")[0];

        // Align indicator index
        const rsiIndex = rsi ? i - (closes.length - rsi.values.length) : -1;
        const macdIndex = macd ? i - (closes.length - macd.histogram.length) : -1;
        const bbIndex = bb ? i - (closes.length - bb.lower.length) : -1;

        // Get strategy signal
        let signal: StrategySignal;

        switch (strategy) {
            case "RSI":
                signal = rsiStrategy(rsi, rsiIndex, inPosition, entryPrice, currentPrice);
                break;
            case "MACD":
                signal = macdStrategy(macd, macdIndex, inPosition, entryPrice, currentPrice);
                break;
            case "BOLLINGER":
                signal = bollingerStrategy(bb, bbIndex, inPosition, entryPrice, currentPrice);
                break;
            case "MULTI":
                signal = multiIndicatorStrategy(rsi, macd, bb, Math.min(rsiIndex, macdIndex, bbIndex), inPosition, entryPrice, currentPrice);
                break;
            default:
                signal = { action: "HOLD", reason: "Unknown strategy" };
        }

        // Execute trades
        if (signal.action === "BUY" && !inPosition) {
            const buyValue = capital * POSITION_SIZE;
            const fees = calculateFees(buyValue, "BUY");
            const netValue = buyValue - fees;
            shares = Math.floor(netValue / currentPrice);
            entryPrice = currentPrice;
            capital -= shares * currentPrice + fees;
            inPosition = true;

            trades.push({
                type: "BUY",
                date,
                price: currentPrice,
                shares,
                value: shares * currentPrice,
                fees,
                reason: signal.reason,
            });
        } else if (signal.action === "SELL" && inPosition) {
            const sellValue = shares * currentPrice;
            const fees = calculateFees(sellValue, "SELL");
            const profit = sellValue - fees - (shares * entryPrice);
            const profitPercent = (profit / (shares * entryPrice)) * 100;

            capital += sellValue - fees;

            trades.push({
                type: "SELL",
                date,
                price: currentPrice,
                shares,
                value: sellValue,
                fees,
                profit,
                profitPercent,
                reason: signal.reason,
            });

            shares = 0;
            entryPrice = 0;
            inPosition = false;
        }

        // Track equity curve
        const currentEquity = capital + (inPosition ? shares * currentPrice : 0);
        equityCurve.push(currentEquity);

        // Track daily returns
        if (equityCurve.length > 1) {
            const prevEquity = equityCurve[equityCurve.length - 2];
            const dailyReturn = (currentEquity - prevEquity) / prevEquity;
            dailyReturns.push(dailyReturn);
        }
    }

    // Close any open position at end
    if (inPosition) {
        const finalPrice = closes[closes.length - 1];
        const sellValue = shares * finalPrice;
        const fees = calculateFees(sellValue, "SELL");
        const profit = sellValue - fees - (shares * entryPrice);
        const profitPercent = (profit / (shares * entryPrice)) * 100;

        capital += sellValue - fees;

        trades.push({
            type: "SELL",
            date: historical[historical.length - 1].date.toISOString().split("T")[0],
            price: finalPrice,
            shares,
            value: sellValue,
            fees,
            profit,
            profitPercent,
            reason: "End of backtest period",
        });
    }

    // Calculate metrics
    const sellTrades = trades.filter((t) => t.type === "SELL" && t.profit !== undefined);
    const winningTrades = sellTrades.filter((t) => (t.profit || 0) > 0);
    const losingTrades = sellTrades.filter((t) => (t.profit || 0) <= 0);

    const totalWins = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0));

    const winProfits = winningTrades.map((t) => t.profit || 0);
    const lossProfits = losingTrades.map((t) => Math.abs(t.profit || 0));

    // Buy and hold comparison
    const buyAndHoldReturn =
        ((closes[closes.length - 1] - closes[startIndex]) / closes[startIndex]) * 100;

    const totalReturn = ((capital - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;

    const result: BacktestResult = {
        strategy,
        symbol: symbol.toUpperCase().replace(".JK", ""),
        period: {
            start: historical[startIndex].date.toISOString().split("T")[0],
            end: historical[historical.length - 1].date.toISOString().split("T")[0],
        },
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate: sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0,
        totalReturn,
        profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
        maxDrawdown: calculateMaxDrawdown(equityCurve),
        sharpeRatio: calculateSharpeRatio(dailyReturns),
        averageWin: winProfits.length > 0 ? winProfits.reduce((a, b) => a + b, 0) / winProfits.length : 0,
        averageLoss: lossProfits.length > 0 ? lossProfits.reduce((a, b) => a + b, 0) / lossProfits.length : 0,
        largestWin: winProfits.length > 0 ? Math.max(...winProfits) : 0,
        largestLoss: lossProfits.length > 0 ? Math.max(...lossProfits) : 0,
        trades,
        buyAndHoldReturn,
        outperformsBuyHold: totalReturn > buyAndHoldReturn,
        isViable: (winningTrades.length / (sellTrades.length || 1)) >= 0.5 && calculateSharpeRatio(dailyReturns) > 0,
    };

    return result;
}

/**
 * Run all strategies and generate ranking
 */
export async function runAllStrategies(
    symbol: string,
    mode: "scalping" | "swing"
): Promise<{
    results: BacktestResult[];
    ranking: StrategyRanking;
}> {
    const strategies: StrategyType[] = ["RSI", "MACD", "BOLLINGER", "MULTI"];
    const results: BacktestResult[] = [];

    for (const strategy of strategies) {
        try {
            const result = await runBacktest(symbol, strategy, mode);
            results.push(result);
        } catch (error) {
            console.error(`Failed to backtest ${strategy}:`, error);
        }
    }

    // Calculate composite score for ranking
    const rankings = results.map((r) => {
        // Score formula: weighted combination of metrics
        const winRateScore = r.winRate / 100;
        const returnScore = Math.max(0, r.totalReturn) / 100;
        const sharpeScore = Math.max(0, r.sharpeRatio);
        const drawdownPenalty = r.maxDrawdown / 100;

        const score =
            winRateScore * 0.3 +
            returnScore * 0.3 +
            sharpeScore * 0.3 -
            drawdownPenalty * 0.1;

        return {
            rank: 0,
            strategy: r.strategy,
            score: Math.round(score * 100) / 100,
            winRate: r.winRate,
            totalReturn: r.totalReturn,
            sharpeRatio: r.sharpeRatio,
            isViable: r.isViable,
        };
    });

    // Sort by score
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((r, i) => (r.rank = i + 1));

    return {
        results,
        ranking: {
            rankings,
            bestStrategy: rankings[0]?.strategy || "NONE",
            worstStrategy: rankings[rankings.length - 1]?.strategy || "NONE",
        },
    };
}

/**
 * Quick strategy comparison summary
 */
export async function getStrategyComparison(
    symbol: string,
    mode: "scalping" | "swing"
): Promise<string> {
    const { results, ranking } = await runAllStrategies(symbol, mode);

    let summary = `## Strategy Comparison for ${symbol.toUpperCase()} (${mode})\n\n`;
    summary += `| Rank | Strategy | Win Rate | Return | Sharpe | Viable? |\n`;
    summary += `|------|----------|----------|--------|--------|----------|\n`;

    for (const r of ranking.rankings) {
        const viable = r.isViable ? "✅" : "❌";
        summary += `| ${r.rank} | ${r.strategy} | ${r.winRate.toFixed(1)}% | ${r.totalReturn.toFixed(2)}% | ${r.sharpeRatio.toFixed(2)} | ${viable} |\n`;
    }

    summary += `\n**Recommendation**: ${ranking.bestStrategy}\n`;

    const bestResult = results.find((r) => r.strategy === ranking.bestStrategy);
    if (bestResult) {
        summary += `- Win Rate: ${bestResult.winRate.toFixed(1)}%\n`;
        summary += `- Total Return: ${bestResult.totalReturn.toFixed(2)}%\n`;
        summary += `- Buy & Hold: ${bestResult.buyAndHoldReturn.toFixed(2)}%\n`;
        summary += `- Outperforms B&H: ${bestResult.outperformsBuyHold ? "Yes ✅" : "No ❌"}\n`;
    }

    return summary;
}
