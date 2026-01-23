/**
 * BPJS AI Analyst
 * 
 * Groq AI integration to generate professional BPJS trading recommendations.
 * Uses "Pak Budi" persona - veteran IDX trader with 15+ years experience.
 * 
 * Features:
 * - BUY/HOLD/AVOID recommendation with confidence %
 * - Specific entry/exit strategy in Rupiah
 * - Risk analysis and warnings
 * - Professional Bahasa Indonesia communication
 * 
 * @module lib/bpjs/aiAnalyst
 */

import Groq from 'groq-sdk';
import type { BPJSScore } from './scoring';
import type { EnhancedStockData, MarketContext } from '@/shared/types';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || '',
});

export interface AIRecommendation {
    recommendation: 'BUY' | 'HOLD' | 'AVOID';
    confidence: number; // 0-100
    reasons: string[];
    strategy: {
        entryZone: { min: number; max: number };
        targetProfit: { price: number; percent: number };
        stopLoss: { price: number; percent: number };
        riskReward: number;
    };
    risks: string[];
    additionalNotes: string;
    rawResponse: string;
    generatedAt: string;
}

const SYSTEM_PROMPT = `You are Pak Budi, a veteran IDX trader with 15+ years experience specializing in BPJS (Beli Pagi Jual Sore) strategy. You are known for:
- Conservative risk management (max 2% risk per trade)
- Data-driven decisions (combine technical + fundamental + sentiment)
- Clear communication (avoid jargon, explain reasoning in Bahasa Indonesia)
- High win rate (65%+ on BPJS trades)

Your analysis style:
1. Start with overall assessment (BUY/HOLD/AVOID)
2. Support with 3-5 key reasons with specific numbers
3. Provide specific entry/exit levels in Rupiah
4. Warn about risks honestly
5. Rate confidence (0-100%)

You NEVER:
- Guarantee profits or use hype language
- Recommend without data backing
- Ignore risk factors`;

/**
 * Generate AI-powered trading analysis for a BPJS candidate
 * @param score BPJS score with breakdown
 * @param stockData Enhanced stock data with indicators
 * @returns AI recommendation with strategy
 */
export async function generateAIAnalysis(
    score: BPJSScore,
    stockData: EnhancedStockData,
    marketContext?: MarketContext
): Promise<AIRecommendation> {
    const userPrompt = createUserPrompt(score, stockData, marketContext);

    // Debug log to verify news injection
    if (stockData.news && stockData.news.length > 0) {
        console.log(`[AI Analyst] News injected for ${score.symbol}: ${stockData.news.length} headlines`);
    } else {
        console.log(`[AI Analyst] No news to inject for ${score.symbol}`);
    }

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 1500,
        });

        const responseText = completion.choices[0]?.message?.content || '';

        return parseAIResponse(responseText, score.quote.currentPrice);
    } catch (error) {
        console.error('[AI Analyst] Error:', error);
        // Return fallback recommendation
        return createFallbackRecommendation(score);
    }
}

/**
 * Create detailed prompt for AI analysis
 */
