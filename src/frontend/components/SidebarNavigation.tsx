"use client";

import { useState } from "react";
import { TradingMode } from "@/shared/types";

interface SidebarNavigationProps {
    tradingMode: TradingMode;
    onBackToModeSelection: () => void;
    activeTab: "chart" | "fundamentals" | "news" | "vision" | "risk";
    onTabChange: (tab: "chart" | "fundamentals" | "news" | "vision" | "risk") => void;
}

export default function SidebarNavigation({ tradingMode, onBackToModeSelection, activeTab, onTabChange }: SidebarNavigationProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const menuItems = [
        {
            id: "mode",
            icon: tradingMode === 'SCALPING' ? "⚡" : "🌊",
            label: tradingMode === 'SCALPING' ? "Scalping" : "Swing",
            badge: tradingMode,
            color: tradingMode === 'SCALPING' ? "text-profit" : "text-chart-2",
            onClick: () => { }
        },
        {
            id: "divider-1",
            type: "divider"
        },
        {
            id: "chart",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            label: "Chart",
            active: activeTab === "chart",
            onClick: () => onTabChange("chart")
        },
        {
            id: "fundamental",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            ),
            label: "Fund.",
            active: activeTab === "fundamentals",
            onClick: () => onTabChange("fundamentals")
        },
        // News - Only show in Swing mode
        ...(tradingMode === 'SWING' ? [{
            id: "news",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
            ),
            label: "News",
            active: activeTab === "news",
            onClick: () => onTabChange("news")
        }] : []),
        {
            id: "ai-vision",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            ),
            label: "Vision",
            active: activeTab === "vision",
            onClick: () => onTabChange("vision")
        },
        {
            id: "risk",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            label: "Risk",
            active: activeTab === "risk",
            onClick: () => onTabChange("risk")
        },
        {
            id: "divider-2",
            type: "divider"
        },
        {
            id: "back",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            ),
            label: "Back",
            color: "text-muted-foreground hover:text-foreground",
            onClick: onBackToModeSelection
        }
    ];

    return (
        <>
            {/* Desktop Sidebar (Left) */}
            <div
                className={`hidden md:block fixed left-0 top-0 h-full bg-card border-r border-border z-40 transition-all duration-300 ${isExpanded ? "w-56" : "w-14"
                    }`}
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => setIsExpanded(false)}
            >
                {/* Top Spacer */}
                <div className="h-16 flex items-center justify-center border-b border-border/50">
                    <div className="w-8 h-8 flex items-center justify-center text-muted-foreground/20">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </div>
                </div>

                {/* Menu Items */}
                <nav className="py-4 px-2 space-y-1">
                    {menuItems.map((item) => {
                        if (item.type === "divider") {
                            return (
                                <div key={item.id} className="my-2 border-t border-border/50" />
                            );
                        }

                        return (
                            <button
                                key={item.id}
                                onClick={item.onClick}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${item.active
                                    ? "bg-primary/10 text-primary"
                                    : item.color || "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                    }`}
                                title={!isExpanded ? item.label : undefined}
                            >
                                <span className="shrink-0 flex items-center justify-center w-4 h-4">
                                    {typeof item.icon === "string" ? item.icon : item.icon}
                                </span>

                                {isExpanded && (
                                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                                        {item.label}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer - Version */}
                {isExpanded && (
                    <div className="absolute bottom-4 left-0 right-0 px-4">
                        <div className="text-[10px] text-muted-foreground/50 font-mono text-center">
                            v1.2.0
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t border-border/20 z-50 flex items-center justify-around px-2 pb-safe">
                {menuItems.filter(i => i.type !== 'divider' && i.id !== 'mode').slice(0, 5).map((item) => (
                    <button
                        key={item.id}
                        onClick={item.onClick}
                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all ${item.active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <span className="w-5 h-5">
                            {typeof item.icon === "string" ? item.icon : item.icon}
                        </span>
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                ))}
                {/* Mobile Menu Button (Hamburger) for extras could go here if needed */}
            </div>

            {/* Spacer for Desktop Layout */}
            <div className={`hidden md:block transition-all duration-300 ${isExpanded ? "w-56" : "w-14"}`} />
        </>
    );
}
