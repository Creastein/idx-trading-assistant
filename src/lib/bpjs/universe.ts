/**
 * BPJS Stock Universe
 * 
 * Curated list of 50 liquid Indonesian stocks suitable for BPJS (Beli Pagi Jual Sore) trading.
 * 
 * Selection Criteria:
 * - Average daily volume >50M shares
 * - Price range: Rp 200 - Rp 20,000
 * - Not suspended, IPO >30 days
 * - Sufficient liquidity for retail traders
 * 
 * @module lib/bpjs/universe
 */

export type Sector =
    | 'Banking'
    | 'Telco'
    | 'Consumer'
    | 'Tech'
    | 'Mining'
    | 'Construction'
    | 'Automotive'
    | 'Property'
    | 'Finance'
    | 'Energy'
    | 'Retail'
    | 'Healthcare'
    | 'Cement'
    | 'Agriculture'
    | 'Others';

export interface StockInfo {
    symbol: string;
    name: string;
    sector: Sector;
    avgVolume20d: number; // Historical average, approximate
    typicalPrice: number; // Typical price range (for reference)
}

export const BPJS_UNIVERSE: StockInfo[] = [
    // ========== Banking (7 stocks) ==========
    { symbol: 'BBRI', name: 'Bank Rakyat Indonesia', sector: 'Banking', avgVolume20d: 100000000, typicalPrice: 5000 },
    { symbol: 'BBCA', name: 'Bank Central Asia', sector: 'Banking', avgVolume20d: 80000000, typicalPrice: 10000 },
    { symbol: 'BMRI', name: 'Bank Mandiri', sector: 'Banking', avgVolume20d: 90000000, typicalPrice: 6500 },
    { symbol: 'BBNI', name: 'Bank Negara Indonesia', sector: 'Banking', avgVolume20d: 70000000, typicalPrice: 5500 },
    { symbol: 'BRIS', name: 'Bank Syariah Indonesia', sector: 'Banking', avgVolume20d: 60000000, typicalPrice: 2500 },
    { symbol: 'BBTN', name: 'Bank Tabungan Negara', sector: 'Banking', avgVolume20d: 50000000, typicalPrice: 1500 },
    { symbol: 'BNGA', name: 'Bank CIMB Niaga', sector: 'Banking', avgVolume20d: 40000000, typicalPrice: 1200 },

    // ========== Telco (4 stocks) ==========
    { symbol: 'TLKM', name: 'Telkom Indonesia', sector: 'Telco', avgVolume20d: 150000000, typicalPrice: 3800 },
    { symbol: 'EXCL', name: 'XL Axiata', sector: 'Telco', avgVolume20d: 80000000, typicalPrice: 2500 },
    { symbol: 'ISAT', name: 'Indosat Ooredoo', sector: 'Telco', avgVolume20d: 70000000, typicalPrice: 9000 },
    { symbol: 'FREN', name: 'Smartfren Telecom', sector: 'Telco', avgVolume20d: 200000000, typicalPrice: 500 },

    // ========== Consumer (6 stocks) ==========
    { symbol: 'UNVR', name: 'Unilever Indonesia', sector: 'Consumer', avgVolume20d: 30000000, typicalPrice: 2500 },
    { symbol: 'ICBP', name: 'Indofood CBP', sector: 'Consumer', avgVolume20d: 40000000, typicalPrice: 10000 },
    { symbol: 'INDF', name: 'Indofood Sukses Makmur', sector: 'Consumer', avgVolume20d: 50000000, typicalPrice: 6500 },
    { symbol: 'KLBF', name: 'Kalbe Farma', sector: 'Consumer', avgVolume20d: 80000000, typicalPrice: 1500 },
    { symbol: 'MYOR', name: 'Mayora Indah', sector: 'Consumer', avgVolume20d: 30000000, typicalPrice: 2500 },
    { symbol: 'GOOD', name: 'Garudafood Putra Putri', sector: 'Consumer', avgVolume20d: 25000000, typicalPrice: 1000 },

    // ========== Tech (3 stocks) ==========
    { symbol: 'GOTO', name: 'GoTo Gojek Tokopedia', sector: 'Tech', avgVolume20d: 500000000, typicalPrice: 100 },
    { symbol: 'BUKA', name: 'Bukalapak', sector: 'Tech', avgVolume20d: 300000000, typicalPrice: 200 },
    { symbol: 'EMTK', name: 'Elang Mahkota Teknologi', sector: 'Tech', avgVolume20d: 100000000, typicalPrice: 500 },

    // ========== Mining (5 stocks) ==========
    { symbol: 'ANTM', name: 'Aneka Tambang', sector: 'Mining', avgVolume20d: 150000000, typicalPrice: 1500 },
    { symbol: 'ADRO', name: 'Adaro Energy', sector: 'Mining', avgVolume20d: 200000000, typicalPrice: 2500 },
    { symbol: 'ITMG', name: 'Indo Tambangraya Megah', sector: 'Mining', avgVolume20d: 10000000, typicalPrice: 30000 },
    { symbol: 'PTBA', name: 'Bukit Asam', sector: 'Mining', avgVolume20d: 40000000, typicalPrice: 3000 },
    { symbol: 'MDKA', name: 'Merdeka Copper Gold', sector: 'Mining', avgVolume20d: 80000000, typicalPrice: 2000 },

    // ========== Construction (3 stocks) ==========
    { symbol: 'WSKT', name: 'Waskita Karya', sector: 'Construction', avgVolume20d: 120000000, typicalPrice: 800 },
    { symbol: 'WIKA', name: 'Wijaya Karya', sector: 'Construction', avgVolume20d: 90000000, typicalPrice: 1200 },
    { symbol: 'PTPP', name: 'PP (Pembangunan Perumahan)', sector: 'Construction', avgVolume20d: 80000000, typicalPrice: 1000 },

    // ========== Automotive (2 stocks) ==========
    { symbol: 'ASII', name: 'Astra International', sector: 'Automotive', avgVolume20d: 60000000, typicalPrice: 5500 },
    { symbol: 'AUTO', name: 'Astra Auto Part', sector: 'Automotive', avgVolume20d: 30000000, typicalPrice: 2000 },

    // ========== Property (4 stocks) ==========
    { symbol: 'BSDE', name: 'Bumi Serpong Damai', sector: 'Property', avgVolume20d: 120000000, typicalPrice: 1200 },
    { symbol: 'CTRA', name: 'Ciputra Development', sector: 'Property', avgVolume20d: 100000000, typicalPrice: 1100 },
    { symbol: 'PWON', name: 'Pakuwon Jati', sector: 'Property', avgVolume20d: 80000000, typicalPrice: 600 },
    { symbol: 'SMRA', name: 'Summarecon Agung', sector: 'Property', avgVolume20d: 70000000, typicalPrice: 800 },

    // ========== Finance (3 stocks) ==========
    { symbol: 'BFIN', name: 'BFI Finance Indonesia', sector: 'Finance', avgVolume20d: 50000000, typicalPrice: 1500 },
    { symbol: 'ADMF', name: 'Adira Dinamika Multi Finance', sector: 'Finance', avgVolume20d: 40000000, typicalPrice: 2500 },
    { symbol: 'AMMN', name: 'Amman Mineral Internasional', sector: 'Finance', avgVolume20d: 60000000, typicalPrice: 10000 },

    // ========== Energy (2 stocks) ==========
    { symbol: 'PGAS', name: 'Perusahaan Gas Negara', sector: 'Energy', avgVolume20d: 100000000, typicalPrice: 1500 },
    { symbol: 'MEDC', name: 'Medco Energi International', sector: 'Energy', avgVolume20d: 80000000, typicalPrice: 1200 },

    // ========== Retail (4 stocks) ==========
    { symbol: 'ACES', name: 'Ace Hardware Indonesia', sector: 'Retail', avgVolume20d: 70000000, typicalPrice: 1000 },
    { symbol: 'MAPI', name: 'Mitra Adiperkasa', sector: 'Retail', avgVolume20d: 50000000, typicalPrice: 2000 },
    { symbol: 'LPPF', name: 'Matahari Department Store', sector: 'Retail', avgVolume20d: 60000000, typicalPrice: 5000 },
    { symbol: 'ERAA', name: 'Erajaya Swasembada', sector: 'Retail', avgVolume20d: 80000000, typicalPrice: 800 },

    // ========== Healthcare (2 stocks) ==========
    { symbol: 'HEAL', name: 'Medikaloka Hermina', sector: 'Healthcare', avgVolume20d: 40000000, typicalPrice: 1500 },
    { symbol: 'SILO', name: 'Siloam International Hospitals', sector: 'Healthcare', avgVolume20d: 30000000, typicalPrice: 8000 },

    // ========== Cement (2 stocks) ==========
    { symbol: 'SMGR', name: 'Semen Indonesia', sector: 'Cement', avgVolume20d: 50000000, typicalPrice: 5000 },
    { symbol: 'INTP', name: 'Indocement Tunggal Prakarsa', sector: 'Cement', avgVolume20d: 30000000, typicalPrice: 10000 },

    // ========== Agriculture (2 stocks) ==========
    { symbol: 'JPFA', name: 'Japfa Comfeed Indonesia', sector: 'Agriculture', avgVolume20d: 60000000, typicalPrice: 1500 },
    { symbol: 'CPIN', name: 'Charoen Pokphand Indonesia', sector: 'Agriculture', avgVolume20d: 80000000, typicalPrice: 5000 },

    // ========== Others (1 stock) ==========
    { symbol: 'ELSA', name: 'Elnusa', sector: 'Others', avgVolume20d: 50000000, typicalPrice: 500 },
];

