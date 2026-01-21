# 📘 Panduan Workflow: Scalping vs. Swing

Aplikasi ini dirancang untuk mendukung dua gaya trading utama: **Scalping** (jangka pendek) dan **Swing** (jangka menengah/panjang). Berikut adalah alur kerja (workflow) optimal untuk masing-masing mode.

---

## ⚡ Mode Scalping (Fast-Paced)
**Fokus:** Mengambil keuntungan kecil dari pergerakan harga cepat (intraday).
**Timeframe Analisis:** 1 Menit, 5 Menit, 15 Menit.

### Langkah-langkah:

1.  **Pilih Mode**:
    *   Klik tombol **"SCALPING"** pada layar awal atau toggle di header.
    *   *AI akan menyesuaikan sensitivitas sinyal untuk mendeteksi breakout cepat dan volatilitas.*

2.  **Cari Saham Volatil**:
    *   Gunakan search bar untuk mencari saham yang sedang **aktif/ramai** (misal: `GOTO`, `BUKA`, atau saham second-liner).
    *   *Tips: Cari saham dengan Volume tinggi hari ini.*

3.  **Cek Panel "Multi-Timeframe" (PENTING)**:
    *   Lihat bagian paling bawah halaman.
    *   Pastikan ada **Konfluensi (Kesesuaian)** antara timeframe **15m** dan **1h**.
    *   *Jika 15m Bullish tapi 1h Bearish -> Hati-hati, mungkin hanya pantulan sesaat.*

4.  **Analisis Sinyal AI & Indikator**:
    *   Lihat **Trading Signals Panel**: Apakah ada sinyal "STRONG BUY"?
    *   Cek **RSI (14)**:
        *   Jika RSI < 30 (Oversold) lalu naik -> Potensi mantul (Buy).
        *   Jika RSI > 70 (Overbought) -> Potensi koreksi hati-hati.
    *   Cek **Bollinger Bands**: Apakah harga menembus band bawah lalu masuk kembali? (Mean Reversion).

5.  **Eksekusi Cepat (Risk Management)**:
    *   Buka panel **Risk Management**.
    *   Set **Stop Loss** ketat (misal: 1-2% di bawah harga entry).
    *   Gunakan **Position Size** yang disarankan agar tidak "all-in" sembarangan.
    *   *Target profit scalping biasanya 2-5%.*

---

## 🌊 Mode Swing (Trend Following)
**Fokus:** Mengendarai tren besar selama beberapa hari hingga minggu.
**Timeframe Analisis:** 1 Jam, 4 Jam, 1 Hari.

### Langkah-langkah:

1.  **Pilih Mode**:
    *   Klik tombol **"SWING"**.
    *   *AI akan mengabaikan noise kecil dan fokus pada struktur pasar (Higher High, Higher Low).*

2.  **Cari Saham Bluechip / Liquid**:
    *   Fokus pada saham fundamental bagus (misal: `BBCA`, `TLKM`, `ASII`, `BMRI`).
    *   Gunakan fitur autcomplete untuk menemukan saham LQ45.

3.  **Analisis Tren Besar**:
    *   Cek chart utama: Apakah harga di atas **MA20** dan **MA50**?
    *   Lihat **Multi-Timeframe Panel**:
        *   Idealnya **4H** dan **1D (Daily)** harus berwarna **HIJAU (Bullish)**.
        *   Jika Daily Bearish, sebaiknya *wait and see* kecuali mencari *bottom reversal*.

4.  **Validasi Sinyal**:
    *   Cari konfirmasi **MACD**: Golden Cross (Garis biru memotong ke atas garis oranye) di area negatif adalah sinyal swing kuat.
    *   Pastikan volume meningkat saat harga naik.

5.  **Perencanaan & Santai**:
    *   Gunakan **Risk:Reward Calculator**.
    *   Set Stop Loss lebih lebar (misal: di bawah Support Swing terakhir, sekitar 5-8%).
    *   Set Take Profit minimal 2x dari risiko (Ratio 1:2 atau 1:3).
    *   *Anda tidak perlu memantau layar setiap menit.*

---

## 🔄 Ringkasan Perbedaan

| Fitur | ⚡ Scalping | 🌊 Swing |
| :--- | :--- | :--- |
| **Kecepatan** | Tinggi (Menit/Jam) | Rendah (Hari/Minggu) |
| **Saham Target** | High Volatility / Gorengan / Aktif | Bluechip / Fundamental Kuat |
| **Indikator Kunci** | RSI, Stochastic, Bollinger Bands | MA Trend, MACD, Volume Flow |
| **Validasi MTF** | 5m + 15m | 4H + 1D |
| **Stop Loss** | Ketat (1-3%) | Lebar (5-10%) |
| **Mentalitas** | Refleks Cepat, Fokus Penuh | Sabar, Analisis Mendalam |

---

*Gunakan panduan ini sebagai referensi saat menggunakan IDX Trading Assistant.*
