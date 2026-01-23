"use client";

import { useState, useEffect } from "react";
import { DATA_DELAY } from "@/shared/constants";

export default function DelayDisclaimerBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        // Check if user has dismissed the banner before
        const dismissed = localStorage.getItem("delay-disclaimer-dismissed");
        if (!dismissed) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem("delay-disclaimer-dismissed", "true");
    };

    if (!isVisible) return null;

    return (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 overflow-hidden">
            {/* Main Banner */}
            <div className="flex items-start gap-3 p-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                    <svg
                        className="w-5 h-5 text-yellow-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-yellow-200 mb-1">
                                ⏱️ Data Delay Notice
                            </h4>
                            <p className="text-xs text-yellow-100/80 leading-relaxed">
                                {DATA_DELAY.MESSAGE}
                            </p>
                        </div>

                        {/* Expand/Collapse Button */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-yellow-500 hover:text-yellow-400 transition-colors p-1"
                            title={isExpanded ? "Show less" : "Learn more"}
                        >
                            <svg
                                className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""
                                    }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 text-yellow-500/60 hover:text-yellow-500 transition-colors p-1"
                    title="Dismiss"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="border-t border-yellow-500/20 bg-yellow-500/5 p-3 space-y-2">
                    <div className="text-xs text-yellow-100/70 space-y-2">
                        <p>
                            <strong className="text-yellow-200">Why is there a delay?</strong>
                            <br />
                            Free tier data providers (Yahoo Finance) have a 15-20 minute delay
                            imposed by exchanges for non-premium users.
                        </p>

                        <p>
                            <strong className="text-yellow-200">Auto-refresh enabled:</strong>
                            <br />
                            • <strong className="text-profit">Scalping Mode:</strong> Updates every 30 seconds
                            <br />
                            • <strong className="text-chart-2">Swing Mode:</strong> Updates every 5 minutes
                        </p>

                        <p className="text-yellow-100/60 italic">
                            {DATA_DELAY.RECOMMENDATION}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
