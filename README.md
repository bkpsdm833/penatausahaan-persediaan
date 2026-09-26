# PersediaanKu

Aplikasi web ringan untuk penatausahaan persediaan barang pakai habis.

## Fitur MVP

- **Dashboard** - Ringkasan jumlah jenis barang, nilai persediaan, transaksi, dan stok menipis.
- **Data Barang** - CRUD data barang: kode, nama, satuan, stok minimum, dan harga satuan.
- **Transaksi** - Pencatatan transaksi masuk/keluar dengan pembaruan stok otomatis.
- **Laporan** - Rekap stok dan nilai persediaan yang dapat dicetak.
- **Penyimpanan Lokal** - Data tersimpan menggunakan `localStorage` sehingga dapat langsung dicoba tanpa server.
- **Responsif** - Tampilan menyesuaikan untuk desktop dan perangkat mobile.

## Fitur Utama

### 1. Dashboard
- Statistik jumlah jenis barang
- Total nilai persediaan
- Jumlah transaksi bulan ini
- Notifikasi barang stok menipis
- Riwayat transaksi terbaru
- Visualisasi barang dengan stok kritis

### 2. Data Barang
- Tambah barang baru dengan kode, nama, satuan, stok minimum, dan harga
- Edit data barang yang sudah ada
- Hapus barang dari sistem
- Pencarian dan filter berdasarkan kondisi stok
- Indikator status stok (Aman/Menipis)

### 3. Transaksi
- Catat penerimaan barang (Masuk)
- Catat pengeluaran barang (Keluar)
- Pembaruan stok otomatis sesuai transaksi
- Riwayat lengkap transaksi
- Validasi stok sebelum pengeluaran

### 4. Laporan
- Total penerimaan barang
- Total pengeluaran barang
- Stok barang saat ini
- Nilai persediaan per barang
- Fungsi cetak untuk laporan fisik

## Cara Menjalankan

### Langsung di Browser
Buka `index.html` langsung di browser:
```bash
open index.html  # macOS
start index.html # Windows
```

### Dengan Server Lokal

**Python 3:**
```bash
python3 -m http.server 8000
```

**Node.js (http-server):**
```bash
npx http-server
```

Kemudian buka http://localhost:8000

## Data yang Tersimpan

- Data barang disimpan di `localStorage` dengan key `persediaan-items`
- Data transaksi disimpan di `localStorage` dengan key `persediaan-transactions`
- Setiap perubahan otomatis tersimpan di browser

## Catatan untuk Pengembangan Lanjutan

Untuk penggunaan produksi, perlu ditambahkan:

1. **Backend Server** - API untuk CRUD data
2. **Database** - PostgreSQL/MySQL untuk penyimpanan data jangka panjang
3. **Autentikasi** - Login & manajemen user
4. **Audit Trail** - Catat siapa dan kapan data diubah
5. **Export** - Unduh laporan ke PDF/Excel
6. **Multi-user** - Sinkronisasi data antar user
7. **Permission** - Hak akses berdasarkan role
8. **Period Management** - Pengelolaan periode anggaran

## Lisensi

Open Source - Bebas digunakan dan dikembangkan