/**
 * Technical Indicators Library for IDX Trading Assistant
 * 
 * Provides comprehensive technical analysis calculations including:
 * - RSI (Relative Strength Index)
 * - MACD (Moving Average Convergence Divergence)
 * - Bollinger Bands
 * - EMA (Exponential Moving Average)
 * - SMA (Simple Moving Average)
 * - Volume Analysis
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type Signal = 'BUY' | 'SELL' | 'NEUTRAL';
export type MACDCrossover = 'BULLISH' | 'BEARISH' | 'NONE';
export type VolumeSignal = 'HIGH_VOLUME' | 'LOW_VOLUME' | 'NORMAL';

export interface IndicatorResult {
    values: number[];
    current: number;
    signal: Signal;
    strength: number; // 0-100
}

export interface MACDResult {
    macdLine: number[];
    signalLine: number[];
    histogram: number[];
    current: {
        macd: number;
        signal: number;
        histogram: number;
    };
    crossover: MACDCrossover;
}

export interface BollingerBandsResult {
    upper: number[];
    middle: number[];
    lower: number[];
    current: {
        upper: number;
        middle: number;
        lower: number;
        bandwidth: number;
    };
    signal: Signal;
}

export interface VolumeAnalysisResult {
    averageVolume: number;
    currentVolume: number;
    volumeRatio: number;
    isSpike: boolean;
    signal: VolumeSignal;
}

export interface ATRResult {
    values: number[];
    current: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates and filters out invalid numbers from an array
 * @param data - Array of numbers to validate
 * @returns Filtered array with only valid numbers
 */
function sanitizeData(data: number[]): number[] {
    return data.filter((val) => val !== null && val !== undefined && !isNaN(val) && isFinite(val));
}

/**
 * Checks if there are enough data points for calculation
 * @param data - Array of price data
 * @param minRequired - Minimum data points required
 * @returns True if sufficient data exists
 */
function hasMinimumData(data: number[], minRequired: number): boolean {
    return data.length >= minRequired;
}

// ============================================================================
// Moving Averages
// ============================================================================

/**
 * Calculates Simple Moving Average (SMA)
 * @param prices - Array of price data (oldest to newest)
 * @param period - Number of periods for calculation
 * @returns IndicatorResult with SMA values and signal
 * @example
 * const result = calculateSMA([10, 11, 12, 13, 14, 15], 3);
 * // result.values = [11, 12, 13, 14]
 */
export function calculateSMA(prices: number[], period: number): IndicatorResult | null {
    const data = sanitizeData(prices);

    if (!hasMinimumData(data, period) || period < 1) {
        return null;
    }

    const values: number[] = [];

    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j];
        }
        values.push(sum / period);
    }

    const current = values[values.length - 1];
    const lastPrice = data[data.length - 1];

    // Signal: price above SMA = bullish, below = bearish
    const percentDiff = ((lastPrice - current) / current) * 100;
    let signal: Signal = 'NEUTRAL';
    if (percentDiff > 1) signal = 'BUY';
    else if (percentDiff < -1) signal = 'SELL';

    // Strength based on distance from SMA
    const strength = Math.min(100, Math.abs(percentDiff) * 10);

    return { values, current, signal, strength };
}

/**
 * Calculates Exponential Moving Average (EMA)
 * @param prices - Array of price data (oldest to newest)
 * @param period - Number of periods for calculation
 * @returns IndicatorResult with EMA values and signal
 * @example
 * const result = calculateEMA([10, 11, 12, 13, 14, 15], 3);
 */
export function calculateEMA(prices: number[], period: number): IndicatorResult | null {
    const data = sanitizeData(prices);

    if (!hasMinimumData(data, period) || period < 1) {
        return null;
    }

    const multiplier = 2 / (period + 1);
    const values: number[] = [];

    // First EMA value is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i];
    }
    let ema = sum / period;
    values.push(ema);

    // Calculate remaining EMA values
    for (let i = period; i < data.length; i++) {
        ema = (data[i] - ema) * multiplier + ema;
        values.push(ema);
    }

    const current = values[values.length - 1];
    const lastPrice = data[data.length - 1];

    const percentDiff = ((lastPrice - current) / current) * 100;
    let signal: Signal = 'NEUTRAL';
    if (percentDiff > 0.5) signal = 'BUY';
    else if (percentDiff < -0.5) signal = 'SELL';

    const strength = Math.min(100, Math.abs(percentDiff) * 15);

    return { values, current, signal, strength };
}

// ============================================================================
// RSI (Relative Strength Index)
// ============================================================================

/**
 * Calculates RSI (Relative Strength Index)
 * 
 * RSI interpretation:
 * - RSI > 70: Overbought (potential SELL signal)
 * - RSI < 30: Oversold (potential BUY signal)
 * - RSI 30-70: Neutral zone
 * 
 * @param prices - Array of price data (oldest to newest)
 * @param period - RSI period (default: 14)
 * @returns IndicatorResult with RSI values and signal
 */
