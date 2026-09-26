const initialItems = [
  { id: '1', code: 'ATK-001', name: 'Kertas A4 80 gsm', unit: 'Rim', stock: 24, min: 10, price: 58000 },
  { id: '2', code: 'ATK-002', name: 'Pulpen Ballpoint', unit: 'Buah', stock: 8, min: 10, price: 4500 },
  { id: '3', code: 'ATK-003', name: 'Map Folder', unit: 'Buah', stock: 45, min: 15, price: 3500 },
  { id: '4', code: 'ATK-004', name: 'Tinta Printer Hitam', unit: 'Botol', stock: 3, min: 5, price: 125000 }
];

let items = JSON.parse(localStorage.getItem('persediaan-items') || 'null') || initialItems;
let transactions = JSON.parse(localStorage.getItem('persediaan-transactions') || 'null') || [
  { id: 1, date: '2026-09-25', type: 'Masuk', code: 'ATK-001', name: 'Kertas A4 80 gsm', qty: 10, unit: 'Rim' },
  { id: 2, date: '2026-09-24', type: 'Keluar', code: 'ATK-002', name: 'Pulpen Ballpoint', qty: 4, unit: 'Buah' }
];

const app = document.querySelector('#app');
const title = document.querySelector('#page-title');

const save = () => {
  localStorage.setItem('persediaan-items', JSON.stringify(items));
  localStorage.setItem('persediaan-transactions', JSON.stringify(transactions));
};

const rupiah = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

function render(view = 'dashboard') {
  title.textContent = { dashboard: 'Dashboard', barang: 'Data Barang', transaksi: 'Transaksi', laporan: 'Laporan' }[view];
  document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.view === view));
  ({ dashboard, barang, transaksi, laporan }[view])();
}

function dashboard() {
  let value = items.reduce((a, x) => a + x.stock * x.price, 0);
  let low = items.filter(x => x.stock <= x.min);

  app.innerHTML = `<div class="view-head"><div><h2>Ringkasan Persediaan</h2><p class="subtle">Pantau kondisi persediaan barang pakai habis secara ringkas.</p></div><button class="primary" id="quick-add">+ Tambah Barang</button></div>
    <div class="cards">
      <div class="card"><div class="stat-label">Total Jenis Barang <span class="stat-icon">▣</span></div><div class="stat-value">${items.length}</div><div class="stat-foot">jenis barang terdaftar</div></div>
      <div class="card"><div class="stat-label">Nilai Persediaan <span class="stat-icon">◉</span></div><div class="stat-value" style="font-size:21px">${rupiah(value)}</div><div class="stat-foot">estimasi nilai saat ini</div></div>
      <div class="card"><div class="stat-label">Transaksi Bulan Ini <span class="stat-icon">⇅</span></div><div class="stat-value">${transactions.length}</div><div class="stat-foot">penerimaan & pengeluaran</div></div>
      <div class="card"><div class="stat-label">Stok Menipis <span class="stat-icon">!</span></div><div class="stat-value" style="color:var(--red)">${low.length}</div><div class="stat-foot">perlu segera ditindaklanjuti</div></div>
    </div>
    <div class="grid-2">
      <div class="panel"><div class="panel-title"><h3>Transaksi Terbaru</h3><a data-go="transaksi">Lihat semua →</a></div>${transactionTable(transactions.slice(0, 5), false)}</div>
      <div class="panel"><div class="panel-title"><h3>Stok Menipis</h3><a data-go="barang">Kelola barang →</a></div>${low.length ? low.map(x => `<div class="bar-row"><span class="bar-label">${x.name}</span><div class="bar"><i style="width:${Math.min(100, x.stock / x.min * 100)}%;background:${x.stock === 0 ? 'var(--red)' : 'var(--orange)'}"></i></div><span class="bar-number">${x.stock}</span></div>`).join('') : '<p class="subtle">Semua stok dalam kondisi aman.</p>'}</div>
    </div>`;

  document.querySelector('#quick-add').onclick = () => openModal();
  wireLinks();
}

