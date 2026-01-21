"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("App Error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
                {/* Error Icon */}
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg
                        className="w-8 h-8 text-red-500"
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

                {/* Error Title */}
                <h2 className="text-xl font-bold text-foreground mb-2">
                    Terjadi Kesalahan
                </h2>

                {/* Error Message */}
                <p className="text-muted-foreground text-sm mb-6">
                    {error.message || "Aplikasi mengalami masalah. Silakan coba lagi."}
                </p>

                {/* Error Digest (for debugging) */}
                {error.digest && (
                    <p className="text-xs text-muted-foreground/50 mb-6 font-mono">
                        Error ID: {error.digest}
                    </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => reset()}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                        Coba Lagi
                    </button>
                    <button
                        onClick={() => window.location.href = "/"}
                        className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                    >
                        Kembali ke Beranda
                    </button>
                </div>

                {/* Help Text */}
                <p className="text-xs text-muted-foreground mt-6">
                    Jika masalah berlanjut, hubungi support atau refresh halaman.
                </p>
            </div>
        </div>
    );
}