export function calculateRSI(prices: number[], period: number = 14): IndicatorResult | null {
    const data = sanitizeData(prices);

    // Need at least period + 1 data points to calculate first RSI
    if (!hasMinimumData(data, period + 1) || period < 1) {
        return null;
    }

    const values: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate first average gain and loss
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < period; i++) {
        avgGain += gains[i];
        avgLoss += losses[i];
    }
    avgGain /= period;
    avgLoss /= period;

    // First RSI value
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));
    values.push(rsi);

    // Calculate remaining RSI values using smoothed averages
    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
        values.push(rsi);
    }

    const current = values[values.length - 1];

    // Validate result
    if (isNaN(current) || !isFinite(current)) {
        console.error('[RSI] Calculation produced invalid result:', current);
        return null;
    }

    // Signal determination
    let signal: Signal = 'NEUTRAL';
    if (current < 30) signal = 'BUY';      // Oversold
    else if (current > 70) signal = 'SELL'; // Overbought

    // Strength: how far from neutral (50)
    const strength = Math.abs(current - 50) * 2;

    console.log(`[RSI] Calculated: ${current.toFixed(2)}, Signal: ${signal}`);
    return { values, current, signal, strength };
}

// ============================================================================
// MACD (Moving Average Convergence Divergence)
// ============================================================================

/**
 * Calculates MACD (Moving Average Convergence Divergence)
 * 
 * Components:
 * - MACD Line: Fast EMA - Slow EMA
 * - Signal Line: EMA of MACD Line
 * - Histogram: MACD Line - Signal Line
 * 
 * Crossover signals:
 * - BULLISH: MACD crosses above Signal
 * - BEARISH: MACD crosses below Signal
 * 
 * @param prices - Array of price data (oldest to newest)
 * @param fastPeriod - Fast EMA period (default: 12)
 * @param slowPeriod - Slow EMA period (default: 26)
 * @param signalPeriod - Signal line period (default: 9)
 * @returns MACDResult with all MACD components
 */
export function calculateMACD(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): MACDResult | null {
    const data = sanitizeData(prices);

    // Need enough data for slow EMA + signal period
    const minRequired = slowPeriod + signalPeriod;
    if (!hasMinimumData(data, minRequired) || fastPeriod >= slowPeriod) {
        return null;
    }

    // Calculate fast and slow EMAs
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);

    if (!fastEMA || !slowEMA) return null;

    // Align arrays - slow EMA starts later
    const offset = slowPeriod - fastPeriod;
    const macdLine: number[] = [];

    for (let i = 0; i < slowEMA.values.length; i++) {
        macdLine.push(fastEMA.values[i + offset] - slowEMA.values[i]);
    }

    // Calculate signal line (EMA of MACD)
    if (macdLine.length < signalPeriod) return null;

    const signalEMA = calculateEMA(macdLine, signalPeriod);
    if (!signalEMA) return null;

    const signalLine = signalEMA.values;

    // Calculate histogram
    const histogramOffset = macdLine.length - signalLine.length;
    const histogram: number[] = [];

    for (let i = 0; i < signalLine.length; i++) {
        histogram.push(macdLine[i + histogramOffset] - signalLine[i]);
    }

    // Determine crossover
    let crossover: MACDCrossover = 'NONE';
    if (histogram.length >= 2) {
        const currentHist = histogram[histogram.length - 1];
        const prevHist = histogram[histogram.length - 2];

        if (prevHist < 0 && currentHist >= 0) crossover = 'BULLISH';
        else if (prevHist > 0 && currentHist <= 0) crossover = 'BEARISH';
    }

    const currentMACD = macdLine[macdLine.length - 1];
    const currentSignal = signalLine[signalLine.length - 1];
    const currentHistogram = histogram[histogram.length - 1];

    // Validate result
    if (isNaN(currentMACD) || isNaN(currentSignal) || isNaN(currentHistogram)) {
        console.error('[MACD] Calculation produced invalid result');
        return null;
    }

    console.log(`[MACD] Calculated: MACD=${currentMACD.toFixed(2)}, Signal=${currentSignal.toFixed(2)}, Crossover=${crossover}`);

    return {
        macdLine,
        signalLine,
        histogram,
        current: {
            macd: currentMACD,
            signal: currentSignal,
            histogram: currentHistogram,
        },
        crossover,
    };
}

// ============================================================================
// Bollinger Bands
// ============================================================================

