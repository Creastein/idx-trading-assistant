"use client";

import { EnhancedStockData } from "@/shared/types";
import { motion } from "framer-motion";

interface FinancialsPanelProps {
    financials: NonNullable<EnhancedStockData['financials']>;
}

export function FinancialsPanel({ financials }: FinancialsPanelProps) {
    const { incomeStatement, profitMargins, revenueGrowth } = financials;
    if (!incomeStatement || incomeStatement.length === 0) {
        return <div className="text-center text-muted-foreground py-8">No financial data available</div>;
    }

    // Find max value for scaling chart
    const maxVal = Math.max(...incomeStatement.map(i => Math.max(i.revenue, i.netIncome)));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <span>💵</span> Financial Performance
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Annual Revenue & Net Income (Last {incomeStatement.length} Years)</p>
                </div>
                <div className="flex gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500/80 rounded-sm"></div>
                        <span>Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500/80 rounded-sm"></div>
                        <span>Net Income</span>
                    </div>
                </div>
            </div>

            {/* Bar Chart Container */}
            <div className="h-48 flex items-end justify-between gap-4 px-2">
                {incomeStatement.map((item, idx) => {
                    const revenueHeight = (item.revenue / maxVal) * 100;
                    const incomeHeight = (item.netIncome / maxVal) * 100;
                    const year = item.date.split('-')[0];

                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                            {/* Bars */}
                            <div className="w-full flex justify-center items-end gap-1 h-32">
                                {/* Revenue Bar */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${revenueHeight}%` }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    className="w-1/3 bg-blue-500/60 hover:bg-blue-500 rounded-t-sm transition-colors relative"
                                >
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-background border px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        Rev: {(item.revenue / 1e12).toFixed(1)}T
                                    </div>
                                </motion.div>

                                {/* Income Bar */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${incomeHeight}%` }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 + 0.05 }}
                                    className="w-1/3 bg-green-500/60 hover:bg-green-500 rounded-t-sm transition-colors relative"
                                >
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-background border px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        Net: {(item.netIncome / 1e12).toFixed(1)}T
                                    </div>
                                </motion.div>
                            </div>

                            {/* Year Label */}
                            <span className="text-xs text-muted-foreground font-mono">{year}</span>
                        </div>
                    );
                })}
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/20">
                <div className="bg-secondary/10 p-3 rounded-lg">
                    <p className="text-[10px] uppercase text-muted-foreground mb-1">Profit Margin</p>
                    <p className={`text-lg font-mono font-bold ${profitMargins >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {(profitMargins * 100).toFixed(2)}%
                    </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-lg">
                    <p className="text-[10px] uppercase text-muted-foreground mb-1">Revenue Growth</p>
                    <p className={`text-lg font-mono font-bold ${revenueGrowth >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {(revenueGrowth * 100).toFixed(2)}%
                    </p>
                </div>
            </div>
        </div>
    );
}
