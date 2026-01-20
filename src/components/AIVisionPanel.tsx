"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

export default function AIVisionPanel() {
    const [image, setImage] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [prompt, setPrompt] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            processFile(file);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setImage(e.target?.result as string);
            setAnalysis(null);
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleAnalyze = async () => {
        if (!image) return;

        setIsAnalyzing(true);
        setError(null);
        setAnalysis(null);

        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "image",
                    data: image,
                    prompt: prompt.trim() || undefined,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to analyze image");
            }

            setAnalysis(result.analysis);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Analysis failed");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const clearImage = () => {
        setImage(null);
        setAnalysis(null);
        setError(null);
        setPrompt("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="terminal-panel flex flex-col h-full">
            {/* Panel Header */}
            <div className="terminal-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>AI Vision</span>
                </div>
                <span className="text-xs text-chart-2 font-semibold">Gemini</span>
            </div>

            {/* Panel Content */}
            <div className="flex-1 p-4 space-y-4 overflow-auto">
                {/* Upload Area */}
                <div
                    className={`relative border-2 border-dashed rounded-lg transition-all min-h-[200px] flex flex-col items-center justify-center ${isDragging
                        ? "border-primary bg-primary/5"
                        : image
                            ? "border-chart-2/50 bg-chart-2/5"
                            : "border-border hover:border-muted-foreground/50"
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {image ? (
                        <div className="relative w-full h-full min-h-[200px] p-4">
                            <Image
                                src={image}
                                alt="Chart preview"
                                fill
                                className="object-contain rounded-lg"
                            />
                            <button
                                onClick={clearImage}
                                className="absolute top-2 right-2 p-2 bg-destructive/90 rounded-lg hover:bg-destructive transition-colors"
                            >
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div className="text-center p-6">
                            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="font-mono text-lg font-semibold text-foreground mb-2">Upload Chart Image</h3>
                            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                                Drag & drop a stock chart or Broker Summary table for AI analysis.
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                                id="chart-upload"
                            />
                            <label
                                htmlFor="chart-upload"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-foreground font-mono text-sm rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Browse Files
                            </label>
                        </div>
                    )}
                </div>

                {/* Prompt Input */}
                {image && (
                    <div>
                        <label className="block text-xs font-mono text-muted-foreground mb-2">
                            Analysis Hint (Optional)
                        </label>
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g. Scalping setup, Swing trade, Broker Summary..."
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-chart-2/50 focus:border-chart-2 transition-all"
                        />
                    </div>
                )}

                {/* Error Display */}
                {/* Error Display */}
                {error && (
                    <div className={`p-4 rounded-lg border ${error.includes("Busy") || error.includes("Quota") ? "bg-yellow-500/10 border-yellow-500/30" : "bg-destructive/10 border-destructive/30"}`}>
                        <div className="flex items-start gap-2">
                            <svg className={`w-4 h-4 mt-0.5 ${error.includes("Busy") || error.includes("Quota") ? "text-yellow-500" : "text-destructive"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <h4 className={`text-sm font-semibold mb-1 ${error.includes("Busy") || error.includes("Quota") ? "text-yellow-500" : "text-destructive"}`}>
                                    {error.includes("Busy") || error.includes("Quota") ? "System Busy" : "Analysis Failed"}
                                </h4>
                                <p className={`text-sm font-mono ${error.includes("Busy") || error.includes("Quota") ? "text-yellow-500/90" : "text-destructive"}`}>{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Analyze Button */}
                {image && (
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="w-full py-3 bg-gradient-to-r from-chart-2 to-primary text-primary-foreground font-mono font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {isAnalyzing ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Analyzing with Gemini...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Analyze Chart
                            </>
                        )}
                    </button>
                )}

                {/* Analysis Results */}
                {analysis ? (
                    <div className="p-4 bg-chart-2/10 border border-chart-2/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                            <svg className="w-4 h-4 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <h4 className="font-mono text-sm font-semibold text-chart-2">Gemini Analysis</h4>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap font-mono text-sm text-foreground/90 leading-relaxed">{analysis}</pre>
                        </div>
                    </div>
                ) : !image && (
                    <div className="flex-1 border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center min-h-[150px]">
                        <div className="w-12 h-12 rounded-full bg-chart-2/10 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <h3 className="font-mono text-sm font-semibold text-foreground mb-1">AI Analysis Results</h3>
                        <p className="text-xs text-muted-foreground max-w-xs">
                            Upload a chart image to receive AI-powered pattern recognition, support/resistance levels, and trading signals.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
