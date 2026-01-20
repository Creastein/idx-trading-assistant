"use client";

interface ModeSelectionScreenProps {
    onSelectMode: (mode: 'SCALPING' | 'SWING') => void;
}

export default function ModeSelectionScreen({ onSelectMode }: ModeSelectionScreenProps) {
    return (
        <div className="min-h-screen bg-terminal-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />

            <div className="z-10 text-center mb-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-chart-2 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/30">
                    <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold font-mono text-foreground tracking-tight mb-3">
                    IDX PRO TERMINAL
                </h1>
                <p className="text-muted-foreground font-mono text-sm md:text-base max-w-lg mx-auto">
                    Select your trading style to initialize the AI workspace.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full z-10">
                {/* Scalping Mode Card */}
                <button
                    onClick={() => onSelectMode('SCALPING')}
                    className="group relative bg-card hover:bg-card/80 border border-border hover:border-profit/50 rounded-2xl p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-profit/10"
                >
                    <div className="absolute inset-0 bg-profit/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-profit/10 flex items-center justify-center mb-6 ring-1 ring-profit/20 group-hover:bg-profit group-hover:text-black transition-colors">
                            <svg className="w-6 h-6 text-profit group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2 group-hover:text-profit transition-colors">⚡ Scalping Mode</h2>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                            Optimized for high-speed, short-term trades.
                            <br /><span className="text-xs opacity-70">Interval: 1-5 Minutes • Focus: Volatility • AI: Aggressive</span>
                        </p>

                        <div className="flex items-center gap-2 text-xs font-mono text-profit">
                            <span>INITIALIZE WORKSPACE</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                    </div>
                </button>

                {/* Swing Mode Card */}
                <button
                    onClick={() => onSelectMode('SWING')}
                    className="group relative bg-card hover:bg-card/80 border border-border hover:border-chart-2/50 rounded-2xl p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-chart-2/10"
                >
                    <div className="absolute inset-0 bg-chart-2/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-chart-2/10 flex items-center justify-center mb-6 ring-1 ring-chart-2/20 group-hover:bg-chart-2 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6 text-chart-2 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2 group-hover:text-chart-2 transition-colors">🌊 Swing Mode</h2>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                            Designed for trend analysis and position sizing.
                            <br /><span className="text-xs opacity-70">Interval: Daily • Focus: Fundamentals • AI: Strategic</span>
                        </p>

                        <div className="flex items-center gap-2 text-xs font-mono text-chart-2">
                            <span>INITIALIZE WORKSPACE</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                    </div>
                </button>
            </div>

            <p className="fixed bottom-6 text-[10px] text-muted-foreground/50 font-mono">
                v1.2.0 • POWERED BY GEMINI 2.0 FLASH & GROQ
            </p>
        </div>
    );
}
