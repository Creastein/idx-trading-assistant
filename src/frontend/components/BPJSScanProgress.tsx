'use client';

import { useEffect, useState } from 'react';

export function BPJSScanProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return 95;
                return prev + 5;
            });
        }, 200);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-4">
                <p className="text-lg font-semibold mb-2">🔍 Scanning BPJS Candidates...</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Analyzing technical indicators and generating AI recommendations
                </p>
            </div>

            <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold inline-block text-blue-600">
                            Progress
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-blue-600">
                            {progress}%
                        </span>
                    </div>
                </div>
                <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                        style={{ width: `${progress}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                    />
                </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="animate-pulse">⚡</div>
                <p>Estimated time: {Math.ceil((100 - progress) / 10)} seconds</p>
            </div>
        </div>
    );
}
