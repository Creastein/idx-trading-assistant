"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface Settings {
    capital: number;
    riskPercentage: number;
    theme: "dark" | "light"; // Placeholder for future theme logic
}

interface SettingsContextType extends Settings {
    updateSettings: (newSettings: Partial<Settings>) => void;
    resetSettings: () => void;
    isLoading: boolean;
}

const DEFAULT_SETTINGS: Settings = {
    capital: 100_000_000,
    riskPercentage: 2,
    theme: "dark",
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem("idx_trading_settings");
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure all keys exist
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            }
        } catch (err) {
            console.error("Failed to load settings:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save to localStorage on change (debounced slightly by nature of React state updates, 
    // but explicit debounce isn't strictly necessary for simple localstorage writes unless very frequent)
    // We'll just save immediately on update for simplicity as these are low-freq actions.
    const saveToStorage = (newSettings: Settings) => {
        try {
            localStorage.setItem("idx_trading_settings", JSON.stringify(newSettings));
        } catch (err) {
            console.error("Failed to save settings:", err);
        }
    };

    const updateSettings = (partial: Partial<Settings>) => {
        setSettings((prev) => {
            const updated = { ...prev, ...partial };
            saveToStorage(updated);
            return updated;
        });
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
        saveToStorage(DEFAULT_SETTINGS);
    };

    return (
        <SettingsContext.Provider
            value={{
                ...settings,
                updateSettings,
                resetSettings,
                isLoading
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
