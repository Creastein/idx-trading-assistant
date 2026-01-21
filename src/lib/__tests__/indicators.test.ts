import { describe, it, expect } from 'vitest'
import { calculateRSI, calculateSMA, calculateEMA, calculateBollingerBands } from '../indicators'

// Mock Data: 20 days of increasing prices
const mockPrices = Array.from({ length: 20 }, (_, i) => 100 + i * 2)
// [100, 102, 104, ..., 138]

describe('Technical Indicators', () => {

    describe('calculateSMA', () => {
        it('should calculate Simple Moving Average correctly', () => {
            // SMA of [1, 2, 3, 4, 5] period 5 is 3
            const simplePrices = [1, 2, 3, 4, 5]
            const result = calculateSMA(simplePrices, 5)

            expect(result).not.toBeNull()
            if (result) {
                // The implementation returns ONLY valid values, no padding.
                // For [1..5] period 5, there is only 1 valid SMA value (3).
                expect(result.values).toHaveLength(1)
                expect(result.values[0]).toBe(3)
                expect(result.current).toBe(3)
            }
        })

        it('should handle insufficient data', () => {
            const result = calculateSMA([1, 2], 5)
            expect(result).toBeNull()
        })
    })

    describe('calculateEMA', () => {
        it('should calculate Exponential Moving Average', () => {
            const prices = [10, 11, 12, 13, 14]
            // Period 3.  Length 5.
            // i=0,1,2 (values 10,11,12) -> SMA = 11. 
            // values[0] = 11.
            // i=3 (val 13). EMA = (13-11)*0.5 + 11 = 12. values[1] = 12.
            // i=4 (val 14). EMA = (14-12)*0.5 + 12 = 13. values[2] = 13.

            const result = calculateEMA(prices, 3)

            expect(result).not.toBeNull()
            if (result) {
                expect(result.values).toHaveLength(3) // 5 - 3 + 1? No.
                // Implementation loop: 
                // First pushes SMA (1 value).
                // Then loop i=period (3) to length (5). i=3, i=4. (2 values).
                // Total 3 values. [11, 12, 13]

                expect(result.values[0]).toBe(11)
                expect(result.values[result.values.length - 1]).toBe(13)
            }
        })
    })

    describe('calculateRSI', () => {
        it('should calculate RSI correctly', () => {
            const prices = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128]
            const result = calculateRSI(prices, 14)

            expect(result).not.toBeNull()

            if (result) {
                // RSI period 14. Prices length 15.
                // Data needed: 15 points (period + 1) to get FIRST gain/loss calc?
                // Logic: 
                // for i=1 to len (14 changes).
                // first RSI needs 14 changes.
                // We have 14 changes exactly.
                // So should return 1 RSI value.

                expect(result.values.length).toBeGreaterThan(0)
                const currentRSI = result.current

                expect(currentRSI).toBeGreaterThanOrEqual(0)
                expect(currentRSI).toBeLessThanOrEqual(100)

                // With pure uptrend, RSI should be very high (approaching 100)
                expect(currentRSI).toBeGreaterThan(99)
            }
        })
    })

    describe('calculateBollingerBands', () => {
        it('should ensure upper band > lower band', () => {
            const prices = [10, 12, 11, 13, 12, 14, 15, 16, 15, 17, 18, 19, 20, 21, 22, 23, 22, 24, 25, 26]
            const result = calculateBollingerBands(prices, 20, 2)

            expect(result).not.toBeNull()

            if (result) {
                const { upper, middle, lower } = result

                // Implementation: loop i=period-1 (19) to len (20). 1 iteration.
                expect(upper.length).toBe(1)

                const lastUpper = upper[upper.length - 1]
                const lastLower = lower[lower.length - 1]
                const lastMiddle = middle[middle.length - 1]

                expect(lastUpper).toBeGreaterThan(lastLower)
                expect(lastMiddle).toBeGreaterThan(lastLower)
                expect(lastUpper).toBeGreaterThan(lastMiddle)
            }
        })
    })

})