function transactionTable(rows, actions = true) {
  if (!rows.length) return '<div class="empty">Belum ada transaksi.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>TANGGAL</th><th>JENIS</th><th>BARANG</th><th>JUMLAH</th>${actions ? '<th></th>' : ''}</tr></thead><tbody>${rows.map((x, i) => `<tr><td>${x.date}</td><td><span class="badge ${x.type === 'Masuk' ? 'green' : 'orange'}">${x.type}</span></td><td><span class="code">${x.code}</span><br>${x.name}</td><td>${x.qty} ${x.unit}</td>${actions ? `<td><button class="icon-btn delete-tx" data-index="${i}">×</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}

function barang() {
  app.innerHTML = `<div class="view-head"><div><h2>Data Barang</h2><p class="subtle">Kelola master barang pakai habis dan batas minimum stok.</p></div><button class="primary" id="add-item">+ Tambah Barang</button></div>
    <div class="filters"><input id="search" placeholder="Cari kode atau nama barang..."><select id="stock-filter"><option value="all">Semua kondisi stok</option><option value="low">Stok menipis</option><option value="safe">Stok aman</option></select></div>
    <div class="panel"><div id="items-table"></div></div>`;

  document.querySelector('#add-item').onclick = () => openModal();

  const draw = () => {
    let q = document.querySelector('#search').value.toLowerCase();
    let f = document.querySelector('#stock-filter').value;
    let list = items.filter(x =>
      (x.name.toLowerCase().includes(q) || x.code.toLowerCase().includes(q)) &&
      (f === 'all' || (f === 'low' ? x.stock <= x.min : x.stock > x.min))
    );

    document.querySelector('#items-table').innerHTML = list.length ? `<div class="table-wrap"><table><thead><tr><th>KODE</th><th>NAMA BARANG</th><th>SATUAN</th><th>STOK</th><th>HARGA SATUAN</th><th>STATUS</th><th></th></tr></thead><tbody>${list.map(x => `<tr><td class="code">${x.code}</td><td><strong>${x.name}</strong></td><td>${x.unit}</td><td><strong>${x.stock}</strong></td><td>${rupiah(x.price)}</td><td><span class="badge ${x.stock <= x.min ? 'red' : 'green'}">${x.stock <= x.min ? 'Menipis' : 'Aman'}</span></td><td class="actions"><button class="icon-btn edit-item" data-id="${x.id}">✎</button><button class="icon-btn remove-item" data-id="${x.id}">×</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Data barang tidak ditemukan.</div>';

    document.querySelectorAll('.edit-item').forEach(b => b.onclick = () => openModal(items.find(x => x.id === b.dataset.id)));
    document.querySelectorAll('.remove-item').forEach(b => b.onclick = () => {
      if (confirm('Hapus barang ini?')) {
        items = items.filter(x => x.id !== b.dataset.id);
        save();
        draw();
      }
    });
  };

  document.querySelector('#search').oninput = draw;
  document.querySelector('#stock-filter').onchange = draw;
  draw();
}

function transaksi() {
  app.innerHTML = `<div class="view-head"><div><h2>Transaksi Persediaan</h2><p class="subtle">Catat penerimaan dan pengeluaran barang.</p></div><button class="primary" id="add-tx">+ Catat Transaksi</button></div><div class="panel">${transactionTable(transactions, true)}</div>`;

  document.querySelector('#add-tx').onclick = () => {
    let item = items[0];
    let type = prompt('Jenis transaksi: Masuk atau Keluar', 'Masuk');
    if (!['Masuk', 'Keluar'].includes(type)) return;

    let qty = Number(prompt('Jumlah', 1));
    if (!qty || qty < 1) return;

    let chosen = prompt('Masukkan kode barang', item?.code || '');
    let target = items.find(x => x.code.toLowerCase() === chosen.toLowerCase()) || item;
    if (!target) return;

    if (type === 'Keluar' && target.stock < qty) return alert('Stok tidak mencukupi.');

    target.stock += type === 'Masuk' ? qty : -qty;
    transactions.unshift({
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      type,
      code: target.code,
      name: target.name,
      qty,
      unit: target.unit
    });
    save();
    render('transaksi');
  };

  document.querySelectorAll('.delete-tx').forEach(b => b.onclick = () => {
    transactions.splice(Number(b.dataset.index), 1);
    save();
    render('transaksi');
  });
}

function laporan() {
  let masuk = transactions.filter(x => x.type === 'Masuk').reduce((a, x) => a + x.qty, 0);
  let keluar = transactions.filter(x => x.type === 'Keluar').reduce((a, x) => a + x.qty, 0);

  app.innerHTML = `<div class="view-head"><div><h2>Laporan Persediaan</h2><p class="subtle">Ringkasan kondisi persediaan dan aktivitas transaksi.</p></div><button class="secondary" onclick="window.print()">Cetak Laporan</button></div>
    <div class="cards">
      <div class="card"><div class="stat-label">Total Penerimaan</div><div class="stat-value">${masuk}</div><div class="stat-foot">unit barang masuk</div></div>
      <div class="card"><div class="stat-label">Total Pengeluaran</div><div class="stat-value">${keluar}</div><div class="stat-foot">unit barang keluar</div></div>
      <div class="card"><div class="stat-label">Total Stok</div><div class="stat-value">${items.reduce((a, x) => a + x.stock, 0)}</div><div class="stat-foot">unit tersedia</div></div>
      <div class="card"><div class="stat-label">Nilai Persediaan</div><div class="stat-value" style="font-size:20px">${rupiah(items.reduce((a, x) => a + x.stock * x.price, 0))}</div><div class="stat-foot">nilai estimasi</div></div>
    </div>
    <div class="panel"><div class="panel-title"><h3>Rekap Stok Barang</h3></div><div class="table-wrap"><table><thead><tr><th>KODE</th><th>NAMA BARANG</th><th>STOK</th><th>NILAI</th><th>STATUS</th></tr></thead><tbody>${items.map(x => `<tr><td class="code">${x.code}</td><td>${x.name}</td><td>${x.stock} ${x.unit}</td><td>${rupiah(x.stock * x.price)}</td><td><span class="badge ${x.stock <= x.min ? 'red' : 'green'}">${x.stock <= x.min ? 'Menipis' : 'Aman'}</span></td></tr>`).join('')}</tbody></table></div></div>`;
}

function openModal(item = null) {
  document.querySelector('#modal').classList.remove('hidden');
  document.querySelector('#modal-title').textContent = item ? 'Edit Barang' : 'Tambah Barang';
  document.querySelector('#item-id').value = item?.id || '';
  document.querySelector('#item-code').value = item?.code || '';
  document.querySelector('#item-name').value = item?.name || '';
  document.querySelector('#item-unit').value = item?.unit || 'Buah';
  document.querySelector('#item-min').value = item?.min ?? 5;
  document.querySelector('#item-price').value = item?.price ?? 0;
}

function closeModal() {
  document.querySelector('#modal').classList.add('hidden');
}

document.querySelector('#close-modal').onclick = closeModal;
document.querySelector('#modal').onclick = e => {
  if (e.target.id === 'modal') closeModal();
};

document.querySelector('#item-form').onsubmit = e => {
  e.preventDefault();
  let id = document.querySelector('#item-id').value;
  let data = {
    id: id || Date.now().toString(),
    code: document.querySelector('#item-code').value.trim(),
    name: document.querySelector('#item-name').value.trim(),
    unit: document.querySelector('#item-unit').value,
    min: Number(document.querySelector('#item-min').value),
    price: Number(document.querySelector('#item-price').value),
    stock: id ? items.find(x => x.id === id).stock : 0
  };

  if (id) items[items.findIndex(x => x.id === id)] = data;
  else items.push(data);

  save();
  closeModal();
  render(document.querySelector('.nav-item.active').dataset.view);
};

function wireLinks() {
  document.querySelectorAll('[data-go]').forEach(x => x.onclick = () => render(x.dataset.go));
}

document.querySelectorAll('.nav-item').forEach(x => x.onclick = () => render(x.dataset.view));
render();