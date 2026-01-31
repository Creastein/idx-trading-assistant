
export interface TechnicalScore {
    symbol: string;
    base_score: number;
    normalized_score: number;
    factor_breakdown: {
        trend: { score: number; max: number; percentage: number; assessment: string; details: any };
        momentum: { score: number; max: number; percentage: number; assessment: string; details: any };
        macd: { score: number; max: number; percentage: number; assessment: string; details: any };
        volume: { score: number; max: number; percentage: number; assessment: string; details: any };
        support_resistance: { score: number; max: number; percentage: number; assessment: string; details: any };
        patterns: { score: number; max: number; percentage: number; assessment: string; details: any };
        multi_timeframe: { score: number; max: number; percentage: number; assessment: string; details: any };
    };
    overall_technical_assessment: string;
    confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
}

function calculateEMA(prices: number[], period: number): number[] {
    if (prices.length === 0) return [];
    const k = 2 / (period + 1);
    const emaArray = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
        emaArray.push(prices[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
}

function calculateRSI(prices: number[], period = 14): number[] {
    if (prices.length < period + 1) return Array(prices.length).fill(50);
    const rsiArray: number[] = [];
    let gains = 0, losses = 0;

    // First RSI
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;

    rsiArray[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));

    // Subsequent RSI
    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        rsiArray[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
    }

    // Fill initial values
    for (let i = 0; i < period; i++) rsiArray[i] = 50;

    return rsiArray;
}

function calculateSimpleMACD(prices: number[]) {
    const shortEMA = calculateEMA(prices, 12);
    const longEMA = calculateEMA(prices, 26);
    const macdLine = prices.map((_, i) => shortEMA[i] - longEMA[i]);
    const signalLine = calculateEMA(macdLine, 9);
    return { macd: macdLine, signal: signalLine, histogram: macdLine.map((m, i) => m - signalLine[i]) };
}

export function calculateTechnicalScore(
    symbol: string,
    prices: number[],
    volumes: number[],
    highs: number[],
    lows: number[],
    dailyOpens: number[]
): TechnicalScore {
    const len = prices.length;
    const currentPrice = prices[len - 1];

    // --- 1. TREND ANALYSIS (Max 35) ---
    const ema20 = calculateEMA(prices, 20);
    const ema50 = calculateEMA(prices, 50);
    const lastEma20 = ema20[len - 1];
    const lastEma50 = ema50[len - 1];

    let trendScore = 0;
    const trendDetails: any = {};

    // 1.1 EMA20 Position (10 pts)
    const distEma20 = ((currentPrice - lastEma20) / lastEma20) * 100;
    if (currentPrice > lastEma20 * 1.02) { trendScore += 10; trendDetails.ema20 = { score: 10, note: `Strong > EMA20 (+${distEma20.toFixed(1)}%)` }; }
    else if (currentPrice > lastEma20) { trendScore += 8; trendDetails.ema20 = { score: 8, note: `Above EMA20 (+${distEma20.toFixed(1)}%)` }; }
    else if (Math.abs(distEma20) < 1) { trendScore += 5; trendDetails.ema20 = { score: 5, note: `At EMA20` }; }
    else if (currentPrice < lastEma20) { trendScore += 2; trendDetails.ema20 = { score: 2, note: `Below EMA20` }; }
    else { trendDetails.ema20 = { score: 0 }; }

    // 1.2 EMA50 Position (10 pts)
    const distEma50 = ((currentPrice - lastEma50) / lastEma50) * 100;
    if (currentPrice > lastEma50 * 1.05) { trendScore += 10; trendDetails.ema50 = { score: 10, note: `Well > EMA50 (+${distEma50.toFixed(1)}%)` }; }
    else if (currentPrice > lastEma50) { trendScore += 7; trendDetails.ema50 = { score: 7, note: `Above EMA50` }; }
    else if (Math.abs(distEma50) < 2) { trendScore += 4; trendDetails.ema50 = { score: 4, note: `Near EMA50` }; }
    else { trendScore += 0; trendDetails.ema50 = { score: 0, note: `Below EMA50` }; }

    // 1.3 Golden Cross (10 pts + 5 Bonus)
    let crossScore = 0;
    let crossNote = '';
    const emaDist = ((lastEma20 - lastEma50) / lastEma50) * 100;

    if (lastEma20 > lastEma50 * 1.03) { crossScore = 10; crossNote = `Strong Alignment (+${emaDist.toFixed(1)}%)`; }
    else if (lastEma20 > lastEma50) { crossScore = 7; crossNote = `Golden Cross Active`; }
    else if (Math.abs(emaDist) < 1) { crossScore = 3; crossNote = `Converging`; }
    else { crossScore = 0; crossNote = `Death Cross`; }

    // Bonus: Recent crossover (last 5 days)
    let recentCross = false;
    for (let i = 1; i <= 5; i++) {
        if (len - i > 0 && ema20[len - i - 1] <= ema50[len - i - 1] && ema20[len - i] > ema50[len - i]) {
            recentCross = true;
            break;
        }
    }
    if (recentCross && lastEma20 > lastEma50) { crossScore += 5; crossNote += ' | FRESH CROSSOVER'; }
    trendScore += crossScore;
    trendDetails.cross = { score: crossScore, note: crossNote };

    let trendAssess = 'DOWNTREND';
    if (trendScore >= 25) trendAssess = 'STRONG UPTREND';
    else if (trendScore >= 18) trendAssess = 'UPTREND';
    else if (trendScore >= 12) trendAssess = 'WEAK UPTREND';
    else if (trendScore >= 6) trendAssess = 'NEUTRAL';

    // --- 2. MOMENTUM ANALYSIS (Max 25) ---
    const rsiArr = calculateRSI(prices, 14);
    const lastRsi = rsiArr[len - 1];
    let momScore = 0;
    const momDetails: any = {};

    const rsi3Ago = rsiArr[len - 3] || 50;
    const rsiTrend = lastRsi > rsi3Ago ? 'Rising' : (lastRsi < rsi3Ago ? 'Falling' : 'Flat');

    // 2.1 RSI Zone (10 pts)
    let zoneScore = 0;
    let zoneName = '';

    if (lastRsi >= 20 && lastRsi < 40) {
        if (rsiTrend === 'Rising') { zoneScore = 10; zoneName = 'OVERSOLD BOUNCE'; }
        else { zoneScore = 5; zoneName = 'OVERSOLD'; }
    } else if (lastRsi >= 40 && lastRsi < 60) {
        if (rsiTrend === 'Rising') { zoneScore = 8; zoneName = 'HEALTHY RISING'; }
        else if (rsiTrend === 'Flat') { zoneScore = 5; zoneName = 'HEALTHY NEUTRAL'; }
        else { zoneScore = 3; zoneName = 'HEALTHY FALLING'; }
    } else if (lastRsi >= 60 && lastRsi < 70) {
        if (rsiTrend === 'Rising') { zoneScore = 5; zoneName = 'STRONG MOMENTUM'; }
        else { zoneScore = 3; zoneName = 'OVERBOUGHT EARLY'; }
    } else if (lastRsi >= 70) {
        zoneScore = 0; zoneName = 'OVERBOUGHT EXTREME';
    } else {
        zoneScore = 0; zoneName = 'OVERSOLD EXTREME';
    }
    momScore += zoneScore;
    momDetails.rsi_zone = { score: zoneScore, zone: zoneName, value: lastRsi.toFixed(1) };

    // 2.2 Momentum Strength (5 pts)
    let momStrScore = 0;
    const rsi5Ago = rsiArr[len - 5] || 50;
    if (lastRsi > rsi3Ago && rsi3Ago > rsi5Ago) momStrScore = 5;
    else if (lastRsi > rsi3Ago || rsi3Ago > rsi5Ago) momStrScore = 3;
    else if (Math.abs(lastRsi - rsi3Ago) < 5) momStrScore = 1;
    momScore += momStrScore;
    momDetails.strength = { score: momStrScore };

    // 2.3 Divergence (10 pts) - Simplified check
    // Logic: Price lower low in last 20 days but RSI higher low
    let divScore = 0;
    // (Complex logic simplified for reliability without full swing detection lib)
    // Check minimal reliable divergence condition: Price(now) < Price(10d ago) but RSI(now) > RSI(10d ago) significantly
    const p10 = prices[len - 10];
    const r10 = rsiArr[len - 10];
    if (p10 && r10) {
        if (currentPrice < p10 * 0.98 && lastRsi > r10 + 5) {
            divScore = 7; // Moderate
            momDetails.divergence = { score: 7, note: 'Bullish Divergence Suggested' };
        }
    }
    momScore += divScore;

    let momAssess = 'NO MOMENTUM';
    if (momScore >= 20) momAssess = 'STRONG MOMENTUM';
    else if (momScore >= 15) momAssess = 'GOOD MOMENTUM';
    else if (momScore >= 10) momAssess = 'MODERATE';
    else if (momScore >= 5) momAssess = 'WEAK';

    // --- 3. MACD (Max 20) ---
    const macdData = calculateSimpleMACD(prices);
    const lastMacd = macdData.macd[len - 1];
    const lastSig = macdData.signal[len - 1];
    const lastHist = macdData.histogram[len - 1];
    let macdScore = 0;
    const macdDetails: any = {};

    // 3.1 Crossover (10 pts)
    let xScore = 0;
    let xAge = 0;
    let crossFound = false;
    for (let i = 1; i <= 5; i++) {
        if (macdData.histogram[len - i - 1] <= 0 && macdData.histogram[len - i] > 0) {
            crossFound = true;
            xAge = i;
            break;
        }
    }
    if (crossFound && xAge <= 2) xScore = 10;
    else if (crossFound) xScore = 7;
    else if (lastMacd > lastSig) {
        const dist = ((lastMacd - lastSig) / Math.abs(lastSig)) * 100;
        if (dist > 20) xScore = 6; else xScore = 4;
    } else if (Math.abs(lastMacd - lastSig) < 0.5) xScore = 2;
    macdScore += xScore;
    macdDetails.crossover = { score: xScore, age: xAge };

    // 3.2 Histogram (5 pts)
    let hScore = 0;
    // Check reversing
    const prevHist = macdData.histogram[len - 2];
    if (prevHist < 0 && lastHist > 0) hScore = 5;
    else if (lastHist > 0 && lastHist > prevHist) hScore = 4;
    else if (lastHist > 0) hScore = 2;
    else if (lastHist > 0 && lastHist < 0.5) hScore = 1;
    macdScore += hScore;
    macdDetails.histogram = { score: hScore };

    // 3.3 Zero Line (5 pts)
    let zScore = 0;
    if (lastMacd > 1) zScore = 5;
    else if (lastMacd > 0) zScore = 4;
    else if (lastMacd > -0.5) zScore = 2;
    else if (lastMacd < 0 && lastMacd > prevHist) zScore = 1;
    macdScore += zScore;
    macdDetails.zero_line = { score: zScore };

    let macdAssess = 'BEARISH';
    if (macdScore >= 16) macdAssess = 'STRONG MACD';
    else if (macdScore >= 12) macdAssess = 'GOOD MACD';
    else if (macdScore >= 8) macdAssess = 'MODERATE';

    // --- 4. VOLUME (Max 15) ---
    let volScore = 0;
    const volDetails: any = {};
    const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const curVol = volumes[len - 1];
    const volRatio = curVol / avgVol20;

    // 4.1 Spike (10 pts)
    let spScore = 0;
    if (volRatio >= 3) spScore = 10;
    else if (volRatio >= 2) spScore = 9;
    else if (volRatio >= 1.5) spScore = 7;
    else if (volRatio >= 1.2) spScore = 4;
    else if (volRatio >= 1.0) spScore = 2;
    else if (volRatio >= 0.8) spScore = 1;
    volScore += spScore;
    volDetails.spike = { score: spScore, ratio: volRatio.toFixed(1) };

    // 4.2 Accumulation (5 pts)
    let accScore = 0;
    let upDays = 0;
    for (let i = 0; i < 5; i++) {
        if (len - i - 2 >= 0 && volumes[len - i - 1] > volumes[len - i - 2]) upDays++;
    }
    if (upDays >= 4) accScore = 5;
    else if (upDays === 3) accScore = 3;
    else if (upDays === 2) accScore = 1;
    volScore += accScore;
    volDetails.accumulation = { score: accScore };

    let volAssess = 'NO VOLUME';
    if (volScore >= 12) volAssess = 'EXCELLENT';
    else if (volScore >= 9) volAssess = 'GOOD';
    else if (volScore >= 6) volAssess = 'MODERATE';
    else if (volScore >= 3) volAssess = 'WEAK';

    // --- 5. SUPPORT (Max 10) ---
    let supScore = 0;
    const supDetails: any = {};

    // 5.1 Proximity (5 pts)
    const recentLows = lows.slice(-20);
    const minLow = Math.min(...recentLows);
    const distSup = ((currentPrice - minLow) / currentPrice) * 100;
    let proxScore = 0;
    if (distSup <= 1) proxScore = 5;
    else if (distSup <= 3) proxScore = 4;
    else if (distSup <= 5) proxScore = 2;
    supScore += proxScore;
    supDetails.proximity = { score: proxScore, dist: distSup.toFixed(1) };

    // 5.2 Breakout (5 pts)
    const recentHighs = highs.slice(-20);
    const resLevel = Math.max(...recentHighs.filter(h => h < currentPrice * 1.5)); // broad filter
    // Simple check: if current price is highest in 20 days
    const isHigh20 = currentPrice >= Math.max(...recentHighs.slice(0, -1));
    let brkScore = 0;
    if (isHigh20 && volRatio > 1.5) brkScore = 5;
    else if (isHigh20) brkScore = 3;
    else if ((resLevel - currentPrice) / currentPrice < 0.02) brkScore = 2;
    supScore += brkScore;
    supDetails.breakout = { score: brkScore };

    let supAssess = 'POOR';
    if (supScore >= 8) supAssess = 'EXCELLENT';
    else if (supScore >= 6) supAssess = 'GOOD';
    else if (supScore >= 4) supAssess = 'MODERATE';

    // --- 6. PATTERNS (Max 5) ---
    // Simple checks for last candle
    let patScore = 0;
    let pattern = 'NONE';
    const body = Math.abs(currentPrice - dailyOpens[len - 1]);
    const range = highs[len - 1] - lows[len - 1];
    const upperWick = highs[len - 1] - Math.max(currentPrice, dailyOpens[len - 1]);
    const lowerWick = Math.min(currentPrice, dailyOpens[len - 1]) - lows[len - 1];

    // Hammer
    if (lowerWick > body * 2 && upperWick < body * 0.5) { patScore = 5; pattern = 'HAMMER'; }
    // Bullish Marubozu (Big body, small wicks)
    else if (body > range * 0.8 && range > currentPrice * 0.02) { patScore = 3; pattern = 'MARUBOZU'; }

    let patAssess = patScore >= 3 ? 'PATTERN DETECTED' : 'NO PATTERN';

    // --- 7. MULTI-TF (Max 5) ---
    // Since this function runs on daily/historical, we can check Daily Alignment here
    let alignScore = 0;
    let conditions = 0;
    if (currentPrice > lastEma20) conditions++;
    if (lastRsi > 45) conditions++;
    if (lastMacd > 0 || lastMacd > macdData.macd[len - 6]) conditions++; // rising

    if (conditions === 3) alignScore = 5;
    else if (conditions === 2) alignScore = 3;
    else if (conditions === 1) alignScore = 1;

    let alignAssess = 'NO ALIGNMENT';
    if (alignScore >= 4) alignAssess = 'STRONG';
    else if (alignScore >= 2) alignAssess = 'MODERATE';

    // --- FINAL TOTAL ---
    const totalBase = trendScore + momScore + macdScore + volScore + supScore + patScore + alignScore;
    // Max 115
    const normalized = Math.min(100, (totalBase / 115) * 100);

    let overallVerdict = 'NEUTRAL';
    if (normalized > 75) overallVerdict = 'STRONG BULLISH SETUP';
    else if (normalized > 60) overallVerdict = 'BULLISH SETUP';
    else if (normalized > 40) overallVerdict = 'WEAL/NEUTRAL';
    else overallVerdict = 'BEARISH';

    return {
        symbol,
        base_score: totalBase,
        normalized_score: Number(normalized.toFixed(1)),
        factor_breakdown: {
            trend: { score: trendScore, max: 35, percentage: (trendScore / 35) * 100, assessment: trendAssess, details: trendDetails },
            momentum: { score: momScore, max: 25, percentage: (momScore / 25) * 100, assessment: momAssess, details: momDetails },
            macd: { score: macdScore, max: 20, percentage: (macdScore / 20) * 100, assessment: macdAssess, details: macdDetails },
            volume: { score: volScore, max: 15, percentage: (volScore / 15) * 100, assessment: volAssess, details: volDetails },
            support_resistance: { score: supScore, max: 10, percentage: (supScore / 10) * 100, assessment: supAssess, details: supDetails },
            patterns: { score: patScore, max: 5, percentage: (patScore / 5) * 100, assessment: patAssess, details: { pattern } },
            multi_timeframe: { score: alignScore, max: 5, percentage: (alignScore / 5) * 100, assessment: alignAssess, details: { conditions } }
        },
        overall_technical_assessment: overallVerdict,
        confidence_level: normalized > 70 ? 'HIGH' : (normalized > 50 ? 'MEDIUM' : 'LOW')
    };
}
