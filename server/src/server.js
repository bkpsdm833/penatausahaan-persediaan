import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { v4 as uuid } from 'uuid';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const dbPath = path.resolve('data/db.json');
const jwtSecret = process.env.JWT_SECRET || 'develop-secret-key-for-persediaan-ku-123456';

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

function readDb() {
  const raw = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(raw);
}

function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function getAuthToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, jwtSecret, { expiresIn: '8h' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Token diperlukan' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

function can(permission) {
  return (req, res, next) => {
    const permissions = {
      ADMIN: ['items:read', 'items:write', 'transactions:read', 'transactions:write', 'reports:read', 'users:read', 'users:write', 'audit:read'],
      PETUGAS: ['items:read', 'items:write', 'transactions:read', 'transactions:write', 'reports:read'],
      PIMPINAN: ['items:read', 'transactions:read', 'reports:read', 'audit:read']
    };

    const allowed = permissions[req.user.role] || [];
    if (allowed.includes(permission)) return next();
    return res.status(403).json({ error: 'Akses ditolak' });
  };
}

async function appendAudit(req, action, entity, entityId, before, after) {
  const db = readDb();
  db.auditLogs.unshift({
    id: uuid(),
    action,
    entity,
    entityId,
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null,
    createdAt: new Date().toISOString(),
    userId: req.user?.id || null,
    ip: req.ip
  });
  writeDb(db);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'persediaan-ku-api' });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  const db = readDb();
  const user = db.users.find((item) => item.username === username && item.active);
  if (!user) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  const token = getAuthToken(user);
  await appendAudit({ user: { id: user.id }, ip: req.ip }, 'LOGIN', 'User', user.id, null, null);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      active: user.active
    },
    permissions: {
      ADMIN: ['items:read', 'items:write', 'transactions:read', 'transactions:write', 'reports:read', 'users:read', 'users:write', 'audit:read'],
      PETUGAS: ['items:read', 'items:write', 'transactions:read', 'transactions:write', 'reports:read'],
      PIMPINAN: ['items:read', 'transactions:read', 'reports:read', 'audit:read']
    }[user.role]
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const db = readDb();
  const user = db.users.find((item) => item.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

  res.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      active: user.active
    },
    permissions: {
      ADMIN: ['items:read', 'items:write', 'transactions:read', 'transactions:write', 'reports:read', 'users:read', 'users:write', 'audit:read'],
      PETUGAS: ['items:read', 'items:write', 'transactions:read', 'transactions:write', 'reports:read'],
      PIMPINAN: ['items:read', 'transactions:read', 'reports:read', 'audit:read']
    }[user.role]
  });
});

app.get('/api/items', authMiddleware, can('items:read'), (_req, res) => {
  const db = readDb();
  res.json(db.items);
});

app.post('/api/items', authMiddleware, can('items:write'), async (req, res) => {
  const { code, name, unit, minStock, price, stock } = req.body || {};
  if (!code || !name || !unit) {
    return res.status(400).json({ error: 'Kode, nama, dan satuan wajib diisi' });
  }

  const db = readDb();
  if (db.items.some((item) => item.code.toLowerCase() === String(code).toLowerCase())) {
    return res.status(409).json({ error: 'Kode barang sudah digunakan' });
  }

  const item = {
    id: uuid(),
    code: String(code),
    name: String(name),
    unit: String(unit),
    minStock: Number(minStock || 0),
    stock: Number(stock || 0),
    price: Number(price || 0)
  };

  db.items.push(item);
  writeDb(db);
  await appendAudit(req, 'CREATE', 'Item', item.id, null, item);
  res.status(201).json(item);
});

app.get('/api/transactions', authMiddleware, can('transactions:read'), (_req, res) => {
  const db = readDb();
  const items = db.items;
  const users = db.users;
  const tx = db.transactions.map((item) => ({
    ...item,
    item: items.find((i) => i.id === item.itemId) || null,
    user: users.find((u) => u.id === item.userId) || null
  }));

  res.json(tx);
});

