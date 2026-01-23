"use client";

import { useEffect, useState } from "react";
import { TradingMode } from "@/shared/types";
import { REFRESH_INTERVAL } from "@/shared/constants";

interface DataFreshnessIndicatorProps {
    lastUpdated: number | null;
    tradingMode: TradingMode;
    isRefreshing: boolean;
    onRefresh?: () => void;
}

export default function DataFreshnessIndicator({
    lastUpdated,
    tradingMode,
    isRefreshing,
    onRefresh,
}: DataFreshnessIndicatorProps) {
    const [timeAgo, setTimeAgo] = useState<string>("Just now");
    const [nextRefreshIn, setNextRefreshIn] = useState<number>(0);

    const refreshInterval =
        tradingMode === "SCALPING"
            ? REFRESH_INTERVAL.SCALPING
            : REFRESH_INTERVAL.SWING;

    useEffect(() => {
        if (!lastUpdated) return;

        const updateTimeAgo = () => {
            const seconds = Math.floor((Date.now() - lastUpdated) / 1000);
            if (seconds < 5) setTimeAgo("Just now");
            else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
            else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
            else setTimeAgo(`${Math.floor(seconds / 3600)}h ago`);

            // Calculate next refresh countdown
            const elapsed = Date.now() - lastUpdated;
            const remaining = Math.max(0, refreshInterval - elapsed);
            setNextRefreshIn(Math.ceil(remaining / 1000));
        };

        updateTimeAgo();
        const interval = setInterval(updateTimeAgo, 1000);

        return () => clearInterval(interval);
    }, [lastUpdated, refreshInterval]);

    if (!lastUpdated) return null;

    return (
        <div className="flex items-center gap-3 text-xs">
            {/* Refresh Status Indicator */}
            <div className="flex items-center gap-1.5">
                <div
                    className={`w-2 h-2 rounded-full ${isRefreshing
                            ? "bg-blue-500 animate-pulse"
                            : "bg-green-500"
                        }`}
                />
                <span className="text-muted-foreground">
                    {isRefreshing ? "Refreshing..." : timeAgo}
                </span>
            </div>

            {/* Next Refresh Countdown */}
            {!isRefreshing && nextRefreshIn > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground/70">
                    <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span>
                        Next refresh: {nextRefreshIn}s
                    </span>
                </div>
            )}

            {/* Manual Refresh Button */}
            {onRefresh && (
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="ml-1 p-1 rounded hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh now"
                >
                    <svg
                        className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </button>
            )}

            {/* Mode Badge */}
            <div
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tradingMode === "SCALPING"
                        ? "bg-profit/10 text-profit"
                        : "bg-chart-2/10 text-chart-2"
                    }`}
            >
                {tradingMode === "SCALPING" ? "⚡ 30s refresh" : "🌊 5m refresh"}
            </div>
        </div>
    );
}
