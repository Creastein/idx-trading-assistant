"use client";

import React, { useState, useMemo } from "react";
import { Calculator, AlertTriangle, TrendingUp, Shield, DollarSign } from "lucide-react";

// ============================================================================
// Type Definitions
// ============================================================================

interface Position {
    id: string;
    symbol: string;
    shares: number;
    entryPrice: number;
    stopLoss: number;
    currentPrice: number;
}

interface PositionSizeResult {
    maxShares: number;
    totalInvestment: number;
    maxLoss: number;
    riskAmount: number;
    lotSize: number;
}

interface RiskRewardResult {
    ratio: number;
    riskPercent: number;
    rewardPercent: number;
    breakEvenWinRate: number;
    status: "excellent" | "good" | "warning" | "danger";
}

// ============================================================================
// Constants
// ============================================================================

const IDX_LOT_SIZE = 100;
const IDX_FEES = {
    BUY: 0.0015,
    SELL: 0.0025,
    TOTAL: 0.004,
};
const MAX_PORTFOLIO_RISK = 0.06; // 6%
const MAX_SINGLE_TRADE_RISK = 0.05; // 5%

// ============================================================================
// Helper Functions
// ============================================================================

function formatRupiah(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function calculatePositionSize(
    capital: number,
    riskPercent: number,
    entryPrice: number,
    stopLossPrice: number
): PositionSizeResult {
    if (entryPrice <= 0 || stopLossPrice <= 0 || stopLossPrice >= entryPrice) {
        return { maxShares: 0, totalInvestment: 0, maxLoss: 0, riskAmount: 0, lotSize: 0 };
    }

    const riskAmount = capital * (riskPercent / 100);
    const riskPerShare = entryPrice - stopLossPrice;
    const rawShares = Math.floor(riskAmount / riskPerShare);
    const lotSize = Math.floor(rawShares / IDX_LOT_SIZE);
    const maxShares = lotSize * IDX_LOT_SIZE;
    const totalInvestment = maxShares * entryPrice;
    const buyFees = totalInvestment * IDX_FEES.BUY;
    const maxLoss = (maxShares * riskPerShare) + buyFees + (maxShares * stopLossPrice * IDX_FEES.SELL);

    return {
        maxShares,
        totalInvestment: totalInvestment + buyFees,
        maxLoss,
        riskAmount,
        lotSize,
    };
}

function calculateRiskReward(
    entryPrice: number,
    stopLossPrice: number,
    takeProfitPrice: number
): RiskRewardResult {
    if (entryPrice <= 0 || stopLossPrice <= 0 || takeProfitPrice <= 0) {
        return { ratio: 0, riskPercent: 0, rewardPercent: 0, breakEvenWinRate: 0, status: "danger" };
    }

    const risk = entryPrice - stopLossPrice;
    const reward = takeProfitPrice - entryPrice;
    const ratio = risk > 0 ? reward / risk : 0;
    const riskPercent = (risk / entryPrice) * 100;
    const rewardPercent = (reward / entryPrice) * 100;
    const breakEvenWinRate = ratio > 0 ? (1 / (1 + ratio)) * 100 : 100;

    let status: "excellent" | "good" | "warning" | "danger" = "danger";
    if (ratio >= 3) status = "excellent";
    else if (ratio >= 2) status = "good";
    else if (ratio >= 1.5) status = "warning";

    return { ratio, riskPercent, rewardPercent, breakEvenWinRate, status };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface InputFieldProps {
    label: string;
    value: number | string;
    onChange: (value: number) => void;
    suffix?: string;
    min?: number;
    max?: number;
    step?: number;
}

function InputField({ label, value, onChange, suffix, min = 0, max, step = 1 }: InputFieldProps) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wide">{label}</label>
            <div className="relative">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    min={min}
                    max={max}
                    step={step}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    );
}

function ResultCard({ label, value, subtext, variant = "default" }: {
    label: string;
    value: string;
    subtext?: string;
    variant?: "default" | "success" | "warning" | "danger";
}) {
    const bgColors = {
        default: "bg-gray-800",
        success: "bg-green-900/30 border-green-700",
        warning: "bg-yellow-900/30 border-yellow-700",
        danger: "bg-red-900/30 border-red-700",
    };

    const textColors = {
        default: "text-white",
        success: "text-green-400",
        warning: "text-yellow-400",
        danger: "text-red-400",
    };

    return (
        <div className={`${bgColors[variant]} border border-gray-700 rounded-lg p-3`}>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`text-lg font-bold ${textColors[variant]}`}>{value}</p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
    );
}