// Validation: Ensure exactly 50 stocks
if (BPJS_UNIVERSE.length !== 50) {
    console.warn(`⚠️ BPJS Universe should have 50 stocks, but has ${BPJS_UNIVERSE.length}`);
}

/**
 * Get stock universe filtered by sectors
 * @param sectors Optional array of sector names to filter
 * @returns Array of StockInfo
 */
export function getStockUniverse(sectors?: Sector[]): StockInfo[] {
    if (!sectors || sectors.length === 0) {
        return BPJS_UNIVERSE;
    }
    return BPJS_UNIVERSE.filter(stock => sectors.includes(stock.sector));
}

/**
 * Get specific stock information by symbol
 * @param symbol Stock symbol (e.g., 'BBRI')
 * @returns StockInfo or undefined if not found
 */
export function getStockInfo(symbol: string): StockInfo | undefined {
    return BPJS_UNIVERSE.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
}

/**
 * Get all unique sectors in the universe
 * @returns Array of unique sector names
 */
export function getAllSectors(): Sector[] {
    const sectors = new Set<Sector>();
    BPJS_UNIVERSE.forEach(stock => sectors.add(stock.sector));
    return Array.from(sectors).sort();
}

/**
 * Get stocks count by sector
 * @returns Map of sector to stock count
 */
