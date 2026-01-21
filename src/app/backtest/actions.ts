"use server";

import { runBacktest, type BacktestResult } from "@/backend/analysis/backtesting";

export async function executeBacktest(
    symbol: string,
    strategy: string,
    days: number
): Promise<BacktestResult> {
    // Validate Strategy
    const validStrategies = ["RSI", "MACD", "BOLLINGER", "MULTI"];
    if (!validStrategies.includes(strategy)) {
        throw new Error("Invalid strategy selected");
    }

    // Determine mode based on days (heuristic)
    // Shorter periods usually imply scalping intent, longer swing intent
    // This mostly affects how `runBacktest` might set defaults if customDays wasn't used,
    // but since we pass customDays, it's less critical.
    const mode = days <= 30 ? "scalping" : "swing";

    try {
        const result = await runBacktest(
            symbol,
            strategy as "RSI" | "MACD" | "BOLLINGER" | "MULTI",
            mode,
            days
        );
        return result;
    } catch (error) {
        console.error("Backtest failed:", error);
        throw new Error(error instanceof Error ? error.message : "Backtest execution failed");
    }
}
