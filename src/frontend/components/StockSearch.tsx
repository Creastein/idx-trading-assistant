"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, TrendingUp } from "lucide-react";
import { POPULAR_IDX_STOCKS } from "@/frontend/data/stockList";

interface StockSearchProps {
    onSelect: (symbol: string) => void;
    isLoading?: boolean;
    initialValue?: string;
}

export function StockSearch({ onSelect, isLoading = false, initialValue = "" }: StockSearchProps) {
    const [query, setQuery] = useState(initialValue);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter suggestions based on query
    const suggestions = useMemo(() => {
        if (!query.trim()) return [];

        // If exact match doesn't exist in our list but user typed 4 chars, show it as generic top option
        const normalizedQuery = query.toUpperCase().trim();

        const matches = POPULAR_IDX_STOCKS.filter(stock =>
            stock.symbol.includes(normalizedQuery) ||
            stock.name.toUpperCase().includes(normalizedQuery)
        ).slice(0, 8);

        return matches;
    }, [query]);

    // Handle outside click to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === "ArrowDown") setIsOpen(true);
            return;
        }

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex(prev => (prev > -1 ? prev - 1 : prev));
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    selectStock(suggestions[selectedIndex].symbol);
                } else if (query) {
                    handleSubmit();
                }
                break;
            case "Escape":
                setIsOpen(false);
                inputRef.current?.blur();
                break;
        }
    };

    const selectStock = (symbol: string) => {
        setQuery(symbol);
        setIsOpen(false);
        onSelect(symbol);
        setSelectedIndex(-1);
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (query.trim()) {
            onSelect(query.toUpperCase());
            setIsOpen(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full max-w-md group z-50">
            <form onSubmit={handleSubmit} className="relative">
                {/* Search Icon */}
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Search className="w-4 h-4" />
                </div>

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value.toUpperCase());
                        setIsOpen(true);
                        setSelectedIndex(-1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search Ticker (e.g. BBCA)..."
                    className="w-full bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-none rounded-full py-2.5 pl-10 pr-12 text-sm transition-all shadow-sm focus:shadow-md focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50 font-mono"
                    autoComplete="off"
                />

                {/* Loading / Enter Indicator */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                    {query && !isLoading && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery("");
                                setSelectedIndex(-1);
                                inputRef.current?.focus();
                            }}
                            className="p-1 mr-1 rounded-full text-muted-foreground hover:bg-background hover:text-red-400"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="p-1.5 rounded-full text-muted-foreground hover:bg-background hover:text-primary transition-all disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        ) : (
                            <span className="text-[10px] font-bold opacity-0 group-focus-within:opacity-100 transition-opacity">↵</span>
                        )}
                    </button>
                </div>
            </form>

            {/* Autocomplete Dropdown */}
            {isOpen && query.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                    {/* Header if suggestions exist */}
                    {suggestions.length > 0 && (
                        <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/20 border-b border-border/50">
                            Suggestions
                        </div>
                    )}

                    <ul>
                        {/* Always show what user typed as first option if it's a valid length */}
                        {query.length >= 4 && !suggestions.find(s => s.symbol === query) && (
                            <li
                                onClick={() => selectStock(query)}
                                className={`px-4 py-3 cursor-pointer flex items-center justify-between border-b border-border/50 transition-colors
                            ${selectedIndex === -1 ? 'bg-primary/10' : 'hover:bg-secondary/50'}
                        `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground">
                                        <Search className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-foreground font-mono">{query}</div>
                                        <div className="text-xs text-muted-foreground">Search for this ticker</div>
                                    </div>
                                </div>
                            </li>
                        )}

                        {/* Popular Matches */}
                        {suggestions.map((stock, index) => (
                            <li
                                key={stock.symbol}
                                onClick={() => selectStock(stock.symbol)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors
                            ${index === selectedIndex ? 'bg-primary/10' : 'hover:bg-secondary/50'}
                        `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-foreground font-mono flex items-center gap-2">
                                            {stock.symbol}
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground font-sans font-normal">
                                                {stock.sector}
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground line-clamp-1">{stock.name}</div>
                                    </div>
                                </div>
                            </li>
                        ))}

                        {/* No results */}
                        {suggestions.length === 0 && query.length < 4 && (
                            <li className="px-4 py-8 text-center text-muted-foreground text-sm">
                                No popular suggestions found.<br />
                                <span className="text-xs opacity-50">Press Enter to search anyway.</span>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
