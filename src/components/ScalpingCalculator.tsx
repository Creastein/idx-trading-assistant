"use client";

import { useState, useEffect } from "react";

interface ScalpingCalculatorProps {
    currentPrice: number;
}

export default function ScalpingCalculator({ currentPrice }: ScalpingCalculatorProps) {
    const [entryPrice, setEntryPrice] = useState<string>(currentPrice.toString());
    const [lots, setLots] = useState<string>("1");
    const [tpPercent, setTpPercent] = useState<string>("2.0");
    const [slPercent, setSlPercent] = useState<string>("1.0");

    // Constants for IDX
    const FEE_BUY = 0.0015; // 0.15%
    const FEE_SELL = 0.0025; // 0.25%
    const TOTAL_FEE = FEE_BUY + FEE_SELL;

    useEffect(() => {
        if (currentPrice) {
            setEntryPrice(currentPrice.toString());
        }
    }, [currentPrice]);

    const calculate = () => {
        const entry = parseFloat(entryPrice) || 0;
        const lotCount = parseFloat(lots) || 0;
        const tpPct = parseFloat(tpPercent) || 0;
        const slPct = parseFloat(slPercent) || 0;

        if (entry === 0) return null;

        const shares = lotCount * 100;
        const modal = entry * shares;
        const feeBuyRp = modal * FEE_BUY;

        // Target Calculation
        const targetPrice = Math.round(entry * (1 + tpPct / 100));
        const grossSaleTP = targetPrice * shares;
        const feeSellTP = grossSaleTP * FEE_SELL;
        const netProfit = grossSaleTP - modal - feeBuyRp - feeSellTP;

        // Stop Consideration
        const stopPrice = Math.round(entry * (1 - slPct / 100));
        const grossSaleSL = stopPrice * shares;
        const feeSellSL = grossSaleSL * FEE_SELL;
        const netLoss = grossSaleSL - modal - feeBuyRp - feeSellSL;

        // Break Even point (approx)
        const breakEvenPrice = Math.ceil((entry * (1 + FEE_BUY)) / (1 - FEE_SELL));

        return {
            modal,
            targetPrice,
            stopPrice,
            netProfit,
            netLoss,
            breakEvenPrice,
            rewardRisk: Math.abs(netProfit / netLoss).toFixed(2)
        };
    };

    const result = calculate();

    return (
        <div className="h-full overflow-auto p-4 space-y-6">
            <div className="space-y-4">
                {/* Inputs */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] text-muted-foreground font-mono uppercase mb-1">Entry Price</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">Rp</span>
                            <input
                                type="number"
                                value={entryPrice}
                                onChange={(e) => setEntryPrice(e.target.value)}
                                className="w-full bg-secondary/50 border border-border rounded-lg py-2 pl-8 pr-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] text-muted-foreground font-mono uppercase mb-1">Lots</label>
                        <input
                            type="number"
                            value={lots}
                            onChange={(e) => setLots(e.target.value)}
                            className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] text-muted-foreground font-mono uppercase mb-1">Take Profit %</label>
                        <input
                            type="number"
                            step="0.1"
                            value={tpPercent}
                            onChange={(e) => setTpPercent(e.target.value)}
                            className="w-full bg-profit/10 border border-profit/30 text-profit rounded-lg py-2 px-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-profit/50"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-muted-foreground font-mono uppercase mb-1">Stop Loss %</label>
                        <input
                            type="number"
                            step="0.1"
                            value={slPercent}
                            onChange={(e) => setSlPercent(e.target.value)}
                            className="w-full bg-loss/10 border border-loss/30 text-loss rounded-lg py-2 px-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-loss/50"
                        />
                    </div>
                </div>
            </div>

            {/* Results */}
            {result && (
                <div className="space-y-4 bg-secondary/20 rounded-xl p-4 border border-border">
                    <div className="flex justify-between items-center pb-2 border-b border-dashed border-border">
                        <span className="text-xs text-muted-foreground">Capital Required</span>
                        <span className="font-mono text-sm text-foreground">Rp {result.modal.toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-2">
                        <div>
                            <span className="text-[10px] text-profit uppercase block mb-1">Target (TP)</span>
                            <div className="text-xl font-bold font-mono text-profit">
                                {result.targetPrice}
                            </div>
                            <div className="text-xs text-profit/80 font-mono">
                                +Rp {Math.round(result.netProfit).toLocaleString()}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-loss uppercase block mb-1">Stop (SL)</span>
                            <div className="text-xl font-bold font-mono text-loss">
                                {result.stopPrice}
                            </div>
                            <div className="text-xs text-loss/80 font-mono">
                                -Rp {Math.round(Math.abs(result.netLoss)).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-dashed border-border flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Break Even: <span className="text-foreground font-mono">{result.breakEvenPrice}</span></span>
                        <span className="text-muted-foreground">R:R <span className="text-foreground font-mono">1:{result.rewardRisk}</span></span>
                    </div>
                </div>
            )}

            <p className="text-[10px] text-muted-foreground/50 text-center italic">
                *Fees estimated: Buy 0.15%, Sell 0.25%
            </p>
        </div>
    );
}
