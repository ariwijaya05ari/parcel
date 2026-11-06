/* ============================================================
   KATALOG PARCEL — app.js (frontend vanilla JS, satu halaman)
   Semua data lewat fetch() ke GAS_URL. Tidak ada rahasia di sini.
   ============================================================ */
(function () {
  'use strict';

  const CFG = window.APP_CONFIG || {};
  const SESI_KEY = 'kp_sesi';
  const FOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
  const FOTO_MAKS = 5 * 1024 * 1024;

  const state = {
    kategori: [],
    produk: [],
    katalogSiap: false,
    filter: { q: '', kat: '' },
    adminProduk: [],
    adminKategori: [],
    katEditId: ''
  };

  /* ---------- Utilitas ---------- */
  const $ = (sel) => document.querySelector(sel);
  const app = () => $('#app');

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  function rupiah(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
  function configOk() { return !!CFG.GAS_URL && !/GANTI|XXXX/.test(CFG.GAS_URL); }
  function nomorWA() { return String(CFG.WA_NUMBER || '').replace(/\D/g, ''); }

  let toastTimer = null;
  function toast(msg, tipe) {
    const el = $('#notif');
    el.textContent = msg;
    el.className = 'notif show notif-' + (tipe || 'success');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  function pesanKosong(judul, sub) {
    return '<div class="empty"><div class="empty-icon">🎁</div><h3>' + esc(judul) + '</h3><p>' + esc(sub || '') + '</p></div>';
  }

  function bacaBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(new Error('Gagal membaca berkas'));
      r.readAsDataURL(file);
    });
  }

  /* ---------- Sesi (token pendek; dicabut otomatis di server) ---------- */
  function sesi() {
    try {
      const s = JSON.parse(localStorage.getItem(SESI_KEY) || 'null');
      if (!s || !s.token || s.exp < Date.now()) { localStorage.removeItem(SESI_KEY); return null; }
      return s;
    } catch (e) { return null; }
  }
  function simpanSesi(s) { localStorage.setItem(SESI_KEY, JSON.stringify(s)); }
  function hapusSesi() { localStorage.removeItem(SESI_KEY); }
  function updateNav() {
    const s = sesi();
    $('#nav-admin').hidden = !s;
    $('#nav-login').hidden = !!s;
  }

  /* ---------- Jaringan ---------- */
  async function panggilGet(action, params) {
    const qs = new URLSearchParams(Object.assign({ action: action }, params || {}));
    const res = await fetch(CFG.GAS_URL + '?' + qs.toString());
    return res.json();
  }
  async function panggilPost(action, data) {
    const s = sesi();
    const res = await fetch(CFG.GAS_URL, {
      method: 'POST',
      // WAJIB text/plain agar tidak memicu CORS preflight yang diblokir GAS
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: s ? s.token : '', data: data || {} })
    });
    return res.json();
  }

  // Pembungkus: tampilkan notifikasi bila gagal, kembalikan null
  async function jalankan(janji) {
    try {
      const r = await janji;
      if (r && r.success) return r;
      if (r && r.code === 'AUTH') {
        hapusSesi();
        updateNav();
        toast(r.message, 'error');
        location.hash = '#/login';
        return null;
      }
      toast((r && r.message) || 'Permintaan gagal.', 'error');
      return null;
    } catch (err) {
      toast('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 'error');
      return null;
    }
  }

  async function muatKatalog(paksa) {
    if (state.katalogSiap && !paksa) return true;
    const r = await jalankan(panggilGet('catalog'));
    if (!r) return false;
    state.kategori = r.data.kategori;
    state.produk = r.data.produk;
    state.katalogSiap = true;
    return true;
  }

  /* ============================================================
     HALAMAN PUBLIK
     ============================================================ */

  function kartuProduk(p) {
    const media = p.foto
      ? '<img src="' + esc(p.foto) + '" alt="' + esc(p.nama) + '" loading="lazy">'
      : '<span class="ph">🎁</span>';
    return '<a class="card" href="#/parcel/' + encodeURIComponent(p.id) + '">' +
      '<div class="card-media">' + media + '</div>' +
      '<div class="card-body">' +
        '<span class="tag">' + esc(p.kategori) + '</span>' +
        '<h3 class="card-title">' + esc(p.nama) + '</h3>' +
        '<p class="card-desc">' + esc(p.deskripsi) + '</p>' +
        '<div class="card-foot"><span class="price">' + rupiah(p.harga) + '</span>' +
        '<span class="link-more">Lihat Detail →</span></div>' +
      '</div></a>';
  }

  async function tampilkanKatalog() {
    app().innerHTML =
      '<section class="hero">' +
        '<p class="eyebrow">Boutique Hampers &amp; Parcel Nusantara</p>' +
        '<h1>Pilihan Parcel &amp; Hampers Terbaik</h1>' +
        '<p class="lead">Temukan paket hadiah untuk keluarga, sahabat, dan rekan bisnis. Setiap paket dilengkapi keterangan dan harga yang jelas.</p>' +
      '</section>' +
      '<div class="toolbar">' +
        '<input id="cari" class="input search" type="search" placeholder="Cari nama parcel..." aria-label="Cari nama parcel" value="' + esc(state.filter.q) + '">' +
        '<div id="chips" class="chips"></div>' +
      '</div>' +
      '<p id="info-jumlah" class="info-jumlah muted small"></p>' +
      '<div id="grid" class="grid">' +
        '<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>' +
      '</div>';

    $('#cari').addEventListener('input', (e) => { state.filter.q = e.target.value; gambarGrid(); });
    $('#chips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-kat]');
      if (!b) return;
      state.filter.kat = b.dataset.kat;
      gambarChip();
      gambarGrid();
    });

    if (!(await muatKatalog())) {
      if ($('#grid')) $('#grid').innerHTML = pesanKosong('Katalog belum dapat dimuat', 'Muat ulang halaman beberapa saat lagi.');
      return;
    }
    gambarChip();
    gambarGrid();
  }

  function gambarChip() {
    if (!$('#chips')) return;
    const semua = [{ id: '', nama: 'Semua', n: state.produk.length }].concat(
      state.kategori.map((k) => ({ id: k.id, nama: k.nama, n: state.produk.filter((p) => p.kategoriId === k.id).length })));
    $('#chips').innerHTML = semua.map((c) =>
      '<button type="button" class="chip ' + (state.filter.kat === c.id ? 'active' : '') + '" data-kat="' + esc(c.id) + '">' +
      esc(c.nama) + '<span>' + c.n + '</span></button>').join('');
  }

  function gambarGrid() {
    if (!$('#grid')) return;
    const q = state.filter.q.trim().toLowerCase();
    const list = state.produk.filter((p) =>
      (!state.filter.kat || p.kategoriId === state.filter.kat) &&
      (!q || p.nama.toLowerCase().indexOf(q) !== -1));
    $('#info-jumlah').textContent = 'Menampilkan ' + list.length + ' paket pilihan';
    $('#grid').innerHTML = list.length
      ? list.map(kartuProduk).join('')
      : pesanKosong('Parcel tidak ditemukan', 'Coba kata kunci lain atau pilih kategori lain.');
  }

  async function tampilkanDetail(id) {
    app().innerHTML = '<div class="skeleton-detail"></div>';
    if (!(await muatKatalog())) return;
    const p = state.produk.find((x) => x.id === id);
    if (!p) {
      app().innerHTML = pesanKosong('Parcel tidak ditemukan', 'Mungkin parcel ini sudah disembunyikan.') +
        '<p class="center"><a class="btn btn-outline" href="#/">Kembali ke Katalog</a></p>';
      return;
    }
    const teks = encodeURIComponent('Halo, saya tertarik dengan parcel "' + p.nama + '" (' + rupiah(p.harga) + '). Mohon info ketersediaannya ya.');
    const wa = 'https://wa.me/' + nomorWA() + '?text=' + teks;
    const serupa = state.produk.filter((x) => x.kategoriId === p.kategoriId && x.id !== p.id).slice(0, 3);

    app().innerHTML =
      '<a class="back" href="#/">← Kembali ke Katalog</a>' +
      '<div class="detail">' +
        '<div class="detail-media">' + (p.foto
          ? '<img src="' + esc(p.foto) + '" alt="' + esc(p.nama) + '">'
          : '<span class="ph big">🎁</span>') + '</div>' +
        '<div class="detail-info">' +
          '<span class="tag">' + esc(p.kategori) + '</span>' +
          '<h1>' + esc(p.nama) + '</h1>' +
          '<div class="price-box"><span class="label">Harga Paket</span><span class="price-xl">' + rupiah(p.harga) + '</span></div>' +
          '<h2 class="h-sub">Deskripsi</h2>' +
          '<p class="desc">' + esc(p.deskripsi || 'Belum ada deskripsi.') + '</p>' +
          '<a class="btn btn-primary btn-block" href="' + esc(wa) + '" target="_blank" rel="noopener">💬 Pesan via WhatsApp</a>' +
        '</div>' +
      '</div>' +
      (serupa.length
        ? '<section class="related"><h2>Parcel Lainnya di Kategori Ini</h2><div class="grid">' + serupa.map(kartuProduk).join('') + '</div></section>'
        : '');
  }

  /* ============================================================
     LOGIN ADMIN — Google Sign-In (Google Identity Services)
     ============================================================ */

  function tungguGoogle() {
    return new Promise((resolve) => {
      let n = 0;
      const t = setInterval(() => {
        if (window.google && google.accounts && google.accounts.id) { clearInterval(t); resolve(true); }
        else if (++n > 100) { clearInterval(t); resolve(false); }
      }, 100);
    });
  }

  async function tampilkanLogin() {
    app().innerHTML =
      '<section class="login-wrap"><div class="login-card">' +
        '<div class="login-head"><span class="login-logo">🎁</span>' +
        '<div><h1>Login Admin</h1><p>Masuk dengan akun Google yang sudah terdaftar sebagai admin katalog.</p></div></div>' +
        '<div id="login-msg" class="alert alert-danger" hidden></div>' +
        '<div id="gsi-btn" class="gsi-slot"></div>' +
        '<p class="muted small center">Akses diperiksa terhadap daftar admin di Google Sheets.</p>' +
        '<div class="center"><a class="back" href="#/">← Kembali ke Katalog Publik</a></div>' +
      '</div></section>';

    const r = await jalankan(panggilGet('auth.config'));
    if (!r) return tampilkanPesanLogin('Tidak dapat memuat konfigurasi login.');
    const cid = r.data.googleClientId;
    if (!cid) return tampilkanPesanLogin('Client ID Google belum diisi di Script Properties. Lihat Panduan Instalasi.');

    const siap = await tungguGoogle();
    if (!siap) return tampilkanPesanLogin('Layanan login Google gagal dimuat. Periksa koneksi lalu muat ulang halaman.');

    google.accounts.id.initialize({ client_id: cid, callback: saatLoginGoogle });
    google.accounts.id.renderButton($('#gsi-btn'), {
      theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 280, locale: 'id'
    });
  }

  function tampilkanPesanLogin(pesan) {
    const el = $('#login-msg');
    if (!el) return;
    el.textContent = pesan;
    el.hidden = false;
  }

  async function saatLoginGoogle(resp) {
    const r = await jalankan(panggilPost('auth.login', { idToken: resp.credential }));
    if (!r) return;
    simpanSesi({ token: r.data.token, email: r.data.email, nama: r.data.nama, exp: r.data.exp });
    updateNav();
    toast('Selamat datang, ' + r.data.nama + '!');
    location.hash = '#/admin/produk';
  }

  /* ============================================================
     ADMIN — kerangka, daftar parcel, form, kategori
     ============================================================ */

  function kerangkaAdmin(aktif, isi) {
    const s = sesi();
    app().innerHTML =
      '<div class="admin">' +
        '<aside class="sidebar">' +
          '<div class="side-brand">🗃️ <span>Admin Panel</span></div>' +
          '<nav class="side-nav" aria-label="Menu admin">' +
            '<a href="#/admin/produk" class="' + (aktif === 'produk' ? 'on' : '') + '">📦 Daftar Parcel</a>' +
            '<a href="#/admin/kategori" class="' + (aktif === 'kategori' ? 'on' : '') + '">🏷️ Kelola Kategori</a>' +
            '<a href="#/">↗ Lihat Katalog Publik</a>' +
          '</nav>' +
          '<button id="btn-logout" class="side-logout" type="button">⎋ Keluar' +
            (s && s.nama ? ' <small>(' + esc(s.nama) + ')</small>' : '') + '</button>' +
        '</aside>' +
        '<section class="admin-main">' + isi + '</section>' +
      '</div>';
    $('#btn-logout').addEventListener('click', () => {
      hapusSesi();
      updateNav();
      toast('Anda sudah keluar.');
      location.hash = '#/';
    });
  }

  async function tampilkanAdminProduk() {
    kerangkaAdmin('produk',
      '<div class="admin-head"><div><h1>Daftar Parcel</h1>' +
        '<p class="muted">Kelola parcel, harga, dan status tampil di katalog publik.</p></div>' +
        '<a class="btn btn-primary" href="#/admin/produk/baru">+ Tambah Parcel</a></div>' +
      '<div class="panel">' +
        '<div class="filter-row">' +
          '<input id="a-cari" class="input" type="search" placeholder="Cari nama parcel...">' +
          '<select id="a-kat" class="input"></select>' +
          '<select id="a-status" class="input">' +
            '<option value="">Semua Status</option><option value="ya">Tampil</option><option value="tidak">Disembunyikan</option>' +
          '</select>' +
        '</div>' +
        '<p id="a-info" class="muted small"></p>' +
        '<div class="table-wrap" id="a-tabel"><div class="skel-row"></div><div class="skel-row"></div><div class="skel-row"></div></div>' +
      '</div>');

    const r = await jalankan(panggilPost('product.list'));
    if (!r) return;
    state.adminProduk = r.data.produk;
    state.adminKategori = r.data.kategori;

    $('#a-kat').innerHTML = '<option value="">Semua Kategori</option>' +
      state.adminKategori.map((k) => '<option value="' + esc(k.id) + '">' + esc(k.nama) + '</option>').join('');
    ['#a-cari', '#a-kat', '#a-status'].forEach((s) => $(s).addEventListener('input', gambarAdminTabel));
    $('#a-tabel').addEventListener('click', (e) => {
      const t = e.target.closest('[data-toggle]');
      const h = e.target.closest('[data-hapus]');
      if (t) ubahTampil(t.dataset.toggle);
      if (h) hapusProduk(h.dataset.hapus);
    });
    gambarAdminTabel();
  }

  function gambarAdminTabel() {
    if (!$('#a-tabel')) return;
    const q = $('#a-cari').value.trim().toLowerCase();
    const kat = $('#a-kat').value;
    const st = $('#a-status').value;
    const list = state.adminProduk.filter((p) =>
      (!q || p.nama.toLowerCase().indexOf(q) !== -1) &&
      (!kat || p.kategoriId === kat) &&
      (!st || (st === 'ya' ? p.tampil : !p.tampil)));

    $('#a-info').textContent = 'Menampilkan ' + list.length + ' dari ' + state.adminProduk.length + ' parcel';
    if (!list.length) {
      $('#a-tabel').innerHTML = pesanKosong('Belum ada parcel', 'Tambahkan parcel pertama Anda, atau ubah filter.');
      return;
    }
    $('#a-tabel').innerHTML =
      '<table class="table"><thead><tr>' +
        '<th>Foto</th><th>Nama Parcel</th><th>Kategori</th><th>Harga</th><th>Status</th><th>Urutan</th><th>Aksi</th>' +
      '</tr></thead><tbody>' + list.map(barisAdmin).join('') + '</tbody></table>';
  }

  function barisAdmin(p) {
    const foto = p.foto ? '<img src="' + esc(p.foto) + '" alt="">' : '🎁';
    return '<tr>' +
      '<td><div class="thumb">' + foto + '</div></td>' +
      '<td><strong>' + esc(p.nama) + '</strong><div class="muted small">' + esc(p.id) + '</div></td>' +
      '<td>' + esc(p.kategori) + '</td>' +
      '<td class="nowrap">' + rupiah(p.harga) + '</td>' +
      '<td><span class="badge ' + (p.tampil ? 'b-ok' : 'b-off') + '">' + (p.tampil ? '● Tampil' : '○ Disembunyikan') + '</span></td>' +
      '<td>' + esc(p.urutan) + '</td>' +
      '<td class="aksi">' +
        '<a class="icon-btn" href="#/admin/produk/' + encodeURIComponent(p.id) + '" title="Ubah">✏️</a>' +
        '<button type="button" class="icon-btn" data-toggle="' + esc(p.id) + '" title="' + (p.tampil ? 'Sembunyikan' : 'Tampilkan') + '">' + (p.tampil ? '👁' : '🙈') + '</button>' +
        '<button type="button" class="icon-btn danger" data-hapus="' + esc(p.id) + '" title="Hapus">🗑</button>' +
      '</td></tr>';
  }

  async function ubahTampil(id) {
    const p = state.adminProduk.find((x) => x.id === id);
    if (!p) return;
    const r = await jalankan(panggilPost('product.save', {
      id: p.id, nama: p.nama, kategoriId: p.kategoriId, deskripsi: p.deskripsi,
      harga: p.harga, urutan: p.urutan, tampil: !p.tampil
    }));
    if (r) { toast(!p.tampil ? 'Parcel ditampilkan di katalog.' : 'Parcel disembunyikan dari katalog.'); tampilkanAdminProduk(); }
  }

  async function hapusProduk(id) {
    const p = state.adminProduk.find((x) => x.id === id);
    if (!p) return;
    if (!confirm('Hapus parcel "' + p.nama + '"? Tindakan ini tidak dapat dibatalkan.')) return;
    const r = await jalankan(panggilPost('product.delete', { id: id }));
    if (r) { toast(r.message); tampilkanAdminProduk(); }
  }

  async function tampilkanFormProduk(id) {
    kerangkaAdmin('produk',
      '<div class="admin-head"><div>' +
        '<a class="back" href="#/admin/produk">← Kembali ke Daftar Parcel</a>' +
        '<h1>' + (id ? 'Ubah Parcel' : 'Tambah Parcel Baru') + '</h1>' +
        '<p class="muted">Foto disimpan di Google Drive, data disimpan di Google Sheets.</p>' +
      '</div></div>' +
      '<form id="form-produk" class="form" novalidate>' +
        '<fieldset class="form-sec"><legend>1 · Informasi Parcel</legend>' +
          '<label class="field"><span>Nama Parcel <b class="req">*</b></span>' +
            '<input id="f-nama" class="input" maxlength="120" placeholder="Contoh: Royal Emerald Blessing"></label>' +
          '<div class="row2">' +
            '<label class="field"><span>Kategori <b class="req">*</b></span><select id="f-kat" class="input"></select></label>' +
            '<label class="field"><span>Harga (Rp) <b class="req">*</b></span>' +
              '<input id="f-harga" class="input" type="number" min="1" step="1" inputmode="numeric" placeholder="850000"></label>' +
          '</div>' +
          '<label class="field"><span>Deskripsi</span>' +
            '<textarea id="f-desk" class="input" rows="5" maxlength="2000" placeholder="Isi parcel, bahan, dan dimensi"></textarea></label>' +
        '</fieldset>' +
        '<fieldset class="form-sec"><legend>2 · Foto Parcel</legend>' +
          '<div class="foto-grid">' +
            '<label class="dropzone" for="f-foto"><span class="dz-icon">🖼️</span>' +
              '<strong>Klik untuk pilih foto</strong><small>JPG, PNG, WEBP · maks 5 MB</small>' +
              '<input id="f-foto" type="file" accept="image/jpeg,image/png,image/webp" hidden></label>' +
            '<div class="preview" id="f-preview">Belum ada foto</div>' +
          '</div>' +
        '</fieldset>' +
        '<fieldset class="form-sec"><legend>3 · Tampilan &amp; Urutan</legend>' +
          '<div class="row2">' +
            '<label class="toggle"><input id="f-tampil" type="checkbox" checked><span class="slider"></span><span>Tampilkan di katalog</span></label>' +
            '<label class="field"><span>Urutan Tampil</span>' +
              '<input id="f-urut" class="input" type="number" min="1" step="1" placeholder="1 = paling depan"></label>' +
          '</div>' +
        '</fieldset>' +
        '<div class="form-bar">' +
          '<a class="btn btn-outline" href="#/admin/produk">Batal</a>' +
          '<button class="btn btn-primary" type="submit" id="f-simpan">Simpan Parcel</button>' +
        '</div>' +
      '</form>');

    const r = await jalankan(panggilPost('product.list'));
    if (!r) return;
    state.adminProduk = r.data.produk;
    state.adminKategori = r.data.kategori;

    $('#f-kat').innerHTML = '<option value="">— Pilih kategori —</option>' +
      state.adminKategori.map((k) => '<option value="' + esc(k.id) + '">' + esc(k.nama) + '</option>').join('');

    let fotoLama = '';
    if (id) {
      const p = state.adminProduk.find((x) => x.id === id);
      if (!p) { toast('Parcel tidak ditemukan.', 'error'); location.hash = '#/admin/produk'; return; }
      $('#f-nama').value = p.nama;
      $('#f-kat').value = p.kategoriId;
      $('#f-harga').value = p.harga;
      $('#f-desk').value = p.deskripsi;
      $('#f-tampil').checked = p.tampil;
      $('#f-urut').value = p.urutan === 999 ? '' : p.urutan;
      fotoLama = p.foto;
    }
    if (fotoLama) setPreview(fotoLama);

    $('#f-foto').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (FOTO_MIME.indexOf(f.type) === -1) {
        toast('Format foto harus JPG, PNG, atau WEBP.', 'error');
        e.target.value = '';
        return;
      }
      if (f.size > FOTO_MAKS) {
        toast('Ukuran foto maksimal 5 MB.', 'error');
        e.target.value = '';
        return;
      }
      setPreview(URL.createObjectURL(f));
    });

    $('#form-produk').addEventListener('submit', (e) => {
      e.preventDefault();
      simpanForm(id);
    });
  }

  function setPreview(src) {
    $('#f-preview').innerHTML = '<img src="' + esc(src) + '" alt="Pratinjau foto parcel">';
  }

  async function simpanForm(id) {
    const nama = $('#f-nama').value.trim();
    const kat = $('#f-kat').value;
    const harga = Number($('#f-harga').value);
    const urut = $('#f-urut').value;
    const tombol = $('#f-simpan');

    if (!nama) return toast('Nama parcel wajib diisi.', 'error');
    if (!kat) return toast('Pilih kategori terlebih dahulu.', 'error');
    if (!(harga > 0)) return toast('Harga harus berupa angka lebih dari 0.', 'error');

    tombol.disabled = true;
    tombol.textContent = 'Menyimpan…';
    try {
      const data = {
        id: id || '',
        nama: nama,
        kategoriId: kat,
        deskripsi: $('#f-desk').value.trim(),
        harga: Math.round(harga),
        tampil: $('#f-tampil').checked,
        urutan: urut ? Number(urut) : ''
      };
      const file = $('#f-foto').files[0];
      if (file) {
        data.fotoBase64 = await bacaBase64(file);
        data.fotoMime = file.type;
        data.fotoNama = file.name;
      }
      const r = await jalankan(panggilPost('product.save', data));
      if (r) {
        toast(r.message);
        location.hash = '#/admin/produk';
      }
    } catch (err) {
      toast('Foto tidak dapat dibaca. Coba pilih ulang.', 'error');
    } finally {
      tombol.disabled = false;
      tombol.textContent = 'Simpan Parcel';
    }
  }

  async function tampilkanKategori() {
    kerangkaAdmin('kategori',
      '<div class="admin-head"><div><h1>Kelola Kategori</h1>' +
        '<p class="muted">Kategori mengelompokkan parcel. Kategori yang masih dipakai parcel tidak dapat dihapus.</p>' +
      '</div></div>' +
      '<div class="grid-2">' +
        '<div class="panel">' +
          '<h2 id="k-judul">Tambah Kategori</h2>' +
          '<form id="form-kat" class="form-inline">' +
            '<input id="k-nama" class="input" maxlength="60" placeholder="Nama kategori, mis. Parcel Natal">' +
            '<button class="btn btn-primary" type="submit" id="k-simpan">Tambah</button>' +
            '<button class="btn btn-outline" type="button" id="k-batal" hidden>Batal</button>' +
          '</form>' +
        '</div>' +
        '<div class="panel"><div id="k-list"><div class="skel-row"></div><div class="skel-row"></div></div></div>' +
      '</div>');

    state.katEditId = '';
    const r = await jalankan(panggilPost('product.list'));
    if (!r) return;
    state.adminKategori = r.data.kategori;
    gambarKategori();

    $('#form-kat').addEventListener('submit', (e) => { e.preventDefault(); simpanKategori(); });
    $('#k-batal').addEventListener('click', () => resetFormKategori());
    $('#k-list').addEventListener('click', (e) => {
      const ed = e.target.closest('[data-edit]');
      const hp = e.target.closest('[data-hapus]');
      if (ed) mulaiEditKategori(ed.dataset.edit);
      if (hp) hapusKategori(hp.dataset.hapus);
    });
  }

  function gambarKategori() {
    if (!$('#k-list')) return;
    if (!state.adminKategori.length) {
      $('#k-list').innerHTML = pesanKosong('Belum ada kategori', 'Tambahkan kategori pertama di sebelah kiri.');
      return;
    }
    $('#k-list').innerHTML = '<table class="table" style="min-width:0"><thead><tr>' +
      '<th>Nama Kategori</th><th>Parcel</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
      state.adminKategori.map((k) => {
        const terkunci = k.jumlah > 0;
        return '<tr>' +
          '<td><strong>' + esc(k.nama) + '</strong><div class="muted small">' + esc(k.id) + '</div></td>' +
          '<td>' + k.jumlah + '</td>' +
          '<td><span class="badge ' + (terkunci ? 'b-warn' : 'b-ok') + '">' + (terkunci ? 'Terpakai' : 'Bisa dihapus') + '</span></td>' +
          '<td class="aksi">' +
            '<button type="button" class="icon-btn" data-edit="' + esc(k.id) + '" title="Ubah">✏️</button>' +
            '<button type="button" class="icon-btn danger" data-hapus="' + esc(k.id) + '" title="' +
              (terkunci ? 'Tidak bisa dihapus karena masih dipakai' : 'Hapus') + '"' +
              (terkunci ? ' disabled' : '') + '>🗑</button>' +
          '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function mulaiEditKategori(id) {
    const k = state.adminKategori.find((x) => x.id === id);
    if (!k) return;
    state.katEditId = id;
    $('#k-judul').textContent = 'Ubah Kategori';
    $('#k-nama').value = k.nama;
    $('#k-simpan').textContent = 'Simpan';
    $('#k-batal').hidden = false;
    $('#k-nama').focus();
  }

  function resetFormKategori() {
    state.katEditId = '';
    $('#k-judul').textContent = 'Tambah Kategori';
    $('#k-nama').value = '';
    $('#k-simpan').textContent = 'Tambah';
    $('#k-batal').hidden = true;
  }

  async function simpanKategori() {
    const nama = $('#k-nama').value.trim();
    if (!nama) return toast('Nama kategori wajib diisi.', 'error');
    const r = await jalankan(panggilPost('category.save', { id: state.katEditId, nama: nama }));
    if (r) { toast(r.message); tampilkanKategori(); }
  }

  async function hapusKategori(id) {
    const k = state.adminKategori.find((x) => x.id === id);
    if (!k) return;
    if (!confirm('Hapus kategori "' + k.nama + '"?')) return;
    const r = await jalankan(panggilPost('category.delete', { id: id }));
    if (r) { toast(r.message); tampilkanKategori(); }
  }

  /* ============================================================
     ROUTER — hash-based, satu halaman (cocok untuk GitHub Pages)
     ============================================================ */

  function rute() {
    if (!configOk()) {
      app().innerHTML = '<div class="alert alert-danger">Konfigurasi belum lengkap. Isi <code>GAS_URL</code> di <code>js/config.js</code> dengan URL /exec dari Apps Script.</div>';
      return;
    }
    updateNav();
    const bagian = (location.hash || '#/').replace(/^#\/?/, '').split('/').filter(Boolean);
    const a = bagian[0], b = bagian[1], c = bagian[2];

    if (a === 'login') return tampilkanLogin();
    if (a === 'parcel' && b) return tampilkanDetail(decodeURIComponent(b));
    if (a === 'admin') {
      if (!sesi()) { location.hash = '#/login'; return; }
      if (!b) { location.hash = '#/admin/produk'; return; }
      if (b === 'kategori') return tampilkanKategori();
      if (b === 'produk' && c === 'baru') return tampilkanFormProduk('');
      if (b === 'produk' && c) return tampilkanFormProduk(decodeURIComponent(c));
      return tampilkanAdminProduk();
    }
    return tampilkanKatalog();
  }

  window.addEventListener('hashchange', rute);

  // Inisialisasi
  const wa = $('#footer-wa');
  if (wa && nomorWA()) wa.href = 'https://wa.me/' + nomorWA();
  updateNav();
  rute();
})();
