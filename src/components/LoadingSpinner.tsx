"use client";

// ============================================================================
// Type Definitions
// ============================================================================

type SpinnerSize = "small" | "medium" | "large";
type SpinnerVariant = "primary" | "secondary" | "white";

interface LoadingSpinnerProps {
    size?: SpinnerSize;
    variant?: SpinnerVariant;
    text?: string;
    className?: string;
}

// ============================================================================
// Size & Color Mappings
// ============================================================================

const sizeClasses: Record<SpinnerSize, string> = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
};

const textSizeClasses: Record<SpinnerSize, string> = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base",
};

const variantClasses: Record<SpinnerVariant, string> = {
    primary: "text-primary",
    secondary: "text-muted-foreground",
    white: "text-white",
};

// ============================================================================
// Main Component
// ============================================================================

export function LoadingSpinner({
    size = "medium",
    variant = "primary",
    text,
    className = "",
}: LoadingSpinnerProps) {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <svg
                className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                />
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
            </svg>
            {text && (
                <p className={`${textSizeClasses[size]} text-muted-foreground font-medium animate-pulse`}>
                    {text}
                </p>
            )}
        </div>
    );
}

// ============================================================================
// Full Screen Loading Overlay
// ============================================================================

interface LoadingOverlayProps {
    text?: string;
    symbol?: string;
}

export function LoadingOverlay({ text, symbol }: LoadingOverlayProps) {
    const displayText = text || (symbol ? `Menganalisis ${symbol}...` : "Memuat data...");

    return (
        <div className="flex flex-col items-center justify-center h-96 w-full">
            <div className="relative">
                {/* Outer glow effect */}
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />

                {/* Main spinner */}
                <div className="relative bg-card/50 backdrop-blur-sm rounded-full p-6 border border-border/20">
                    <LoadingSpinner size="large" variant="primary" />
                </div>
            </div>

            <p className="mt-6 text-lg font-medium text-foreground">{displayText}</p>
            <p className="text-sm text-muted-foreground mt-1">Mohon tunggu sebentar...</p>

            {/* Progress dots */}
            <div className="flex gap-1.5 mt-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
        </div>
    );
}

// ============================================================================
// Skeleton Loaders
// ============================================================================

export function SkeletonCard({ className = "" }: { className?: string }) {
    return (
        <div className={`bg-gray-900 border border-gray-800 rounded-lg p-4 animate-pulse ${className}`}>
            <div className="h-3 bg-gray-700 rounded w-1/3 mb-4" />
            <div className="h-8 bg-gray-700 rounded w-2/3 mb-3" />
            <div className="h-3 bg-gray-700 rounded w-full mb-2" />
            <div className="h-3 bg-gray-700 rounded w-4/5" />
        </div>
    );
}

export function SkeletonGrid() {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