// ============================================================================
// Position Size Calculator
// ============================================================================

function PositionSizeCalculator() {
    const [capital, setCapital] = useState<number>(100_000_000);
    const [riskPercent, setRiskPercent] = useState<number>(2);
    const [entryPrice, setEntryPrice] = useState<number>(5000);
    const [stopLossPrice, setStopLossPrice] = useState<number>(4900);

    const result = useMemo(
        () => calculatePositionSize(capital, riskPercent, entryPrice, stopLossPrice),
        [capital, riskPercent, entryPrice, stopLossPrice]
    );

    const isValid = stopLossPrice < entryPrice && entryPrice > 0 && stopLossPrice > 0;
    const isRiskTooHigh = riskPercent > MAX_SINGLE_TRADE_RISK * 100;

    return (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Position Size Calculator</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <InputField
                    label="Capital (IDR)"
                    value={capital}
                    onChange={setCapital}
                    min={0}
                    step={1000000}
                />
                <InputField
                    label="Risk %"
                    value={riskPercent}
                    onChange={setRiskPercent}
                    suffix="%"
                    min={0.1}
                    max={10}
                    step={0.5}
                />
                <InputField
                    label="Entry Price"
                    value={entryPrice}
                    onChange={setEntryPrice}
                    min={0}
                    step={25}
                />
                <InputField
                    label="Stop Loss"
                    value={stopLossPrice}
                    onChange={setStopLossPrice}
                    min={0}
                    step={25}
                />
            </div>

            {!isValid && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-3 p-2 bg-red-900/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Stop loss must be below entry price for long positions</span>
                </div>
            )}

            {isRiskTooHigh && (
                <div className="flex items-center gap-2 text-yellow-400 text-sm mb-3 p-2 bg-yellow-900/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Warning: Risk exceeds recommended 5% per trade</span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <ResultCard
                    label="Max Shares"
                    value={`${result.maxShares.toLocaleString()} (${result.lotSize} lot)`}
                    subtext={`IDX lot = 100 shares`}
                />
                <ResultCard
                    label="Total Investment"
                    value={formatRupiah(result.totalInvestment)}
                    subtext="Including 0.15% buy fee"
                />
                <ResultCard
                    label="Max Loss"
                    value={formatRupiah(result.maxLoss)}
                    variant={result.maxLoss > result.riskAmount * 1.1 ? "danger" : "default"}
                    subtext={`${((result.maxLoss / capital) * 100).toFixed(2)}% of capital`}
                />
                <ResultCard
                    label="Risk Amount"
                    value={formatRupiah(result.riskAmount)}
                    subtext={`${riskPercent}% of capital`}
                />
            </div>
        </div>
    );
}

// ============================================================================
// Risk Reward Analyzer
// ============================================================================

function RiskRewardAnalyzer() {
    const [entryPrice, setEntryPrice] = useState<number>(5000);
    const [stopLossPrice, setStopLossPrice] = useState<number>(4900);
    const [takeProfitPrice, setTakeProfitPrice] = useState<number>(5200);

    const result = useMemo(
        () => calculateRiskReward(entryPrice, stopLossPrice, takeProfitPrice),
        [entryPrice, stopLossPrice, takeProfitPrice]
    );

    const statusColors = {
        excellent: { bg: "bg-green-500", text: "text-green-400", label: "Excellent" },
        good: { bg: "bg-blue-500", text: "text-blue-400", label: "Good" },
        warning: { bg: "bg-yellow-500", text: "text-yellow-400", label: "Acceptable" },
        danger: { bg: "bg-red-500", text: "text-red-400", label: "Poor" },
    };

    const variantMap: Record<typeof result.status, "success" | "warning" | "danger"> = {
        excellent: "success",
        good: "success",
        warning: "warning",
        danger: "danger",
    };

    return (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Risk:Reward Analyzer</h3>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
                <InputField
                    label="Entry"
                    value={entryPrice}
                    onChange={setEntryPrice}
                    min={0}
                    step={25}
                />
                <InputField
                    label="Stop Loss"
                    value={stopLossPrice}
                    onChange={setStopLossPrice}
                    min={0}
                    step={25}
                />
                <InputField
                    label="Take Profit"
                    value={takeProfitPrice}
                    onChange={setTakeProfitPrice}
                    min={0}
                    step={25}
                />
            </div>

            {/* Visual R:R Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>SL: {formatRupiah(stopLossPrice)}</span>
                    <span>Entry: {formatRupiah(entryPrice)}</span>
                    <span>TP: {formatRupiah(takeProfitPrice)}</span>
                </div>
                <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
                    <div
                        className="bg-red-500 h-full transition-all"
                        style={{ width: `${Math.min(50, (result.riskPercent / (result.riskPercent + result.rewardPercent)) * 100 || 50)}%` }}
                    />
                    <div
                        className="bg-green-500 h-full transition-all"
                        style={{ width: `${Math.min(50, (result.rewardPercent / (result.riskPercent + result.rewardPercent)) * 100 || 50)}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs mt-1">
                    <span className="text-red-400">Risk: {result.riskPercent.toFixed(2)}%</span>
                    <span className="text-green-400">Reward: {result.rewardPercent.toFixed(2)}%</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <ResultCard
                    label="R:R Ratio"
                    value={`1:${result.ratio.toFixed(2)}`}
                    variant={variantMap[result.status]}
                    subtext={statusColors[result.status].label}
                />
                <ResultCard
                    label="Break-Even Win Rate"
                    value={`${result.breakEvenWinRate.toFixed(1)}%`}
                    subtext="Minimum to be profitable"
                />
            </div>

            {result.ratio < 1.5 && (
                <div className="flex items-center gap-2 text-red-400 text-sm mt-3 p-2 bg-red-900/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4" />
                    <span>R:R below 1.5:1 is not recommended. Consider adjusting TP/SL.</span>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Portfolio Risk Monitor
// ============================================================================

function PortfolioRiskMonitor() {
    const [capital, setCapital] = useState<number>(100_000_000);
    const [positions, setPositions] = useState<Position[]>([
        { id: "1", symbol: "BBCA", shares: 500, entryPrice: 9500, stopLoss: 9200, currentPrice: 9600 },
        { id: "2", symbol: "BBRI", shares: 1000, entryPrice: 5200, stopLoss: 5000, currentPrice: 5150 },
    ]);

    const portfolioMetrics = useMemo(() => {
        let totalExposure = 0;
        let totalRisk = 0;
        let totalPnL = 0;

        positions.forEach((pos) => {
            const positionValue = pos.shares * pos.currentPrice;
            const entryValue = pos.shares * pos.entryPrice;
            const maxLoss = pos.shares * (pos.entryPrice - pos.stopLoss);

            totalExposure += positionValue;
            totalRisk += maxLoss;
            totalPnL += positionValue - entryValue;
        });

        const riskPercent = (totalRisk / capital) * 100;
        const exposurePercent = (totalExposure / capital) * 100;
        const isOverRisk = riskPercent > MAX_PORTFOLIO_RISK * 100;

        return {
            totalExposure,
            totalRisk,
            totalPnL,
            riskPercent,
            exposurePercent,
            isOverRisk,
            positionCount: positions.length,
        };
    }, [positions, capital]);

    const addPosition = () => {
        const newId = Date.now().toString();
        setPositions([
            ...positions,
            { id: newId, symbol: "", shares: 100, entryPrice: 0, stopLoss: 0, currentPrice: 0 },
        ]);
    };

    const updatePosition = (id: string, field: keyof Position, value: string | number) => {
        setPositions(positions.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    };

    const removePosition = (id: string) => {
        setPositions(positions.filter((p) => p.id !== id));
    };

    return (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Portfolio Risk Monitor</h3>
                </div>
                <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <input
                        type="number"
                        value={capital}
                        onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                        className="w-32 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                        placeholder="Capital"
                    />
                </div>
            </div>

            {/* Risk Alert */}
            {portfolioMetrics.isOverRisk && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                    <div>
                        <p className="font-semibold">⚠️ Portfolio Risk Alert!</p>
                        <p>Total risk ({portfolioMetrics.riskPercent.toFixed(1)}%) exceeds recommended 6% limit.</p>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3 mb-4">
                <ResultCard
                    label="Total Exposure"
                    value={formatRupiah(portfolioMetrics.totalExposure)}
                    subtext={`${portfolioMetrics.exposurePercent.toFixed(1)}% of capital`}
                />
                <ResultCard
                    label="Total Risk"
                    value={formatRupiah(portfolioMetrics.totalRisk)}
                    variant={portfolioMetrics.isOverRisk ? "danger" : "default"}
                    subtext={`${portfolioMetrics.riskPercent.toFixed(1)}% of capital`}
                />
                <ResultCard
                    label="Unrealized P&L"
                    value={formatRupiah(portfolioMetrics.totalPnL)}
                    variant={portfolioMetrics.totalPnL >= 0 ? "success" : "danger"}
                />
                <ResultCard
                    label="Positions"
                    value={portfolioMetrics.positionCount.toString()}
                    subtext="Active holdings"
                />
            </div>

            {/* Positions Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-gray-400 text-xs uppercase border-b border-gray-800">
                            <th className="text-left py-2 px-2">Symbol</th>
                            <th className="text-right py-2 px-2">Shares</th>
                            <th className="text-right py-2 px-2">Entry</th>
                            <th className="text-right py-2 px-2">Stop Loss</th>
                            <th className="text-right py-2 px-2">Current</th>
                            <th className="text-right py-2 px-2">P&L</th>
                            <th className="text-right py-2 px-2">Risk</th>
                            <th className="py-2 px-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {positions.map((pos) => {
                            const pnl = pos.shares * (pos.currentPrice - pos.entryPrice);
                            const risk = pos.shares * (pos.entryPrice - pos.stopLoss);
                            const pnlPercent = ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100;

                            return (
                                <tr key={pos.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                                    <td className="py-2 px-2">
                                        <input
                                            type="text"
                                            value={pos.symbol}
                                            onChange={(e) => updatePosition(pos.id, "symbol", e.target.value.toUpperCase())}
                                            className="w-16 bg-transparent border-b border-gray-700 text-white focus:outline-none focus:border-blue-500"
                                            placeholder="BBCA"
                                        />
                                    </td>
                                    <td className="text-right py-2 px-2">
                                        <input
                                            type="number"
                                            value={pos.shares}
                                            onChange={(e) => updatePosition(pos.id, "shares", parseInt(e.target.value) || 0)}
                                            className="w-16 bg-transparent border-b border-gray-700 text-white text-right focus:outline-none focus:border-blue-500"
                                            step={100}
                                        />
                                    </td>
                                    <td className="text-right py-2 px-2">
                                        <input
                                            type="number"
                                            value={pos.entryPrice}
                                            onChange={(e) => updatePosition(pos.id, "entryPrice", parseInt(e.target.value) || 0)}
                                            className="w-20 bg-transparent border-b border-gray-700 text-white text-right focus:outline-none focus:border-blue-500"
                                        />
                                    </td>
                                    <td className="text-right py-2 px-2">
                                        <input
                                            type="number"
                                            value={pos.stopLoss}
                                            onChange={(e) => updatePosition(pos.id, "stopLoss", parseInt(e.target.value) || 0)}
                                            className="w-20 bg-transparent border-b border-gray-700 text-white text-right focus:outline-none focus:border-blue-500"
                                        />
                                    </td>
                                    <td className="text-right py-2 px-2">
                                        <input
                                            type="number"
                                            value={pos.currentPrice}
                                            onChange={(e) => updatePosition(pos.id, "currentPrice", parseInt(e.target.value) || 0)}
                                            className="w-20 bg-transparent border-b border-gray-700 text-white text-right focus:outline-none focus:border-blue-500"
                                        />
                                    </td>
                                    <td className={`text-right py-2 px-2 font-medium ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                        {formatRupiah(pnl)}
                                        <span className="text-xs ml-1">({pnlPercent.toFixed(1)}%)</span>
                                    </td>
                                    <td className="text-right py-2 px-2 text-yellow-400">
                                        {formatRupiah(risk)}
                                    </td>
                                    <td className="py-2 px-2">
                                        <button
                                            onClick={() => removePosition(pos.id)}
                                            className="text-red-400 hover:text-red-300 text-xs"
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <button
                onClick={addPosition}
                className="mt-3 w-full py-2 border border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors text-sm"
            >
                + Add Position
            </button>

            {/* Disclaimer */}
            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-500">
                    ⚠️ <strong>Disclaimer:</strong> This is an analysis tool, not financial advice.
                    Never risk more than you can afford to lose. Always verify calculations independently.
                </p>
            </div>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function RiskManagement() {
    return (
        <div className="space-y-6 p-4 max-w-4xl mx-auto">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Risk Management Tools</h2>
                <p className="text-gray-400 text-sm">
                    Calculate position sizes, analyze risk:reward ratios, and monitor portfolio exposure
                </p>
            </div>

            <PositionSizeCalculator />
            <RiskRewardAnalyzer />
            <PortfolioRiskMonitor />
        </div>
    );
}
