
import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { BPJS_UNIVERSE } from '@/lib/bpjs/universe';
import { calculateTechnicalScore, TechnicalScore } from '@/lib/swing/scoring';

const yahooFinance = new YahooFinance();

// ============================================================================
// Types
// ============================================================================

interface FilteringResult {
    qualified: boolean;
    rejection_reason: string | null;
    quality_tags: string[];
    layer1: {
        passed: boolean;
        checks: {
            price: { passed: boolean; value: number; msg?: string };
            liquidity: { passed: boolean; value: number; msg?: string };
            market_cap: { passed: boolean; value: number; msg?: string };
            trading: { passed: boolean; status: string; msg?: string };
        };
    };
    layer2: {
        passed: boolean;
        warnings: string[];
        checks: {
            volatility: { passed: boolean; max_change: number; msg?: string };
            spread: { passed: boolean; spread_pct: number; msg?: string };
            consistency: { passed: boolean; active_pct: number; msg?: string };
            range: { passed: boolean; range_pct: number; msg?: string };
        };
    };
    layer3: {
        passed: boolean;
        warnings: string[];
        checks: {
            rsi: { passed: boolean; value: number; msg?: string };
            death_cross: { passed: boolean; msg?: string };
            volume_collapse: { passed: boolean; ratio: number; msg?: string };
        };
    };
}

interface TimeframeAnalysis {
    trend: 'UPTREND' | 'DOWNTREND' | 'CONSOLIDATION';
    score: number;
    verdict: string;
    details?: any;
    support?: number;
    resistance?: number;
    momentum?: string;
    signal?: string;
}

interface MultiTimeframeResult {
    daily: TimeframeAnalysis;
    hourly: TimeframeAnalysis;
    fifteen_min: TimeframeAnalysis;
    alignment: {
        all_timeframes_bullish: boolean;
        mtf_score: number;
        bonus: number;
    };
}

interface TradePlan {
    entry: { primary: number; alternative: number; range: string; timing: string };
    stop_loss: { technical: number; percentage: number; atr: number; recommended: number; method: string; rationale: string };
    take_profit: { tp1: { price: number; rr_ratio: string; action: string }; tp2: { price: number; rr_ratio: string; action: string }; tp3: { price: number; rr_ratio: string; action: string } };
    position_sizing: { capital: number; max_risk_pct: number; max_risk_idr: number; entry_price: number; stop_loss: number; risk_per_share: number; max_shares: number; recommended_lots: number; shares: number; required_capital: number; actual_risk: number };
    risk_reward: { tp1_rr: number; tp2_rr: number; tp3_rr: number; weighted_avg: number; assessment: string };
    management_plan: { entry_rules: string[]; stop_rules: string[]; exit_rules: string[] };
    trade_summary: { action: string; stop: string; targets: string; capital: string; risk: string; potential: string; verdict: string };
}

interface SwingSignal {
    symbol: string;
    companyName: string;
    price: number;
    filtering_result: FilteringResult;
    technical_analysis: TechnicalScore;
    base_score: number;
    multipliers: any;
    penalties: any;
    adjusted_score: number;
    risk_assessment: any;
    final_score: number;
    grade: string;
    multi_timeframe?: MultiTimeframeResult;
    trade_plan?: TradePlan;
    confluenceFactors: any[]; // Deprecated, keeping for interface compat if needed
    score: number;
    riskRewardRatio: number;
    recommendation: {
        action: 'BUY' | 'WAIT' | 'BUY ON PULLBACK' | 'SKIP';
        entryZone: [number, number];
        stopLoss: number;
        targets: number[];
        confidence: number | string;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
        rationale?: string;
        timing?: string;
    };
    timestamp: string;
}

// ============================================================================
// Helpers
// ============================================================================