/**
 * Calculates Bollinger Bands
 * 
 * Components:
 * - Upper Band: SMA + (stdDev * standard deviation)
 * - Middle Band: SMA
 * - Lower Band: SMA - (stdDev * standard deviation)
 * 
 * Signals:
 * - Price near lower band: potential BUY
 * - Price near upper band: potential SELL
 * 
 * @param prices - Array of price data (oldest to newest)
 * @param period - SMA period (default: 20)
 * @param stdDevMultiplier - Standard deviation multiplier (default: 2)
 * @returns BollingerBandsResult with all band values
 */
export function calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDevMultiplier: number = 2
): BollingerBandsResult | null {
    const data = sanitizeData(prices);

    if (!hasMinimumData(data, period) || period < 1) {
        return null;
    }

    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];

    for (let i = period - 1; i < data.length; i++) {
        // Calculate SMA for this window
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j];
        }
        const sma = sum / period;

        // Calculate standard deviation
        let squaredDiffSum = 0;
        for (let j = 0; j < period; j++) {
            squaredDiffSum += Math.pow(data[i - j] - sma, 2);
        }
        const stdDev = Math.sqrt(squaredDiffSum / period);

        middle.push(sma);
        upper.push(sma + stdDevMultiplier * stdDev);
        lower.push(sma - stdDevMultiplier * stdDev);
    }

    const currentUpper = upper[upper.length - 1];
    const currentMiddle = middle[middle.length - 1];
    const currentLower = lower[lower.length - 1];
    const currentPrice = data[data.length - 1];

    // Validate result
    if (isNaN(currentUpper) || isNaN(currentMiddle) || isNaN(currentLower)) {
        console.error('[BB] Calculation produced invalid result');
        return null;
    }

    // Bandwidth: percentage difference between bands
    const bandwidth = ((currentUpper - currentLower) / currentMiddle) * 100;

    // Signal based on price position within bands
    let signal: Signal = 'NEUTRAL';
    const bandRange = currentUpper - currentLower;
    const positionInBand = (currentPrice - currentLower) / bandRange;

    if (positionInBand < 0.2) signal = 'BUY';       // Near lower band
    else if (positionInBand > 0.8) signal = 'SELL'; // Near upper band

    console.log(`[BB] Calculated: Upper=${currentUpper.toFixed(2)}, Middle=${currentMiddle.toFixed(2)}, Lower=${currentLower.toFixed(2)}, Signal=${signal}`);

    return {
        upper,
        middle,
        lower,
        current: {
            upper: currentUpper,
            middle: currentMiddle,
            lower: currentLower,
            bandwidth,
        },
        signal,
    };
}

// ============================================================================
// Volume Analysis
// ============================================================================

/**
 * Analyzes volume for spike detection
 * 
 * A volume spike occurs when current volume exceeds the average
 * by the specified threshold (default: 150% or 1.5x)
 * 
 * @param volumes - Array of volume data (oldest to newest)
 * @param period - Period for average calculation (default: 20)
 * @param spikeThreshold - Threshold multiplier for spike detection (default: 1.5)
 * @returns VolumeAnalysisResult with analysis
 */
export function analyzeVolume(
    volumes: number[],
    period: number = 20,
    spikeThreshold: number = 1.5
): VolumeAnalysisResult | null {
    const data = sanitizeData(volumes);

    if (!hasMinimumData(data, period) || period < 1) {
        return null;
    }

    // Calculate average volume over period
    let sum = 0;
    const startIndex = data.length - period;
    for (let i = startIndex; i < data.length - 1; i++) {
        sum += data[i];
    }
    const averageVolume = sum / (period - 1);

    const currentVolume = data[data.length - 1];
    const volumeRatio = currentVolume / averageVolume;
    const isSpike = volumeRatio >= spikeThreshold;

    // Signal determination
    let signal: VolumeSignal = 'NORMAL';
    if (volumeRatio >= spikeThreshold) signal = 'HIGH_VOLUME';
    else if (volumeRatio < 0.5) signal = 'LOW_VOLUME';

    return {
        averageVolume,
        currentVolume,
        volumeRatio,
        isSpike,
        signal,
    };
}

// ============================================================================
// Composite Analysis
// ============================================================================

/**
 * Comprehensive technical analysis result
 */
export interface TechnicalAnalysisResult {
    rsi: IndicatorResult | null;
    macd: MACDResult | null;
    bollingerBands: BollingerBandsResult | null;
    sma20: IndicatorResult | null;
    ema12: IndicatorResult | null;
    volume: VolumeAnalysisResult | null;
    atr: number | null;
    overallSignal: Signal;
    confidence: number;
}

/**
 * Calculates Average True Range (ATR)
 * 
 * @param highs - Array of high prices
 * @param lows - Array of low prices
 * @param closes - Array of closing prices
 * @param period - Period (default: 14)
 * @returns ATRResult
 */