app.post('/api/transactions', authMiddleware, can('transactions:write'), async (req, res) => {
  const { type, itemId, quantity, note } = req.body || {};
  if (!type || !itemId || !quantity) {
    return res.status(400).json({ error: 'Jenis transaksi, item, dan jumlah wajib diisi' });
  }

  const db = readDb();
  const item = db.items.find((row) => row.id === itemId);
  if (!item) {
    return res.status(404).json({ error: 'Barang tidak ditemukan' });
  }

  const nextStock = type === 'MASUK' ? item.stock + Number(quantity) : item.stock - Number(quantity);
  if (nextStock < 0) {
    return res.status(400).json({ error: 'Stok tidak mencukupi' });
  }

  item.stock = nextStock;

  const tx = {
    id: uuid(),
    type,
    quantity: Number(quantity),
    note: note || '',
    itemId,
    userId: req.user.id,
    date: new Date().toISOString()
  };

  db.transactions.unshift(tx);
  writeDb(db);
  await appendAudit(req, 'CREATE', 'Transaction', tx.id, null, tx);
  res.status(201).json(tx);
});

app.get('/api/reports/summary', authMiddleware, can('reports:read'), (_req, res) => {
  const db = readDb();
  const items = db.items;
  const totalValue = items.reduce((sum, item) => sum + item.stock * item.price, 0);

  res.json({
    items,
    transactions: db.transactions,
    totalValue
  });
});

app.get('/api/reports/export.xlsx', authMiddleware, can('reports:read'), async (_req, res) => {
  const db = readDb();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Laporan Persediaan');

  sheet.columns = [
    { header: 'Kode', key: 'code', width: 18 },
    { header: 'Nama', key: 'name', width: 30 },
    { header: 'Satuan', key: 'unit', width: 12 },
    { header: 'Stok', key: 'stock', width: 12 },
    { header: 'Harga', key: 'price', width: 18 },
    { header: 'Nilai', key: 'value', width: 18 },
    { header: 'Status', key: 'status', width: 16 }
  ];

  db.items.forEach((item) => {
    sheet.addRow({
      code: item.code,
      name: item.name,
      unit: item.unit,
      stock: item.stock,
      price: item.price,
      value: item.stock * item.price,
      status: item.stock <= item.minStock ? 'Menipis' : 'Aman'
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="laporan-persediaan.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

app.get('/api/reports/export.pdf', authMiddleware, can('reports:read'), (_req, res) => {
  const db = readDb();
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="laporan-persediaan.pdf"');
  doc.pipe(res);

  doc.fontSize(18).text('Laporan Persediaan Barang Pakai Habis');
  doc.moveDown();

  db.items.forEach((item) => {
    doc.fontSize(11).text(
      `${item.code} | ${item.name} | ${item.stock} ${item.unit} | Rp ${new Intl.NumberFormat('id-ID').format(item.stock * item.price)} | ${item.stock <= item.minStock ? 'Menipis' : 'Aman'}`
    );
  });

  doc.end();
});

app.get('/api/users', authMiddleware, can('users:read'), (_req, res) => {
  const db = readDb();
  res.json(db.users.map((user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    active: user.active
  })));
});

app.get('/api/audit-logs', authMiddleware, can('audit:read'), (_req, res) => {
  const db = readDb();
  const mapped = db.auditLogs.map((log) => ({
    ...log,
    user: db.users.find((u) => u.id === log.userId) || null,
    before: log.before ? JSON.parse(log.before) : null,
    after: log.after ? JSON.parse(log.after) : null
  }));

  res.json(mapped);
});

app.post('/api/users', authMiddleware, can('users:write'), async (req, res) => {
  const { name, username, password, role } = req.body || {};
  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'Nama, username, password, dan role wajib diisi' });
  }

  const db = readDb();
  if (db.users.some((user) => user.username === username)) {
    return res.status(409).json({ error: 'Username sudah digunakan' });
  }

  const user = {
    id: uuid(),
    name,
    username,
    passwordHash: await bcrypt.hash(password, 10),
    role,
    active: true
  };

  db.users.push(user);
  writeDb(db);
  await appendAudit(req, 'CREATE', 'User', user.id, null, user);
  res.status(201).json({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    active: user.active
  });
});

app.listen(port, () => {
  console.log(`PersediaanKu API running at http://localhost:${port}`);
});