function calculateEMA(prices: number[], period: number): number[] {
    if (prices.length === 0) return [];
    const k = 2 / (period + 1);
    const emaArray = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
        emaArray.push(prices[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
}

function calculateRSI(prices: number[], period = 14): number {
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateATR(highs: number[], lows: number[], closes: number[], period = 14): number {
    if (highs.length < period + 1) return (highs[highs.length - 1] - lows[lows.length - 1]);
    const trs: number[] = [];
    for (let i = 1; i < highs.length; i++) {
        trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
    }
    return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// ============================================================================
// 3-Layer Strict Filtering
// ============================================================================

function runStrictFiltering(quote: any, quotes: any[]): FilteringResult {
    const result: FilteringResult = {
        qualified: true,
        rejection_reason: null,
        quality_tags: [],
        layer1: { passed: true, checks: {} as any },
        layer2: { passed: true, warnings: [], checks: {} as any },
        layer3: { passed: true, warnings: [], checks: {} as any }
    };

    // --- LAYER 1: BASIC FILTERS ---
    const price = quote.regularMarketPrice || 0;
    const avgVol = quote.averageDailyVolume3Month || 0;
    const marketCap = quote.marketCap || 0;
    const isSuspended = quote.tradeable === false;

    // 1.1 Price: 100-500 IDR
    const pricePass = price >= 100 && price <= 500;
    result.layer1.checks.price = { passed: pricePass, value: price, msg: pricePass ? undefined : (price < 100 ? 'Price < 100' : 'Price > 500') };
    if (!pricePass) {
        result.qualified = false;
        result.rejection_reason = result.layer1.checks.price.msg || 'Price Out of Range';
        result.layer1.passed = false;
        return result;
    }

    // 1.2 Liquidity: > 1M shares avg
    const volPass = avgVol >= 1_000_000;
    result.layer1.checks.liquidity = { passed: volPass, value: avgVol, msg: volPass ? undefined : `Vol ${avgVol} < 1M` };
    if (!volPass) {
        result.qualified = false;
        result.rejection_reason = result.layer1.checks.liquidity.msg || 'Low Liquidity';
        result.layer1.passed = false;
        return result;
    }

    // 1.3 Market Cap: > 100M IDR
    const mcapPass = marketCap >= 100_000_000;
    result.layer1.checks.market_cap = { passed: mcapPass, value: marketCap, msg: mcapPass ? undefined : 'Market Cap too small' };
    if (!mcapPass) {
        result.qualified = false;
        result.rejection_reason = result.layer1.checks.market_cap.msg || 'Small Cap';
        result.layer1.passed = false;
        return result;
    }

    // 1.4 Status
    result.layer1.checks.trading = { passed: !isSuspended, status: isSuspended ? 'SUSPENDED' : 'ACTIVE' };
    if (isSuspended) {
        result.qualified = false;
        result.rejection_reason = 'Stock Suspended';
        result.layer1.passed = false;
        return result;
    }

    // --- LAYER 2: QUALITY FILTERS ---
    const last30 = quotes.slice(-30);
    const last10 = quotes.slice(-10);

    // 2.1 Volatility
    let maxChange = 0;
    for (const q of last30) {
        if (q.open && q.close) {
            const chg = Math.abs((q.close - q.open) / q.open * 100);
            if (chg > maxChange) maxChange = chg;
        }
    }
    if (maxChange > 50) {
        result.qualified = false;
        result.rejection_reason = `Extreme Volatility (${maxChange.toFixed(1)}%)`;
        result.layer2.passed = false;
        result.layer2.checks.volatility = { passed: false, max_change: maxChange, msg: 'Extreme' };
        return result;
    } else if (maxChange > 30) {
        result.quality_tags.push('HIGH_VOLATILITY');
        result.layer2.warnings.push('High Volatility');
        result.layer2.checks.volatility = { passed: true, max_change: maxChange, msg: 'High' };
    } else {
        result.layer2.checks.volatility = { passed: true, max_change: maxChange };
    }

    // 2.2 Spread
    let spreadPct = 0;
    if (quote.bid && quote.ask) {
        spreadPct = ((quote.ask - quote.bid) / quote.bid) * 100;
        if (spreadPct >= 10) {
            result.qualified = false;
            result.rejection_reason = `Wide Spread (${spreadPct.toFixed(1)}%)`;
            result.layer2.passed = false;
            result.layer2.checks.spread = { passed: false, spread_pct: spreadPct };
            return result;
        } else if (spreadPct >= 5) {
            result.quality_tags.push('WIDE_SPREAD');
            result.layer2.warnings.push('Wide Spread');
            result.layer2.checks.spread = { passed: true, spread_pct: spreadPct, msg: 'Wide' };
        } else {
            result.layer2.checks.spread = { passed: true, spread_pct: spreadPct };
        }
    } else {
        result.layer2.checks.spread = { passed: true, spread_pct: 0, msg: 'No Bid/Ask Data' };
    }

    // 2.3 Consistency
    let activeDays = 0;
    for (const q of last30) { if (q.volume && q.volume > 0) activeDays++; }
    const consistency = (activeDays / 30) * 100;
    if (consistency < 60) {
        result.qualified = false;
        result.rejection_reason = `Inconsistent Trading (${consistency.toFixed(0)}%)`;
        result.layer2.passed = false;
        result.layer2.checks.consistency = { passed: false, active_pct: consistency };
        return result;
    } else if (consistency < 80) {
        result.quality_tags.push('INCONSISTENT_TRADING');
        result.layer2.warnings.push('Sporadic Trading');
        result.layer2.checks.consistency = { passed: true, active_pct: consistency, msg: 'Sporadic' };
    } else {
        result.layer2.checks.consistency = { passed: true, active_pct: consistency };
    }

    // 2.4 Range
    const highs10 = last10.map(q => q.high || 0);
    const lows10 = last10.map(q => q.low || Infinity);
    const maxP = Math.max(...highs10);
    const minP = Math.min(...lows10);
    const rangePct = minP > 0 ? ((maxP - minP) / minP) * 100 : 0;
    if (rangePct < 5) {
        result.qualified = false;
        result.rejection_reason = `Stagnant Price (Range ${rangePct.toFixed(1)}%)`;
        result.layer2.passed = false;
        result.layer2.checks.range = { passed: false, range_pct: rangePct };
        return result;
    } else {
        result.layer2.checks.range = { passed: true, range_pct: rangePct };
    }

    // --- LAYER 3: TECHNICAL FILTERS ---
    const closes = quotes.map(q => q.close || 0);
    if (!closes.length) return result;

    // 3.1 RSI
    const rsi = calculateRSI(closes, 14);
    if (rsi <= 15 || rsi >= 85) {
        result.qualified = false;
        result.rejection_reason = `RSI Extreme (${rsi.toFixed(1)})`;
        result.layer3.passed = false;
        result.layer3.checks.rsi = { passed: false, value: rsi };
        return result;
    } else {
        result.layer3.checks.rsi = { passed: true, value: rsi };
    }

    // 3.2 Death Cross
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    let deathCross = false;
    const checkDays = Math.min(5, closes.length);
    for (let i = quotes.length - checkDays; i < quotes.length; i++) {
        if (i > 0 && ema20[i - 1] >= ema50[i - 1] && ema20[i] < ema50[i]) {
            deathCross = true;
            break;
        }
    }
    if (deathCross) {
        result.qualified = false;
        result.rejection_reason = 'Death Cross Detected';
        result.layer3.passed = false;
        result.layer3.checks.death_cross = { passed: false };
        return result;
    } else {
        result.layer3.checks.death_cross = { passed: true };
    }

    // 3.3 Volume Collapse
    const currentVol = quotes[quotes.length - 1].volume || 0;
    const avgVol20 = quotes.slice(-20).reduce((acc: number, q: any) => acc + (q.volume || 0), 0) / 20;
    const volRatio = avgVol20 > 0 ? currentVol / avgVol20 : 0;
    if (volRatio < 0.3) {
        result.qualified = false;
        result.rejection_reason = `Volume Collapse (${volRatio.toFixed(2)}x)`;
        result.layer3.passed = false;
        result.layer3.checks.volume_collapse = { passed: false, ratio: volRatio };
        return result;
    } else if (volRatio < 0.5) {
        result.quality_tags.push('LOW_VOLUME');
        result.layer3.warnings.push('Low Volume');
        result.layer3.checks.volume_collapse = { passed: true, ratio: volRatio, msg: 'Low Vol' };
    } else {
        result.layer3.checks.volume_collapse = { passed: true, ratio: volRatio };
    }

    return result;
}

// ============================================================================
// Timeframe Analysis
// ============================================================================

function checkTrend(prices: number[]): { direction: 'UPTREND' | 'DOWNTREND' | 'CONSOLIDATION', ema20: number, ema50: number } {
    const ema20Arr = calculateEMA(prices, 20);
    const ema50Arr = calculateEMA(prices, 50);
    const price = prices[prices.length - 1];
    const ema20 = ema20Arr[ema20Arr.length - 1];
    const ema50 = ema50Arr[ema50Arr.length - 1];

    if (price > ema20 && ema20 > ema50) return { direction: 'UPTREND', ema20, ema50 };
    if (price < ema20 || ema20 < ema50) return { direction: 'DOWNTREND', ema20, ema50 };
    return { direction: 'CONSOLIDATION', ema20, ema50 };
}

function analyzeHourlyFrame(prices: number[], highPrices: number[], lowPrices: number[]): TimeframeAnalysis {
    let score = 0;
    const trend = checkTrend(prices);
    if (trend.direction === 'UPTREND') score += 10;
    else if (trend.direction === 'CONSOLIDATION') score += 5;

    const currentPrice = prices[prices.length - 1];
    const recentLow = Math.min(...lowPrices.slice(-20));
    const recentHigh = Math.max(...highPrices.slice(-20));

    const distToSupport = (currentPrice - recentLow) / recentLow * 100;
    const distToRes = (recentHigh - currentPrice) / recentHigh * 100;

    let setup = 'No clear setup';
    if (distToSupport < 3 && trend.direction !== 'DOWNTREND') { score += 10; setup = 'Near support'; }
    else if (distToRes < 2) { score += 3; setup = 'Near resistance'; }

    let verdict = 'NO SETUP';
    if (score >= 15) verdict = 'IMMEDIATE BUY';
    else if (score >= 10) verdict = 'BUY ON DIP';

    return { trend: trend.direction, score, verdict, support: recentLow, resistance: recentHigh, details: { setup } };
}

function analyzeDailyFrame(prices: number[]): TimeframeAnalysis {
    // Simplified daily analysis for MTF object since we have detailed 7-factor scoring elsewhere
    const trend = checkTrend(prices);
    const rsi = calculateRSI(prices, 14);
    return { trend: trend.direction, score: 0, verdict: trend.direction === 'UPTREND' ? 'BULLISH' : 'BEARISH', details: { rsi } };
}

function generateTradePlan(price: number, action: string, hourly: TimeframeAnalysis, atr1h: number): TradePlan {
    const capital = 50000;
    const riskPct = 0.02;
    const maxRisk = capital * riskPct;

    let primary = price;
    let alternative = hourly.support || price * 0.98;
    if (action.includes('PULLBACK')) { primary = hourly.support || price * 0.98; alternative = (hourly.resistance || price * 1.02) + 1; }

    primary = Math.round(primary);
    alternative = Math.round(alternative);

    const slTech = (hourly.support || price * 0.95) * 0.98;
    const stops = [slTech, price * 0.95, price - (2 * atr1h)].filter(s => s < price);
    const recommendedSL = Math.round(Math.max(...stops));

    const tp1 = Math.round(hourly.resistance || price * 1.05);
    const tp2 = Math.round(tp1 * 1.05);
    const tp3 = Math.round(price + ((price - recommendedSL) * 3));

    const riskPerShare = price - recommendedSL;
    const maxShares = riskPerShare > 0 ? Math.floor(maxRisk / riskPerShare) : 0;
    const lots = Math.floor(maxShares / 100);
    const avgRR = riskPerShare > 0 ? Number((((tp1 - price) / (riskPerShare) + (tp2 - price) / (riskPerShare)) / 2).toFixed(2)) : 0;

    return {
        entry: { primary, alternative, range: `${Math.min(primary, alternative)}-${Math.max(primary, alternative)}`, timing: action },
        stop_loss: { technical: Number(slTech.toFixed(0)), percentage: Number((price * 0.95).toFixed(0)), atr: Number((price - 2 * atr1h).toFixed(0)), recommended: recommendedSL, method: 'Best Fit', rationale: 'Tightest valid stop' },
        take_profit: { tp1: { price: tp1, rr_ratio: '1:1.5', action: 'Sell 30%' }, tp2: { price: tp2, rr_ratio: '1:2.0', action: 'Sell 50%' }, tp3: { price: tp3, rr_ratio: '1:3.0', action: 'Trail' } },
        position_sizing: { capital, max_risk_pct: riskPct * 100, max_risk_idr: maxRisk, entry_price: price, stop_loss: recommendedSL, risk_per_share: riskPerShare, max_shares: maxShares, recommended_lots: lots, shares: lots * 100, required_capital: lots * 100 * price, actual_risk: lots * 100 * riskPerShare },
        risk_reward: { tp1_rr: 1.5, tp2_rr: 2.0, tp3_rr: 3.0, weighted_avg: avgRR, assessment: avgRR > 1.5 ? 'Good' : 'Fair' },
        management_plan: { entry_rules: ['Limit Order'], stop_rules: ['Hard Stop'], exit_rules: ['Scale Out'] },
        trade_summary: { action: `BUY ${lots} lots`, stop: `${recommendedSL}`, targets: `${tp1}/${tp2}`, capital: `${(lots * 100 * price).toLocaleString()}`, risk: `${(lots * 100 * riskPerShare).toLocaleString()}`, potential: 'High', verdict: 'VALID' }
    };
}

// ============================================================================
// Main Analysis
// ============================================================================

async function analyzeStock(symbol: string): Promise<{ filtering: FilteringResult, signal?: SwingSignal }> {
    const fullSymbol = symbol.endsWith('.JK') ? symbol : `${symbol}.JK`;
    let quote;
    try {
        quote = await yahooFinance.quote(fullSymbol);
    } catch (e) {
        return { filtering: { qualified: false, rejection_reason: 'Data Fetch Error', quality_tags: [], layer1: { passed: false, checks: {} as any }, layer2: { passed: false, checks: {} as any, warnings: [] }, layer3: { passed: false, checks: {} as any, warnings: [] } } };
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180); // Need more data for 50 EMA and patterns
    let history;
    try {
        history = await yahooFinance.chart(fullSymbol, { period1: sixMonthsAgo, interval: '1d' });
    } catch (e) {
        return { filtering: { qualified: false, rejection_reason: 'Chart Data Error', quality_tags: [], layer1: { passed: false, checks: {} as any }, layer2: { passed: false, checks: {} as any, warnings: [] }, layer3: { passed: false, checks: {} as any, warnings: [] } } };
    }

    if (!history || !history.quotes || history.quotes.length < 50) {
        return { filtering: { qualified: false, rejection_reason: 'Insufficient Data', quality_tags: [], layer1: { passed: false, checks: {} as any }, layer2: { passed: false, checks: {} as any, warnings: [] }, layer3: { passed: false, checks: {} as any, warnings: [] } } };
    }

    // RUN STRICT FILTERING
    const filtering = runStrictFiltering(quote, history.quotes);
    if (!filtering.qualified) {
        return { filtering };
    }

    // RUN ADVANCED SCORING ENGINE
    const quotes = history.quotes;
    const closes = quotes.map((q: any) => q.close || 0);
    const volumes = quotes.map((q: any) => q.volume || 0);
    const highs = quotes.map((q: any) => q.high || 0);
    const lows = quotes.map((q: any) => q.low || 0);
    const opens = quotes.map((q: any) => q.open || 0);
    const price = quote.regularMarketPrice || 0;

    const technical = calculateTechnicalScore(symbol, closes, volumes, highs, lows, opens);

    // Penalties from Filtering Warnings
    let penaltyScore = 0;
    if (filtering.quality_tags.includes('HIGH_VOLATILITY')) penaltyScore -= 10;
    if (filtering.quality_tags.includes('WIDE_SPREAD')) penaltyScore -= 5;
    if (filtering.quality_tags.includes('INCONSISTENT_TRADING')) penaltyScore -= 10;
    if (filtering.quality_tags.includes('LOW_VOLUME')) penaltyScore -= 5;

    const adjustedScore = Math.max(0, Math.min(100, technical.normalized_score + penaltyScore));

    // MTF
    let multiResult: MultiTimeframeResult | undefined;
    let tradePlan: TradePlan | undefined;
    let recommendation: SwingSignal['recommendation'] = {
        action: adjustedScore > 60 ? 'BUY' : 'WAIT',
        entryZone: [price * 0.99, price * 1.01],
        stopLoss: Math.round(price * 0.95),
        targets: [],
        confidence: technical.confidence_level === 'HIGH' ? 90 : (technical.confidence_level === 'MEDIUM' ? 70 : 50),
        riskLevel: 'MEDIUM',
        rationale: technical.overall_technical_assessment,
        timing: 'Standard Swing'
    };

    if (adjustedScore >= 60) {
        try {
            const hData = await yahooFinance.chart(fullSymbol, { period1: new Date(Date.now() - 20 * 24 * 3600 * 1000), interval: '60m' });
            if (hData.quotes.length > 20) {
                const hourlyAn = analyzeHourlyFrame(hData.quotes.map((q: any) => q.close), hData.quotes.map((q: any) => q.high), hData.quotes.map((q: any) => q.low));
                const dailyAn = analyzeDailyFrame(closes);
                const atr = calculateATR(hData.quotes.map((q: any) => q.high), hData.quotes.map((q: any) => q.low), hData.quotes.map((q: any) => q.close));

                multiResult = {
                    daily: dailyAn,
                    hourly: hourlyAn,
                    fifteen_min: { trend: 'CONSOLIDATION', score: 0, verdict: 'WAIT', momentum: 'NEUTRAL' },
                    alignment: { all_timeframes_bullish: dailyAn.verdict.includes('BULL') && hourlyAn.verdict.includes('BUY'), mtf_score: 90, bonus: 0 }
                };

                if (recommendation.action === 'BUY') {
                    tradePlan = generateTradePlan(price, 'BUY', hourlyAn, atr);
                    recommendation.entryZone = [tradePlan.entry.primary, tradePlan.entry.alternative].sort((a, b) => a - b) as [number, number];
                    recommendation.stopLoss = tradePlan.stop_loss.recommended;
                    recommendation.targets = [tradePlan.take_profit.tp1.price, tradePlan.take_profit.tp2.price, tradePlan.take_profit.tp3.price];
                }
            }
        } catch (e) { }
    }

    const signal: SwingSignal = {
        symbol,
        companyName: quote.longName || symbol,
        price,
        filtering_result: filtering,
        technical_analysis: technical,
        base_score: technical.base_score,
        multipliers: {},
        penalties: { rejection_tags: penaltyScore },
        adjusted_score: adjustedScore,
        risk_assessment: {},
        final_score: adjustedScore,
        grade: adjustedScore > 80 ? 'A' : (adjustedScore > 60 ? 'B' : 'C'),
        multi_timeframe: multiResult,
        trade_plan: tradePlan,
        score: adjustedScore,
        riskRewardRatio: tradePlan ? tradePlan.risk_reward.weighted_avg : 0,
        confluenceFactors: [],
        recommendation,
        timestamp: new Date().toISOString()
    };

    return { filtering, signal };
}

// ============================================================================
// Route Handler
// ============================================================================

const PENNY_UNIVERSE = [
    'GOTO', 'BUMI', 'DEWA', 'BRMS', 'ENRG', 'META', 'DOID', 'ELSA',
    'KIJA', 'APLN', 'SRIL', 'PSAB', 'WIRG', 'WIFI', 'IPPE', 'KRYA',
    'BBKP', 'AGRO', 'WOOD', 'HRUM', 'RAJA', 'ZINC', 'MNCN', 'BCIP',
    'ADRO', 'MDKA', 'PGAS'
];

function generateMarkdownReport(results: SwingSignal[], universeSize: number, rejected: number): string {
    const qualified = results.length;
    let r = `
# Swing Scanner Report (7-Factor Analysis)
Stocks Scanned: ${universeSize} | Qualified: ${qualified} | Rejected: ${rejected}

## Top Candidates
`;
    results.slice(0, 5).forEach((sig, i) => {
        r += `
${i + 1}. **${sig.symbol}** (${sig.price} IDR) - Score ${sig.final_score}
   **Tech**: ${sig.technical_analysis?.overall_technical_assessment || 'N/A'}
   **Plan**: Buy ${sig.trade_plan?.entry.range || '-'}, Stop ${sig.trade_plan?.stop_loss.recommended || '-'}, Target ${sig.trade_plan?.take_profit.tp1.price || '-'}
   **Breakdown**: Trend(${sig.technical_analysis?.factor_breakdown.trend.score}) Mom(${sig.technical_analysis?.factor_breakdown.momentum.score}) MACD(${sig.technical_analysis?.factor_breakdown.macd.score})
`;
    });
    return r;
}

export async function GET(request: NextRequest) {
    const universe = [...PENNY_UNIVERSE, ...BPJS_UNIVERSE.map(s => s.symbol)];
    const uniqueUniverse = Array.from(new Set(universe));

    let stats = {
        total_scanned: uniqueUniverse.length,
        layer1_rejections: 0,
        layer2_rejections: 0,
        layer3_rejections: 0,
        qualified: 0
    };

    const results: SwingSignal[] = [];
    const batchSize = 5;

    for (let i = 0; i < uniqueUniverse.length; i += batchSize) {
        const batch = uniqueUniverse.slice(i, i + batchSize);
        const promises = batch.map(sym => analyzeStock(sym));
        const batchRes = await Promise.all(promises);

        batchRes.forEach(res => {
            if (!res.filtering.qualified) {
                if (!res.filtering.layer1.passed) stats.layer1_rejections++;
                else if (!res.filtering.layer2.passed) stats.layer2_rejections++;
                else if (!res.filtering.layer3.passed) stats.layer3_rejections++;
            } else if (res.signal) {
                stats.qualified++;
                results.push(res.signal);
            }
        });

        if (i + batchSize < uniqueUniverse.length) await new Promise(r => setTimeout(r, 200));
    }

    const sortedResults = results.sort((a, b) => b.final_score - a.final_score);
    const report = generateMarkdownReport(sortedResults, stats.total_scanned, stats.total_scanned - stats.qualified);

    return NextResponse.json({
        summary: stats,
        formatted_report: report,
        data: sortedResults
    });
}