function createUserPrompt(score: BPJSScore, stockData: EnhancedStockData, marketContext?: MarketContext): string {
    const today = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const rsiValue = stockData.indicators.rsi?.value || 50;
    const macdData = stockData.indicators.macd;
    const bbData = stockData.indicators.bollingerBands;
    const ema20 = stockData.indicators.ema20 || score.quote.currentPrice;
    const ema50 = stockData.indicators.ema50 || score.quote.currentPrice;

    // Get ATR (Average True Range) for volatility-based stops
    // Default to 1% of price if ATR is missing (fallback)
    const atrValue = stockData.atr || (score.quote.currentPrice * 0.01);
    const volatilityPercent = (atrValue / score.quote.currentPrice) * 100;

    let marketContextText = "";
    if (marketContext) {
        marketContextText = `
=== KONDISI PASAR (MARKET CONTEXT) ===
IHSG (Composite): ${marketContext.ihsg.price.toFixed(0)} (${marketContext.ihsg.changePercent > 0 ? '+' : ''}${marketContext.ihsg.changePercent.toFixed(2)}%) - ${marketContext.ihsg.trend}
USD/IDR: Rp ${marketContext.usdidr.price.toLocaleString('id-ID')} (${marketContext.usdidr.changePercent > 0 ? '+' : ''}${marketContext.usdidr.changePercent.toFixed(2)}%)
*PERHATIAN: Sesuaikan agresivitas rekomendasi dengan kondisi IHSG. Jika IHSG bearish/crash, lebih konservatif atau sarankan Wait & See.*
`;
    }

    return `Analisis kandidat BPJS untuk hari ini (${today}):
${marketContextText}
SAHAM: ${score.symbol} (${score.companyName})
SEKTOR: ${score.sector}
HARGA SAAT INI: Rp ${score.quote.currentPrice.toLocaleString('id-ID')}
SKOR BPJS: ${score.totalScore}/100

=== VOLATILITAS (RISK MANAGEMENT) ===
ATR (14): Rp ${atrValue.toFixed(0)} (${volatilityPercent.toFixed(2)}%)
*Gunakan ATR ini untuk menentukan Stop Loss dan Target Profit yang dinamis (bukan fix percentage).*

=== BREAKDOWN SKOR ===
Gap Performance: ${score.breakdown.gapPerformance}/20 (${score.quote.gapPercent.toFixed(2)}% gap dari kemarin)
Volume Surge: ${score.breakdown.volumeSurge}/20 (${score.quote.volumeRatio.toFixed(2)}x rata-rata)
RSI Position: ${score.breakdown.rsiPosition}/15 (RSI: ${rsiValue.toFixed(1)})
MACD Signal: ${score.breakdown.macdSignal}/15 (${macdData?.crossover || 'NEUTRAL'})
Bollinger Position: ${score.breakdown.bollingerPosition}/10
EMA Trend: ${score.breakdown.emaTrend}/10 (Harga vs EMA20: ${score.quote.currentPrice > ema20 ? 'Di Atas' : 'Di Bawah'})

=== DETAIL TEKNIKAL ===
- Volume: ${score.quote.volume.toLocaleString('id-ID')} shares (${score.quote.volumeRatio.toFixed(1)}x avg)
- RSI(14): ${rsiValue.toFixed(1)}
- MACD: ${macdData?.macd.toFixed(2) || 'N/A'} (Signal: ${macdData?.signal.toFixed(2) || 'N/A'})
- Bollinger Bands: Upper ${bbData?.upper.toFixed(0) || 'N/A'} | Mid ${bbData?.middle.toFixed(0) || 'N/A'} | Lower ${bbData?.lower.toFixed(0) || 'N/A'}
- EMA20: ${ema20.toFixed(0)} | EMA50: ${ema50.toFixed(0)}
- Support: ${score.supportResistance.support.length > 0 ? score.supportResistance.support.map(s => `Rp ${s.toFixed(0)}`).join(', ') : 'Belum teridentifikasi'}
- Resistance: ${score.supportResistance.resistance.length > 0 ? score.supportResistance.resistance.map(r => `Rp ${r.toFixed(0)}`).join(', ') : 'Belum teridentifikasi'}

=== SENTIMEN BERITA (TERBARU) ===
${stockData.news && stockData.news.length > 0
            ? stockData.news.slice(0, 3).map(n => `- ${n.title} (${n.publisher})`).join('\n')
            : '- Tidak ada berita signifikan terkini'}

=== TUGAS ANDA ===
Berikan rekomendasi BPJS profesional dengan format TEPAT ini:

**REKOMENDASI: [BUY/HOLD/AVOID]**
**CONFIDENCE: [0-100]%**

**ALASAN UTAMA:**
1. [Alasan pertama dengan data spesifik dari analisis di atas]
2. [Alasan kedua dengan data spesifik]
3. [Alasan ketiga dengan data spesifik]

**STRATEGI TRADING (ATR BASE):**
- Entry Zone: Rp [harga minimum] - Rp [harga maksimum]
- Target Profit (TP): Rp [Entry + (2x s.d 3x ATR)] (+[persentase]%)
- Stop Loss (SL): Rp [Entry - (1x s.d 1.5x ATR)] (-[persentase]%)
- Risk:Reward Ratio: 1:[rasio, minimal 1:2]

**RISIKO YANG PERLU DIPERHATIKAN:**
- [Risiko 1 yang spesifik untuk saham ini]
- [Risiko 2]

**CATATAN TAMBAHAN:**
[Timing entry terbaik, level yang harus diperhatikan, atau insight tambahan]

PENTING: Gunakan data ATR (Rp ${atrValue.toFixed(0)}) untuk menghitung jarak SL dan TP. Jangan gunakan persentase fix (seperti 1% atau 2%) karena setiap saham beda volatilitasnya. Jelaskan alasan dengan jelas.`;
}

/**
 * Parse AI response text into structured recommendation
 */