export function calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14
): ATRResult | null {
    if (!highs || !lows || !closes || highs.length < period + 1) return null;

    const trueRanges: number[] = [];

    // Calculate True Range for each day
    // TR = Max(High-Low, Abs(High-PrevClose), Abs(Low-PrevClose))
    for (let i = 1; i < highs.length; i++) {
        const high = highs[i];
        const low = lows[i];
        const prevClose = closes[i - 1];

        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        trueRanges.push(tr);
    }

    // First ATR = Simple Average of TRs
    let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    const values: number[] = [atr];

    // Subsequent ATRs = ((Prior ATR * (period-1)) + Current TR) / period
    for (let i = period; i < trueRanges.length; i++) {
        atr = ((atr * (period - 1)) + trueRanges[i]) / period;
        values.push(atr);
    }

    return {
        values,
        current: values[values.length - 1]
    };
}

/**
 * Performs comprehensive technical analysis on price and volume data
 * 
 * @param prices - Array of closing prices (oldest to newest)
 * @param volumes - Array of volume data (oldest to newest)
 * @returns Complete technical analysis with overall signal
 */
export function performTechnicalAnalysis(
    prices: number[],
    volumes: number[],
    highs?: number[],
    lows?: number[]
): TechnicalAnalysisResult {
    // Input validation
    if (!prices || !Array.isArray(prices)) {
        throw new Error('Invalid input: prices must be an array');
    }

    if (prices.length === 0) {
        throw new Error('No price data provided');
    }

    // Filter invalid values
    const validPrices = prices.filter(p =>
        typeof p === 'number' && !isNaN(p) && isFinite(p) && p > 0
    );

    if (validPrices.length < 20) {
        throw new Error(
            `Insufficient valid data points: ${validPrices.length} found, 20 minimum required. ` +
            `Original array had ${prices.length} elements.`
        );
    }

    if (validPrices.length < 50) {
        console.warn(
            `[Indicators] Warning: Only ${validPrices.length} data points. ` +
            `Some indicators (EMA50) may be less accurate.`
        );
    }

    console.log(`[Indicators] Processing ${validPrices.length} valid price points`);

    // Validate volumes if provided
    const validVolumes = volumes?.filter(v =>
        typeof v === 'number' && !isNaN(v) && isFinite(v) && v >= 0
    ) || [];

    const rsi = calculateRSI(validPrices);
    const macd = calculateMACD(validPrices);
    const bollingerBands = calculateBollingerBands(validPrices);
    const sma20 = calculateSMA(validPrices, 20);
    const ema12 = calculateEMA(validPrices, 12);
    const volume = validVolumes.length >= 20 ? analyzeVolume(validVolumes) : null;

    // Calculate ATR if highs and lows are provided
    let atr = null;
    if (highs && lows && highs.length === prices.length && lows.length === prices.length) {
        const atrResult = calculateATR(highs, lows, prices);
        if (atrResult) {
            atr = atrResult.current;
            console.log(`[Indicators] ATR Calculated: ${atr.toFixed(0)}`);
        }
    }

    // Calculate overall signal based on all indicators
    let buyScore = 0;
    let sellScore = 0;
    let indicatorCount = 0;

    if (rsi) {
        indicatorCount++;
        if (rsi.signal === 'BUY') buyScore++;
        else if (rsi.signal === 'SELL') sellScore++;
    }

    if (macd) {
        indicatorCount++;
        if (macd.crossover === 'BULLISH') buyScore++;
        else if (macd.crossover === 'BEARISH') sellScore++;
    }

    if (bollingerBands) {
        indicatorCount++;
        if (bollingerBands.signal === 'BUY') buyScore++;
        else if (bollingerBands.signal === 'SELL') sellScore++;
    }

    if (sma20) {
        indicatorCount++;
        if (sma20.signal === 'BUY') buyScore++;
        else if (sma20.signal === 'SELL') sellScore++;
    }

    if (ema12) {
        indicatorCount++;
        if (ema12.signal === 'BUY') buyScore++;
        else if (ema12.signal === 'SELL') sellScore++;
    }

    // Determine overall signal
    let overallSignal: Signal = 'NEUTRAL';
    if (indicatorCount > 0) {
        const buyRatio = buyScore / indicatorCount;
        const sellRatio = sellScore / indicatorCount;

        if (buyRatio >= 0.6) overallSignal = 'BUY';
        else if (sellRatio >= 0.6) overallSignal = 'SELL';
    }

    // Confidence based on agreement between indicators
    const maxScore = Math.max(buyScore, sellScore);
    const confidence = indicatorCount > 0
        ? Math.round((maxScore / indicatorCount) * 100)
        : 0;

    return {
        rsi,
        macd,
        bollingerBands,
        sma20,
        ema12,
        volume,
        atr,
        overallSignal,
        confidence,
    };
}
