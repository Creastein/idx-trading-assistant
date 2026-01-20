"use client";

import dynamic from "next/dynamic";

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
    // Ensure symbol has IDX: prefix if needed, though yahoo finance uses .JK
    // TradingView usually needs IDX: without .JK for Indonesian stocks
    // let's format it.
    const formatSymbol = (sym: string) => {
        const createSymbol = sym.replace(".JK", "");
        return `IDX:${createSymbol}`;
    };

    const formattedSymbol = formatSymbol(symbol);

    return (
        <div className="w-full h-full relative bg-card">
            <AdvancedRealTimeChart
                theme="dark"
                autosize={true}
                // height and width props are ignored if autosize are true, but for container:
                // We'll set autosize true because we want it to fill the h-full parent. 
                // Wait, previous fix was disabling autosize to fix rendering. 
                // Converting back to autosize might be risky if container height isn't set. 
                // Let's stick to autosize=true BUT ensure parent has explicit height.
                // Actually to be safe, let's keep autosize=false and receive height or just use 100% if library supports it.
                // The library 'react-ts-tradingview-widgets' autosize prop usually works best for responsive.
                // Let's try autosize=true again with the new layout which has fixed grid height.

                // REVISION: The user said "trading view is showing now" after I set autosize=false. 
                // So I should keep autosize=false BUT set height="100%".
                height="100%"
                width="100%"
                symbol={formattedSymbol}
                interval={interval}
                timezone="Asia/Jakarta"
                style="1" // 1 = Candles
                locale="id"
                toolbar_bg="#0f172a"
                enable_publishing={false}
                hide_side_toolbar={false}
                allow_symbol_change={false}
                container_id={`tradingview_${formattedSymbol}`}
            />
        </div>
    );
}