function parseAIResponse(text: string, currentPrice: number): AIRecommendation {
    // Extract recommendation
    const recMatch = text.match(/REKOMENDASI:\s*(BUY|HOLD|AVOID)/i);
    const recommendation = (recMatch ? recMatch[1].toUpperCase() : 'HOLD') as 'BUY' | 'HOLD' | 'AVOID';

    // Extract confidence
    const confMatch = text.match(/CONFIDENCE:\s*(\d+)%/i);
    const confidence = confMatch ? parseInt(confMatch[1]) : 50;

    // Extract reasons
    const reasonsMatch = text.match(/ALASAN UTAMA:([\s\S]*?)STRATEGI TRADING:/);
    const reasons = reasonsMatch
        ? (reasonsMatch[1].match(/\d+\.\s*([\s\S]+?)(?=\d+\.|STRATEGI|$)/g) || [])
            .map(r => r.replace(/^\d+\.\s*/, '').trim())
            .filter(r => r.length > 10)
        : [];

    // Extract strategy
    const entryMatch = text.match(/Entry Zone:\s*Rp\s*([\d,.]+)\s*-\s*Rp\s*([\d,.]+)/);
    const tpMatch = text.match(/Target Profit.*?Rp\s*([\d,.]+)\s*\(\+([\d.]+)%\)/);
    const slMatch = text.match(/Stop Loss.*?Rp\s*([\d,.]+)\s*\(-([\d.]+)%\)/);
    const rrMatch = text.match(/Risk:Reward Ratio:\s*1:([\d.]+)/);

    const parseNumber = (str: string) => parseFloat(str.replace(/,/g, '').replace(/\./g, ''));

    const strategy = {
        entryZone: {
            min: entryMatch ? parseNumber(entryMatch[1]) : currentPrice * 0.99,
            max: entryMatch ? parseNumber(entryMatch[2]) : currentPrice * 1.01,
        },
        targetProfit: {
            price: tpMatch ? parseNumber(tpMatch[1]) : currentPrice * 1.025,
            percent: tpMatch ? parseFloat(tpMatch[2]) : 2.5,
        },
        stopLoss: {
            price: slMatch ? parseNumber(slMatch[1]) : currentPrice * 0.99,
            percent: slMatch ? parseFloat(slMatch[2]) : 1.0,
        },
        riskReward: rrMatch ? parseFloat(rrMatch[1]) : 2.5,
    };

    // Extract risks
    const risksMatch = text.match(/RISIKO YANG PERLU DIPERHATIKAN:([\s\S]*?)CATATAN TAMBAHAN:/);
    const risks = risksMatch
        ? (risksMatch[1].match(/-\s*([\s\S]+?)(?=-|CATATAN|$)/g) || [])
            .map(r => r.replace(/^-\s*/, '').trim())
            .filter(r => r.length > 10)
        : [];

    // Extract notes
    const notesMatch = text.match(/CATATAN TAMBAHAN:([\s\S]*?)$/);
    const additionalNotes = notesMatch ? notesMatch[1].trim() : '';

    return {
        recommendation,
        confidence,
        reasons: reasons.slice(0, 5), // Max 5 reasons
        strategy,
        risks: risks.slice(0, 3), // Max 3 risks
        additionalNotes,
        rawResponse: text,
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Create fallback recommendation when AI is unavailable
 */
function createFallbackRecommendation(score: BPJSScore): AIRecommendation {
    const currentPrice = score.quote.currentPrice;

    // Determine recommendation based on score
    let recommendation: 'BUY' | 'HOLD' | 'AVOID' = 'HOLD';
    if (score.totalScore >= 70) recommendation = 'BUY';
    else if (score.totalScore < 50) recommendation = 'AVOID';

    return {
        recommendation,
        confidence: Math.min(score.totalScore, 75),
        reasons: [
            `Skor BPJS ${score.totalScore}/100 menunjukkan potensi ${score.totalScore >= 70 ? 'tinggi' : score.totalScore >= 50 ? 'sedang' : 'rendah'}`,
            `Volume ${score.quote.volumeRatio.toFixed(1)}x rata-rata menandakan ${score.quote.volumeRatio > 1.5 ? 'minat kuat' : 'minat normal'}`,
            `Gap ${score.quote.gapPercent.toFixed(2)}% dari penutupan kemarin`,
        ],
        strategy: {
            entryZone: { min: currentPrice * 0.99, max: currentPrice * 1.01 },
            targetProfit: { price: currentPrice * 1.025, percent: 2.5 },
            stopLoss: { price: currentPrice * 0.99, percent: 1.0 },
            riskReward: 2.5,
        },
        risks: [
            'Analisis AI tidak tersedia, gunakan pertimbangan Anda sendiri',
            'Selalu pantau kondisi market dan volume',
        ],
        additionalNotes: 'Ini adalah rekomendasi fallback karena AI analyst tidak tersedia.',
        rawResponse: 'Fallback recommendation',
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Batch generate AI analysis for multiple candidates
 * @param candidates Array of scores and stock data
 * @param maxConcurrent Maximum concurrent API calls (default: 5)
 * @returns Array of AI recommendations
 */
export async function generateBatchAnalysis(
    candidates: Array<{ score: BPJSScore; stockData: EnhancedStockData }>,
    marketContext?: MarketContext,
    maxConcurrent: number = 5
): Promise<AIRecommendation[]> {
    const results: AIRecommendation[] = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < candidates.length; i += maxConcurrent) {
        const batch = candidates.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(
            batch.map(({ score, stockData }) => generateAIAnalysis(score, stockData, marketContext))
        );
        results.push(...batchResults);
    }

    return results;
}
