"use client";

import React, { useState, useEffect } from "react";
import { X, TrendingUp, Zap, Clock, Shield, FlaskConical, Gauge } from "lucide-react";

const CURRENT_VERSION = "2.0";
const STORAGE_KEY = "last_seen_version";

export default function WhatsNewModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        try {
            const lastSeen = localStorage.getItem(STORAGE_KEY);
            if (lastSeen !== CURRENT_VERSION) {
                // Simple delay to ensure smooth entrance after initial page load
                const timer = setTimeout(() => setIsOpen(true), 1500);
                return () => clearTimeout(timer);
            }
        } catch (e) {
            console.error("Failed to read local storage", e);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        try {
            // Always save if they clicked close, user requirement said "Update localStorage when user closes OR clicks don't show again"
            // Actually typical pattern is: if "don't show again" is checked, we save. If not, we might show again next session?
            // User requirements: "Update localStorage when user closes or clicks 'Don't show again'"
            // This implies we marks as seen for this version regardless, OR specifically if checkbox is used. 
            // Requirement 5 Says: "Only show if last_seen_version !== current version".
            // Requirement 5 Also says: "Update localStorage when user closes or clicks 'Don't show again'".
            // This implies one-time show per version.
            localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
        } catch (e) {
            console.error("Failed to save to local storage", e);
        }
    };

    if (!isOpen) return null;

    const features = [
        {
            icon: <TrendingUp className="w-6 h-6 text-blue-400" />,
            title: "Technical Analysis",
            description: "Comprehensive deck with 7 indicators: RSI, MACD, Bollinger Bands, EMA, SMA, Volume & ATR."
        },
        {
            icon: <Zap className="w-6 h-6 text-yellow-400" />,
            title: "AI-Powered Signals",
            description: "Automated pattern detection with real-time confidence scores and actionable insights."
        },
        {
            icon: <Clock className="w-6 h-6 text-purple-400" />,
            title: "Multi-Timeframe Analysis",
            description: "Detect confluence across 4 timeframes (15m, 1h, 4h, 1d) for stronger trend confirmation."
        },
        {
            icon: <Shield className="w-6 h-6 text-green-400" />,
            title: "Risk Management",
            description: "Built-in Position Sizing calculator and Risk:Reward analyzer to protect your capital."
        },
        {
            icon: <FlaskConical className="w-6 h-6 text-pink-400" />,
            title: "Strategy Backtesting",
            description: "Simulate strategies on 90 days of historical data to validate before you trade."
        },
        {
            icon: <Gauge className="w-6 h-6 text-orange-400" />,
            title: "Enhanced Performance",
            description: "Blazing fast analysis with 5-minute intelligent caching and optimized data fetching."
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="bg-gray-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-800 shadow-2xl animate-in zoom-in-95 duration-300 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button Absolute */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Content */}
                <div className="p-6 md:p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <span className="inline-block px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full mb-3 border border-primary/20">
                            NEW UPDATE
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            IDX Trading Assistant <span className="text-primary">v{CURRENT_VERSION}</span>
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            We've massively upgraded your trading arsenal. Here is what's new.
                        </p>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {features.map((feature, idx) => (
                            <div
                                key={idx}
                                className="flex gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-800 hover:border-gray-700 hover:bg-gray-800 transition-all group"
                            >
                                <div className="shrink-0 p-3 bg-gray-900 rounded-lg h-fit group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white mb-1 text-lg">{feature.title}</h3>
                                    <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-800">
                        <div className="flex items-center gap-2">
                            {/* Checkbox for "Don't show again" - strictly mainly a UI placeholder as logic saves on close anyway per requirements, 
                        but could be used to toggle explicitly if we wanted to support 'remind me later'.
                        Given requirements: "Update localStorage when user closes OR clicks don't show again" checks out.
                    */}
                            {/* <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="rounded border-gray-700 bg-gray-800 text-primary focus:ring-offset-0 focus:ring-primary"
                        />
                        Don't show this again
                    </label> */}
                            {/* Re-reading requirement: "Update localStorage when user closes or clicks 'Don't show again'". 
                        Use standard flow: Just closing it marks it read. 
                    */}
                            <p className="text-sm text-gray-500 italic">
                                Explore these tools to enhance your trading edge.
                            </p>
                        </div>

                        <button
                            onClick={handleClose}
                            className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all transform hover:scale-105 active:scale-95"
                        >
                            Get Started 🚀
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