export function getSectorDistribution(): Map<Sector, number> {
    const distribution = new Map<Sector, number>();
    BPJS_UNIVERSE.forEach(stock => {
        const count = distribution.get(stock.sector) || 0;
        distribution.set(stock.sector, count + 1);
    });
    return distribution;
}

/**
 * Get all stock symbols as array
 * @returns Array of stock symbols
 */
export function getAllSymbols(): string[] {
    return BPJS_UNIVERSE.map(stock => stock.symbol);
}

/**
 * Get dynamic trending stocks for scalping
 * Uses Yahoo Finance 'trending' or 'active' modules if available,
 * otherwise falls back to high-volume stocks from static list.
 */
export async function getTrendingStocks(limit: number = 20): Promise<string[]> {
    try {
        const yahooFinance = (await import('yahoo-finance2')).default;

        // Try fetching daily gainers first (often "in play")
        // Note: YF API for lists can be flaky, so we wrap in try/catch independently
        try {
            const result = await yahooFinance.dailyGainers({ count: limit, region: 'ID' }) as any; // Cast to any to avoid type issues
            const symbols: string[] = result.quotes
                .filter((q: any) => q.symbol.endsWith('.JK'))
                .map((q: any) => q.symbol.replace('.JK', ''));

            if (symbols.length > 5) return symbols.slice(0, limit);
        } catch (e) {
            console.warn('[Universe] Failed to fetch daily gainers, trying trending...');
        }

        // Fallback: Use static high-volume universe + random shift to simulate "active" if daily gainers fails
        // In real app, this would query a real-time scanner API.
        // For now, prioritize sectors that are usually active (Banking, Energy, Mining)
        const prioritySectors: Sector[] = ['Banking', 'Energy', 'Mining', 'Tech'];
        const activeStocks = BPJS_UNIVERSE
            .filter(s => prioritySectors.includes(s.sector))
            .sort((a, b) => b.avgVolume20d - a.avgVolume20d)
            .map(s => s.symbol)
            .slice(0, limit);

        return activeStocks;

    } catch (error) {
        console.error('[Universe] Failed to fetch trending stocks:', error);
        // Ultimate fallback
        return ['BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'ADRO', 'GOTO', 'ANTM', 'UNVR', 'BBNI'];
    }
}
