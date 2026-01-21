export interface StockOption {
    symbol: string;
    name: string;
    sector?: string;
}

export const POPULAR_IDX_STOCKS: StockOption[] = [
    { symbol: "BBCA", name: "Bank Central Asia Tbk", sector: "Finance" },
    { symbol: "BBRI", name: "Bank Rakyat Indonesia (Persero) Tbk", sector: "Finance" },
    { symbol: "BMRI", name: "Bank Mandiri (Persero) Tbk", sector: "Finance" },
    { symbol: "BBNI", name: "Bank Negara Indonesia (Persero) Tbk", sector: "Finance" },
    { symbol: "TLKM", name: "Telkom Indonesia (Persero) Tbk", sector: "Infrastructure" },
    { symbol: "ASII", name: "Astra International Tbk", sector: "Consumer Cyclicals" },
    { symbol: "UNVR", name: "Unilever Indonesia Tbk", sector: "Consumer Non-Cyclicals" },
    { symbol: "GOTO", name: "GoTo Gojek Tokopedia Tbk", sector: "Technology" },
    { symbol: "BUKA", name: "Bukalapak.com Tbk", sector: "Technology" },
    { symbol: "AMMN", name: "Amman Mineral Internasional Tbk", sector: "Basic Materials" },
    { symbol: "ADRO", name: "Adaro Energy Indonesia Tbk", sector: "Energy" },
    { symbol: "PGAS", name: "Perusahaan Gas Negara Tbk", sector: "Energy" },
    { symbol: "PTBA", name: "Bukit Asam Tbk", sector: "Energy" },
    { symbol: "INDF", name: "Indofood Sukses Makmur Tbk", sector: "Consumer Non-Cyclicals" },
    { symbol: "ICBP", name: "Indofood CBP Sukses Makmur Tbk", sector: "Consumer Non-Cyclicals" },
    { symbol: "KLBF", name: "Kalbe Farma Tbk", sector: "Healthcare" },
    { symbol: "BRIS", name: "Bank Syariah Indonesia Tbk", sector: "Finance" },
    { symbol: "ANTM", name: "Aneka Tambang Tbk", sector: "Basic Materials" },
    { symbol: "MDKA", name: "Merdeka Copper Gold Tbk", sector: "Basic Materials" },
    { symbol: "INKP", name: "Indah Kiat Pulp & Paper Tbk", sector: "Basic Materials" },
];
