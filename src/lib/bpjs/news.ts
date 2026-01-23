/**
 * BPJS News Service
 * 
 * Lightweight news fetcher and sentiment analyzer for BPJS Screener.
 * Uses Yahoo Finance to get recent headlines and performs basic keyword analysis
 * to assign a sentiment score (0-5) for the preliminary screening.
 * 
 * @module lib/bpjs/news
 */

import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export interface StockNewsItem {
    title: string;
    publisher: string;
    link: string;
    publishTime: Date;
}

export interface NewsSentimentResult {
    score: number; // 0-5 (0=Very Bad, 3=Neutral, 5=Very Good)
    headlines: StockNewsItem[];
    summary: string;
}

// Keywords for basic sentiment scoring (Bahasa Indonesia & English)
const POSITIVE_KEYWORDS = [
    'naik', 'untung', 'laba', 'growth', 'profit', 'dividen', 'buyback',
    'ekspansi', 'resmi', 'kerjasama', 'surge', 'record', 'high', 'jump',
    'positif', 'optimis', 'bullish', 'strong', 'tertinggi', 'meroket'
];

const NEGATIVE_KEYWORDS = [
    'turun', 'rugi', 'loss', 'cut', 'debt', 'utang', 'beban',
    'gagal', 'batal', 'suspensi', 'drop', 'low', 'weak', 'bearish',
    'negatif', 'pesimis', 'terendah', 'anter', 'anjlok', 'bangkrut'
];

/**
 * Fetch recent news and calculate basic sentiment score
 * @param symbol Stock symbol (e.g., 'BBRI')
 * @returns NewsSentimentResult
 */
export async function fetchStockNews(symbol: string): Promise<NewsSentimentResult> {
    try {
        const symbolWithSuffix = symbol.includes('.JK') ? symbol : `${symbol}.JK`;

        // Fetch news from Yahoo Finance
        const result = await yahooFinance.search(symbolWithSuffix, { newsCount: 3 });

        const headlines: StockNewsItem[] = (result.news || []).map((item: any) => ({
            title: item.title,
            publisher: item.publisher,
            link: item.link,
            publishTime: new Date(item.providerPublishTime || Date.now())
        }));

        if (headlines.length === 0) {
            return {
                score: 3, // Neutral default
                headlines: [],
                summary: 'Tidak ada berita terkini.'
            };
        }

        // Calculate basic sentiment score based on keywords
        let totalScore = 0;
        let analyzedCount = 0;

        headlines.forEach(news => {
            const titleLower = news.title.toLowerCase();
            let itemScore = 3; // Start neutral

            // Check positives
            if (POSITIVE_KEYWORDS.some(kw => titleLower.includes(kw))) {
                itemScore += 1;
            }

            // Check negatives
            if (NEGATIVE_KEYWORDS.some(kw => titleLower.includes(kw))) {
                itemScore -= 1;
            }

            // Clamp score 1-5
            itemScore = Math.max(1, Math.min(5, itemScore));

            totalScore += itemScore;
            analyzedCount++;
        });

        const finalScore = analyzedCount > 0
            ? Math.round(totalScore / analyzedCount)
            : 3;

        return {
            score: finalScore,
            headlines,
            summary: `${headlines.length} berita terkini ditemukan.`
        };

    } catch (error) {
        console.warn(`[News] Failed to fetch news for ${symbol}:`, error);
        return {
            score: 3, // Fallback to neutral on error
            headlines: [],
            summary: 'Gagal mengambil berita.'
        };
    }
}
