"use client";

import { motion } from "framer-motion";

interface Tab {
    id: string;
    label: string;
}

interface AnimatedTabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (id: string) => void;
    className?: string;
}

export function AnimatedTabs({ tabs, activeTab, onChange, className = "" }: AnimatedTabsProps) {
    return (
        <div className={`relative flex space-x-1 ${className}`}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`
              relative px-4 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-2
              ${isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}
            `}
                        style={{
                            WebkitTapHighlightColor: "transparent",
                        }}
                    >
                        {isActive && (
                            <motion.span
                                layoutId="bubble"
                                className="absolute inset-0 z-10 bg-primary rounded-md shadow-sm"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-20 mix-blend-normal">
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
