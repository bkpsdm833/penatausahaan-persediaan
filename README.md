# PersediaanKu Fullstack Starter

Aplikasi penatausahaan persediaan barang pakai habis dengan stack:
- Frontend: React + Vite
- Backend: Express + JWT + JSON storage
- Styling: CSS custom

## Cara menjalankan

### 1) Install dependency root
```bash
npm install
```

### 2) Install dependency frontend dan backend
```bash
npm install --workspace client
npm install --workspace server
```

### 3) Jalankan app secara bersamaan
```bash
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3000

## Akun awal
- username: admin
- password: Admin123!

## Fitur yang sudah ada
- Login dan logout
- Dashboard ringkasan stok
- Master barang
- Transaksi masuk/keluar
- Laporan summary
- Export Excel dan PDF
- Audit log read-only
- Role-based access (Admin, Petugas, Pimpinan)

## Struktur folder
```bash
.
├── client/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── data/
│   ├── src/
│   ├── .env.example
│   └── package.json
├── package.json
├── .gitignore
└── README.md
```

## Catatan

Aplikasi ini bersifat starter app dan menggunakan file JSON sebagai storage pada tahap awal agar cepat dijalankan tanpa memerlukan database external. Untuk production, dapat diganti ke PostgreSQL atau MySQL menggunakan Prisma.
