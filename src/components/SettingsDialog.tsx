"use client";

import React, { useState, useEffect } from "react";
import { useSettings } from "./SettingsContext";
import { Settings, X, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

export function SettingsDialog() {
    const { capital, riskPercentage, updateSettings, resetSettings } = useSettings();
    const [isOpen, setIsOpen] = useState(false);

    // Local state for inputs to allow smooth typing before saving/validating
    const [localCapital, setLocalCapital] = useState(capital.toString());
    const [localRisk, setLocalRisk] = useState(riskPercentage.toString());

    // Sync local state when open or when context updates (external change)
    useEffect(() => {
        if (isOpen) {
            setLocalCapital(capital.toString());
            setLocalRisk(riskPercentage.toString());
        }
    }, [isOpen, capital, riskPercentage]);

    const handleSave = () => {
        const newCapital = parseFloat(localCapital);
        const newRisk = parseFloat(localRisk);

        const errors = [];
        if (isNaN(newCapital) || newCapital < 1_000_000 || newCapital > 100_000_000_000) {
            errors.push("Modal (Capital): Min 1 Juta, Max 100 Miliar");
        }
        if (isNaN(newRisk) || newRisk < 0.1 || newRisk > 100) {
            errors.push("Risiko (%): Min 0.1%, Max 100%");
        }

        if (errors.length > 0) {
            errors.forEach(e => toast.error(e));
            return;
        }

        updateSettings({
            capital: newCapital,
            riskPercentage: newRisk
        });

        toast.success("Pengaturan tersimpan");
        setIsOpen(false);
    };

    const handleReset = () => {
        if (confirm("Reset semua pengaturan ke default?")) {
            resetSettings();
            setIsOpen(false);
            toast.info("Pengaturan di-reset ke default");
        }
    };

    const formatRupiah = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                title="Settings"
            >
                <Settings className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Settings className="w-5 h-5 text-primary" />
                                Pengaturan
                            </h2>
                            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">

                            {/* Capital Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                    Modal Trading (IDR)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">Rp</span>
                                    <input
                                        type="number"
                                        value={localCapital}
                                        onChange={(e) => setLocalCapital(e.target.value)}
                                        className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-3 text-lg font-mono focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                        placeholder="100000000"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground text-right font-mono">
                                    {localCapital && !isNaN(parseFloat(localCapital)) ? formatRupiah(parseFloat(localCapital)) : "-"}
                                </p>
                            </div>

                            {/* Risk Percentage Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                    Default Risiko per Trade (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={localRisk}
                                        onChange={(e) => setLocalRisk(e.target.value)}
                                        step={0.5}
                                        className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-lg font-mono focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                        placeholder="2"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Konservatif: 1-2%</span>
                                    <span>Agresif: 3-5%</span>
                                </div>
                            </div>

                            {/* Legal Information Section */}
                            <div className="pt-6 border-t border-border mt-4">
                                <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
                                    <span className="text-yellow-500">⚠️</span> Legal & Disclaimer
                                </h3>
                                <div className="bg-secondary/30 rounded-lg p-3 text-[10px] text-muted-foreground leading-relaxed border border-border/50">
                                    <p className="mb-2">
                                        <strong>No Financial Advice:</strong> IDX Trading Assistant is an educational tool. We do not provide personalized financial, legal, or tax advice.
                                    </p>
                                    <p className="mb-2">
                                        <strong>Data Accuracy:</strong> Market data is provided by third-party sources (e.g., Yahoo Finance) and may be delayed or inaccurate. We are not responsible for data errors.
                                    </p>
                                    <p>
                                        <strong>Version:</strong> 2.0.0 (Beta)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-secondary/20 border-t border-border flex items-center justify-between">
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                                >
                                    <Save className="w-4 h-4" />
                                    Simpan
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}
