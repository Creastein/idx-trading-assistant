import { NextRequest, NextResponse } from "next/server";
import {
    analyzeMultipleTimeframes,
    type MultiTimeframeAnalysis,
} from "@/backend/analysis/multiTimeframe";

// ============================================================================
// Cache Configuration
// ============================================================================

// Cache interface
interface CachedAnalysis {
    data: MultiTimeframeAnalysis;
    timestamp: number;
}

// In-memory cache
const mtfCache = new Map<string, CachedAnalysis>();

// Cache durations (in milliseconds)
const CACHE_TTL = {
    scalping: 5 * 60 * 1000, // 5 minutes
    swing: 15 * 60 * 1000,   // 15 minutes
};

/**
 * Get cached analysis if valid
 */
function getCachedAnalysis(symbol: string, mode: "scalping" | "swing"): MultiTimeframeAnalysis | null {
    const key = `${symbol}-${mode}`;
    const cached = mtfCache.get(key);

    if (cached) {
        const ttl = CACHE_TTL[mode];
        if (Date.now() - cached.timestamp < ttl) {
            console.log(`[MTF API] Cache HIT for ${key}`);
            return cached.data;
        } else {
            console.log(`[MTF API] Cache EXPIRED for ${key}`);
            mtfCache.delete(key);
        }
    }
    return null;
}

/**
 * Set analysis to cache
 */
function setCachedAnalysis(symbol: string, mode: "scalping" | "swing", data: MultiTimeframeAnalysis) {
    const key = `${symbol}-${mode}`;

    // Simple eviction policy: prevents memory leaks
    if (mtfCache.size > 100) {
        const firstKey = mtfCache.keys().next().value;
        if (firstKey) mtfCache.delete(firstKey);
    }

    mtfCache.set(key, {
        data,
        timestamp: Date.now(),
    });
    console.log(`[MTF API] Cache SET for ${key}`);
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { symbol, mode = "scalping" } = body;

        // 1. Validation
        if (!symbol) {
            return NextResponse.json(
                { error: "Symbol is required" },
                { status: 400 }
            );
        }

        const validModes = ["scalping", "swing", "SCALPING", "SWING"];
        if (!validModes.includes(mode)) {
            return NextResponse.json(
                { error: "Invalid mode. Use 'scalping' or 'swing'" },
                { status: 400 }
            );
        }

        const normalizedMode = mode.toLowerCase() as "scalping" | "swing";
        const normalizedSymbol = symbol.toUpperCase();

        // 2. Check Cache
        const cachedResult = getCachedAnalysis(normalizedSymbol, normalizedMode);
        if (cachedResult) {
            return NextResponse.json(cachedResult);
        }

        // 3. Perform Analysis
        console.log(`[MTF API] Analyzing ${normalizedSymbol} in ${normalizedMode} mode...`);
        const result = await analyzeMultipleTimeframes(normalizedSymbol, normalizedMode);

        // 4. Update Cache
        setCachedAnalysis(normalizedSymbol, normalizedMode, result);

        // 5. Return Result
        return NextResponse.json(result);

    } catch (error: unknown) {
        console.error("[MTF API] Error:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

        return NextResponse.json(
            {
                error: "Failed to perform multi-timeframe analysis",
                details: errorMessage
            },
            { status: 500 }
        );
    }
}
