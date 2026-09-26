import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_URL });

const pages = {
  dashboard: 'Dashboard',
  items: 'Barang',
  transactions: 'Transaksi',
  reports: 'Laporan',
  users: 'Pengguna',
  audit: 'Audit Log'
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'Admin123!' });
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reports, setReports] = useState(null);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [itemsRes, txRes, reportsRes, usersRes, auditRes] = await Promise.all([
        api.get('/items', { headers: authHeaders }),
        api.get('/transactions', { headers: authHeaders }),
        api.get('/reports/summary', { headers: authHeaders }),
        api.get('/users', { headers: authHeaders }),
        api.get('/audit-logs', { headers: authHeaders })
      ]);
      setItems(itemsRes.data);
      setTransactions(txRes.data);
      setReports(reportsRes.data);
      setUsers(usersRes.data);
      setAudit(auditRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    api.get('/auth/me', { headers: authHeaders })
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('token');
        setToken('');
      });
    fetchData();
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', loginForm);
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setActivePage('dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login gagal');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setItems([]);
    setTransactions([]);
    setReports(null);
  };

  const addItem = async (payload) => {
    try {
      await api.post('/items', payload, { headers: authHeaders });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menambah barang');
    }
  };

  const addTransaction = async (payload) => {
    try {
      await api.post('/transactions', payload, { headers: authHeaders });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mencatat transaksi');
    }
  };

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-box">
          <h1>PersediaanKu</h1>
          <p className="auth-subtitle">Penatausahaan persediaan barang pakai habis</p>
          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              Username
              <input
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </label>
            {error ? <div className="status danger">{error}</div> : null}
            <button className="primary" type="submit">Masuk</button>
          </form>
        </div>
      </div>
    );
  }

  const totalValue = items.reduce((sum, item) => sum + item.stock * item.price, 0);
  const lowItems = items.filter((item) => item.stock <= item.minStock);

  return (
    <div className="container app-shell">
      <header className="navbar">
        <div className="brand">PersediaanKu</div>
        <div className="nav-actions">
          <span className="badge">{user?.role || 'USER'}</span>
          <span>{user?.name}</span>
          <button className="secondary" onClick={logout}>Keluar</button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <nav>
            {Object.entries(pages).map(([key, label]) => (
              <button
                key={key}
                className={`nav-item ${activePage === key ? 'active' : ''}`}
                onClick={() => setActivePage(key)}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main>
          {activePage === 'dashboard' && (
            <Dashboard
              items={items}
              transactions={transactions}
              totalValue={totalValue}
              lowItems={lowItems}
            />
          )}

          {activePage === 'items' && (
            <ItemPage items={items} addItem={addItem} />
          )}

          {activePage === 'transactions' && (
            <TransactionPage items={items} addTransaction={addTransaction} transactions={transactions} />
          )}

          {activePage === 'reports' && (
            <ReportPage reports={reports} items={items} />
          )}

          {activePage === 'users' && (
            <UserPage users={users} />
          )}

          {activePage === 'audit' && (
            <AuditPage audit={audit} />
          )}

          {loading && <div className="mt-3">Memuat data...</div>}
          {error && <div className="status danger mt-3">{error}</div>}
        </main>
      </div>
    </div>
  );
}

function Dashboard({ items, transactions, totalValue, lowItems }) {
  return (
    <>
      <div className="page-title">
        <h2>Dashboard</h2>
      </div>

      <div className="grid grid-4">
        <div className="card">
          <div className="metric"><span>Jenis Barang</span><span>▣</span></div>
          <div className="metric-value">{items.length}</div>
        </div>
        <div className="card">
          <div className="metric"><span>Nilai Persediaan</span><span>◉</span></div>
          <div className="metric-value">{formatRupiah(totalValue)}</div>
        </div>
        <div className="card">
          <div className="metric"><span>Transaksi</span><span>⇅</span></div>
          <div className="metric-value">{transactions.length}</div>
        </div>
        <div className="card">
          <div className="metric"><span>Stock Menipis</span><span>!</span></div>
          <div className="metric-value">{lowItems.length}</div>
        </div>
      </div>

      <div className="grid grid-2 mt-3">
        <div className="card">
          <h3>Barang Menipis</h3>
          {lowItems.length === 0 ? (
            <div className="empty">Semua stok aman</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Barang</th>
                    <th>Stok</th>
                    <th>Min</th>
                  </tr>
                </thead>
                <tbody>
                  {lowItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.stock}</td>
                      <td>{item.minStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Transaksi Terbaru</h3>
          {transactions.length === 0 ? (
            <div className="empty">Belum ada transaksi</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Jenis</th>
                    <th>Barang</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 6).map((tx) => (
                    <tr key={tx.id}>
                      <td><span className={`status ${tx.type === 'MASUK' ? 'safe' : 'low'}`}>{tx.type}</span></td>
                      <td>{tx.item?.name || '-'}</td>
                      <td>{tx.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ItemPage({ items, addItem }) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    unit: 'Buah',
    minStock: 5,
    price: 0,
    stock: 0
  });

  const submit = (e) => {
    e.preventDefault();
    addItem(form);
    setForm({ code: '', name: '', unit: 'Buah', minStock: 5, price: 0, stock: 0 });
  };

  return (
    <>
      <div className="page-title">
        <h2>Data Barang</h2>
      </div>

      <div className="card">
        <form onSubmit={submit} className="form-grid">
          <label>
            Kode Barang
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </label>
          <label>
            Nama Barang
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Satuan
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              <option value="Buah">Buah</option>
              <option value="Rim">Rim</option>
              <option value="Dus">Dus</option>
              <option value="Botol">Botol</option>
              <option value="Unit">Unit</option>
            </select>
          </label>
          <label>
            Stok Awal
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
          </label>
          <label>
            Stok Minimum
            <input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
          </label>
          <label>
            Harga Satuan
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </label>
          <div>
            <button className="primary mt-2" type="submit">Tambah Barang</button>
          </div>
        </form>
      </div>

      <div className="card mt-3">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Unit</th>
                <th>Stok</th>
                <th>Min</th>
                <th>Harga</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.unit}</td>
                  <td>{item.stock}</td>
                  <td>{item.minStock}</td>
                  <td>{formatRupiah(item.price)}</td>
                  <td>
                    <span className={`status ${item.stock <= item.minStock ? 'low' : 'safe'}`}>
                      {item.stock <= item.minStock ? 'Menipis' : 'Aman'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function TransactionPage({ items, transactions, addTransaction }) {
  const [form, setForm] = useState({ itemId: '', type: 'MASUK', quantity: 1, note: '' });

  const submit = (e) => {
    e.preventDefault();
    addTransaction(form);
    setForm({ itemId: '', type: 'MASUK', quantity: 1, note: '' });
  };

  return (
    <>
      <div className="page-title">
        <h2>Transaksi</h2>
      </div>

      <div className="card">
        <form onSubmit={submit} className="form-grid">
          <label>
            Barang
            <select value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
              <option value="">Pilih barang</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            Jenis Transaksi
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="MASUK">Masuk</option>
              <option value="KELUAR">Keluar</option>
            </select>
          </label>
          <label>
            Jumlah
            <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          </label>
          <label>
            Keterangan
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <div>
            <button className="primary mt-2" type="submit">Simpan Transaksi</button>
          </div>
        </form>
      </div>

      <div className="card mt-3">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Barang</th>
                <th>Qty</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.date).toLocaleDateString('id-ID')}</td>
                  <td><span className={`status ${tx.type === 'MASUK' ? 'safe' : 'low'}`}>{tx.type}</span></td>
                  <td>{tx.item?.name || '-'}</td>
                  <td>{tx.quantity}</td>
                  <td>{tx.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ReportPage({ reports, items }) {
  if (!reports) return <div className="card"><div className="empty">Belum ada data laporan</div></div>;

  return (
    <>
      <div className="page-title">
        <h2>Laporan</h2>
      </div>

      <div className="grid grid-4">
        <div className="card">
          <div className="metric"><span>Total Nilai</span></div>
          <div className="metric-value">{formatRupiah(reports.totalValue)}</div>
        </div>
        <div className="card">
          <div className="metric"><span>Transaksi</span></div>
          <div className="metric-value">{reports.transactions.length}</div>
        </div>
        <div className="card">
          <div className="metric"><span>Barang</span></div>
          <div className="metric-value">{items.length}</div>
        </div>
        <div className="card">
          <div className="metric"><span>Menipis</span></div>
          <div className="metric-value">{items.filter((item) => item.stock <= item.minStock).length}</div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Barang</th>
                <th>Stok</th>
                <th>Nilai</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.stock}</td>
                  <td>{formatRupiah(item.stock * item.price)}</td>
                  <td>
                    <span className={`status ${item.stock <= item.minStock ? 'low' : 'safe'}`}>
                      {item.stock <= item.minStock ? 'Menipis' : 'Aman'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function UserPage({ users }) {
  return (
    <>
      <div className="page-title">
        <h2>Pengguna</h2>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className={`status ${u.active ? 'safe' : 'danger'}`}>{u.active ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function AuditPage({ audit }) {
  return (
    <>
      <div className="page-title">
        <h2>Audit Log</h2>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Action</th>
                <th>Entity</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.createdAt).toLocaleString('id-ID')}</td>
                  <td>{a.action}</td>
                  <td>{a.entity}</td>
                  <td>{a.user?.name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value || 0);
}

export default App;
