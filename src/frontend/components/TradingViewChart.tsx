"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

// Dynamically import the AdvancedRealTimeChart to avoid SSR issues
const AdvancedRealTimeChart = dynamic(
    () =>
        import("react-ts-tradingview-widgets").then((w) => w.AdvancedRealTimeChart),
    { ssr: false }
);

type ChartInterval = "1" | "3" | "5" | "15" | "30" | "60" | "120" | "180" | "240" | "D" | "W";

interface TradingViewChartProps {
    symbol: string;
    interval?: ChartInterval;
}

export default function TradingViewChart({ symbol, interval = "D" }: TradingViewChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Format symbol for TradingView (IDX:SYMBOL)
    const formatSymbol = (sym: string) => {
        const cleanSymbol = sym.replace(".JK", "");
        return `IDX:${cleanSymbol}`;
    };

    const formattedSymbol = formatSymbol(symbol);

    useEffect(() => {
        // Ensure container has proper height
        if (containerRef.current) {
            containerRef.current.style.minHeight = "600px";
        }
    }, []);

    return (
        <div
            ref={containerRef}
            className="w-full h-full"
            style={{ minHeight: "600px", height: "100%" }}
        >
            <AdvancedRealTimeChart
                theme="dark"
                autosize={true}
                symbol={formattedSymbol}
                interval={interval}
                timezone="Asia/Jakarta"
                style="1"
                locale="id"
                toolbar_bg="#0f172a"
                enable_publishing={false}
                hide_side_toolbar={false}
                allow_symbol_change={false}
                container_id={`tradingview_${formattedSymbol.replace(":", "_")}`}
            />
        </div>
    );
}
