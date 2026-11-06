# 📋 Panduan Instalasi — Katalog Parcel

Panduan ini membawa Anda dari nol sampai katalog online berjalan. Ada dua bagian: **backend** (Google Apps Script + Google Sheets + Google Drive) dan **frontend** (situs di GitHub Pages).

---

## Gambaran Singkat

```
Pengunjung ──► GitHub Pages (index.html, css/, js/)
                    │  fetch() JSON
                    ▼
              Google Apps Script (Kode.gs)  ──►  Google Sheets (Produk, Kategori, Admin)
                                             ──►  Google Drive (Foto Parcel)
```

Berkas yang Anda terima:

| Berkas | Fungsi | Cara pakai |
|---|---|---|
| `Kode.gs` | Backend (REST API) | Tempel ke editor Apps Script |
| `appsscript.json` | Pengaturan proyek Apps Script | Tempel ke berkas manifest |
| `katalog-parcel-frontend.zip` | Frontend (`index.html` di root) | Ekstrak, lalu deploy ke GitHub Pages |
| `PANDUAN-INSTALASI.md` | Panduan ini | Dibaca |

---

## BAGIAN A — Backend (Google Apps Script)

### A1. Buat proyek Apps Script

1. Buka <https://script.google.com> dengan akun Google pemilik toko.
2. Klik **Proyek Baru**. Beri nama **Katalog Parcel**.
3. Di editor, hapus isi `Code.gs` yang sudah ada, lalu **tempel seluruh isi `Kode.gs`**.
4. Rename berkas `Code.gs` menjadi `Kode` (opsional, agar rapi).
5. Buka **⚙️ Setelan Proyek** → centang **Tampilkan berkas "appsscript.json" di editor manifes**.
6. Kembali ke editor, buka `appsscript.json`, hapus isinya, lalu **tempel isi `appsscript.json`**.

> ⚠️ Pastikan zona waktu di `appsscript.json` adalah `Asia/Jakarta` dan akses Web App adalah `ANYONE_ANONYMOUS`.

### A2. Jalankan setup (SEKALI)

1. Di bagian atas editor, pada menu dropdown fungsi, pilih **`setupAppEnvironment`**, lalu klik **▶ Jalankan**.
2. Klik **Tinjau izin** → pilih akun Anda → **Lanjutan** → **Buka … (tidak aman)** → **Izinkan**. Ini normal karena proyek ini milik Anda sendiri.
3. Buka **Execution log** (Ctrl+Enter atau menu *Eksekusi*). Pastikan muncul tulisan **✅ Setup selesai**.
4. Cek Google Drive: folder **📁 Katalog Parcel** dan subfolder **📂 Foto Parcel** sudah terbuat.
5. Cek Google Drive: file **🗃️ Database — Katalog Parcel** sudah terbuat dengan sheet **Produk**, **Kategori** (berisi 4 kategori contoh), dan **Admin**.

> ⚠️ `setupAppEnvironment` aman dijalankan ulang (tidak menimpa data), tetapi cukup sekali saja.

### A3. Isi GOOGLE_CLIENT_ID (login admin)

Login admin memakai akun Google. Anda perlu satu **OAuth Client ID**:

1. Buka <https://console.cloud.google.com> → pilih atau buat proyek.
2. Menu **APIs & Services → OAuth consent screen**: isi nama aplikasi (**Katalog Parcel**) dan email Anda, lalu simpan. Pilih tipe **External** jika akun Anda Gmail biasa.
3. Menu **APIs & Services → Credentials → + Create Credentials → OAuth client ID**.
4. Tipe aplikasi: **Web application**. Nama bebas (misal *Katalog Parcel Web*).
5. Di bagian **Authorized JavaScript origins**, klik **+ Add URI** dan isi **persis** seperti ini (tanpa garis miring di akhir):
   ```
   https://USERNAME-GITHUB-ANDA.github.io
   ```
   Ganti `USERNAME-GITHUB-ANDA` dengan username GitHub Anda. Jika Anda juga ingin menguji di komputer sendiri, tambahkan juga `http://localhost:8080` (atau port yang Anda pakai).
6. Klik **Create**. Salin **Client ID** (berakhiran `.apps.googleusercontent.com`).
7. Kembali ke Apps Script → **⚙️ Setelan Proyek → Script Properties → Tambahkan properti**:
   - **Properti**: `GOOGLE_CLIENT_ID`
   - **Nilai**: (tempel Client ID tadi)
8. Klik **Simpan properti**.

> 🔐 Client ID ini disimpan di Script Properties dan **tidak** ditulis di kode maupun di frontend. Frontend mengambilnya saat runtime.
>
> `SESSION_SECRET` dibuat otomatis oleh setup. Jangan diubah dan jangan dibagikan.

### A4. Daftarkan email admin

1. Buka file Google Sheets **🗃️ Database — Katalog Parcel**, lalu buka tab **Admin**.
2. Isi satu baris di bawah header:

| ID | Email | Nama | Aktif |
|---|---|---|---|
| A001 | email.anda@gmail.com | Nama Anda | Ya |

- Email harus sama persis dengan akun Google yang akan dipakai login (huruf kecil/besar tidak masalah).
- Kolom **Aktif** harus **Ya** agar akun bisa masuk. Ubah menjadi **Tidak** untuk mencabut akses.
- Hanya email yang terdaftar di sini yang bisa masuk ke dashboard admin.

### A5. Deploy Web App

1. Di editor Apps Script, klik **Deploy → New deployment**.
2. Klik ikon roda gigi, pilih **Web app**.
3. Isi:
   - **Description**: `v1`
   - **Execute as**: **Me** (akun Anda)
   - **Who has access**: **Anyone**
4. Klik **Deploy**. Jika diminta izin, setujui seperti pada A2.
5. **Salin URL Web app** yang berakhiran `/exec`. Contoh bentuknya:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

> 🔁 **Untuk update berikutnya:** jangan klik *New deployment* lagi. Pilih **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. URL `/exec` tetap sama.

### A6. Uji backend (opsional tetapi disarankan)

Buka URL `/exec` Anda di browser dengan tambahan `?action=catalog`:

```
https://script.google.com/macros/s/AKfycb.../exec?action=catalog
```

Jika muncul teks JSON berisi `"success":true` dan daftar kategori, backend sudah benar. Jika kategori tampil tetapi `produk` kosong, itu wajar karena belum ada parcel.

---

## BAGIAN B — Frontend (GitHub Pages)

### B1. Isi konfigurasi

1. Buat folder baru bernama **`katalog-parcel-frontend`** (misalnya di Downloads), lalu **ekstrak isi `katalog-parcel-frontend.zip` ke dalam folder itu**. Isi ZIP sudah berada di root, jadi jangan membuat folder tambahan di dalamnya.
2. Buka `js/config.js` dengan Notepad atau editor teks lain.
3. Ganti dua nilai berikut:
   - `GAS_URL` → tempel URL `/exec` dari A5.
   - `WA_NUMBER` → nomor WhatsApp toko dengan format `62...` (tanpa `+`, tanpa spasi). Contoh: `6281234567890`.
4. Simpan.

> ⚠️ **Jangan** mengubah berkas lain di dalam folder. `config.js` adalah satu-satunya berkas yang perlu diisi.

### B2. Pastikan struktur folder benar

Setelah diekstrak, isi folder harus seperti ini. **`index.html` harus berada di baris paling atas**, tidak di dalam folder lain:

```
katalog-parcel-frontend/        ← ini folder tempat "git init" dijalankan
├── index.html                  ← WAJIB di root
├── PANDUAN-INSTALASI.md
├── css/
│   └── style.css
└── js/
    ├── config.js
    └── app.js
```

> **Folder yang dipakai untuk git adalah `katalog-parcel-frontend`** (folder yang berisi `index.html`). Bukan folder induknya.

### B3. Buat repository di GitHub

1. Login ke <https://github.com>. Pilih username dengan bijak, karena akan menjadi bagian alamat situs Anda.
2. Klik **+ → New repository**.
3. Isi nama, misalnya `katalog-parcel`. Pilih **Public** (wajib untuk GitHub Pages gratis).
4. **Jangan** centang README, .gitignore, atau license.
5. Klik **Create repository**, dan biarkan halaman ini terbuka.

### B4. Push dari terminal

> Panduan ini mengikuti alur terminal. **Jangan** mengunggah berkas lewat tombol "Upload files" di web GitHub, karena struktur folder `css/` dan `js/` bisa rusak.

**1. Install Git** (jika belum ada): <https://git-scm.com>. Cek dengan `git --version`.

**2. Atur identitas Git** (sekali saja di komputer ini):
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-sama-dengan-akun-github@contoh.com"
```

**3. Masuk ke folder frontend** (folder yang berisi `index.html`). Di Windows PowerShell:
```powershell
cd "C:\Users\NAMA-ANDA\Downloads\katalog-parcel-frontend"
dir
```
Pastikan `index.html` terlihat di daftar. Jika tidak, Anda masuk ke folder yang salah.

**4. Inisialisasi dan kirim:**
```bash
git init
git add .
git commit -m "Katalog Parcel v1"
git branch -M main
git remote add origin https://github.com/USERNAME-GITHUB-ANDA/katalog-parcel.git
git push -u origin main
```

**5. Login saat diminta.** GitHub tidak menerima password biasa untuk `git push`. Gunakan **Personal Access Token**:
- GitHub → foto profil → **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token**.
- Centang scope **repo**. Salin token yang muncul (hanya tampil sekali).
- Saat terminal meminta *Password*, tempel token itu. Karakter tidak akan terlihat saat mengetik, dan itu normal.

### B5. Aktifkan GitHub Pages

1. Di halaman repository, buka **Settings → Pages**.
2. Di bagian **Build and deployment → Source**, pilih **Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)**. Klik **Save**.
4. Tunggu 1–2 menit. Alamat situs Anda akan tampil:
   ```
   https://USERNAME-GITHUB-ANDA.github.io/katalog-parcel/
   ```

> Jika halaman 404, pastikan `index.html` ada di root repository (cek tab *Code* di GitHub). Jika halaman tampil tanpa warna, tekan **Ctrl+Shift+R**.

### B6. Update frontend di kemudian hari

Ganti berkas di folder lokal, lalu:
```bash
git add .
git commit -m "Perbarui tampilan"
git push
```

---

## BAGIAN C — Cara Pemakaian

### Untuk pengunjung
- Buka alamat situs. Katalog tampil otomatis.
- Gunakan kolom pencarian atau chip kategori untuk menyaring parcel.
- Klik kartu untuk melihat detail, lalu tekan **Pesan via WhatsApp**.

### Untuk admin
1. Klik **Login Admin** di pojok kanan atas, lalu login dengan akun Google yang terdaftar.
2. **Daftar Parcel**: cari, saring, tampilkan atau sembunyikan (ikon 👁), ubah (✏️), hapus (🗑).
3. **+ Tambah Parcel**: isi nama, kategori, harga, deskripsi, unggah foto (maks 5 MB), atur status tampil dan urutan.
   - **Urutan**: angka kecil tampil lebih dulu. Kosongkan untuk ditaruh paling belakang.
4. **Kelola Kategori**: tambah, ubah nama, atau hapus. Kategori yang masih dipakai parcel tidak bisa dihapus.
5. Sesi login berlaku **12 jam**. Setelah itu login ulang.

---

## Checklist Uji Sebelum Diumumkan

- [ ] Halaman katalog tampil di ponsel dan desktop, dengan kategori contoh.
- [ ] Pencarian dan chip kategori berfungsi.
- [ ] Detail parcel tampil, dan tombol WhatsApp membuka chat dengan pesan terisi.
- [ ] Login admin berhasil dengan email yang terdaftar.
- [ ] Login dengan akun Google lain ditolak dengan pesan "belum terdaftar sebagai admin".
- [ ] Tambah parcel dengan foto: data muncul di Sheets, foto muncul di Drive (folder Foto Parcel), dan tampil di katalog.
- [ ] Parcel yang disembunyikan tidak muncul di katalog publik.
- [ ] Ubah harga: perubahan terlihat di katalog (paling lambat 10 menit, karena cache).
- [ ] Hapus kategori yang masih dipakai ditolak dengan pesan yang jelas.
- [ ] Validasi form: nama kosong, harga 0, dan foto selain JPG/PNG/WEBP atau lebih dari 5 MB ditolak.

---

## Catatan Penting

**Keamanan**
- Rahasia (Client ID, `SESSION_SECRET`) hanya di **Script Properties**. Tidak ada di kode, Sheets, atau GitHub.
- Jangan membagikan spreadsheet database secara publik. Jangan menambah editor proyek Apps Script sembarangan, karena editor bisa melihat Script Properties.
- Sesi admin dapat dicabut dengan mengubah kolom **Aktif** menjadi **Tidak**. Akses akan ditolak pada permintaan berikutnya.

**Batasan**
- **Cache 10 menit**: perubahan yang dilakukan langsung di Google Sheets (bukan lewat dashboard) bisa membutuhkan hingga 10 menit untuk tampil di katalog. Untuk langsung, ubah lewat dashboard admin.
- **Foto lama tidak otomatis dihapus** dari Drive saat parcel dihapus atau fotonya diganti. Anda bisa menghapusnya manual di folder Foto Parcel.
- **Pemesanan** dilakukan lewat WhatsApp, bukan lewat keranjang di situs. Tidak ada pencatatan pesanan di sistem ini.
- **Login Google** membutuhkan akun Google. Pengunjung biasa tidak perlu login.

**Migrasi data dari app lama**
- Tidak diperlukan untuk instalasi baru ini. Jika suatu saat Anda punya app katalog lama yang ingin dipindahkan, kita bisa menyiapkan modul impor yang aman (dry-run, idempoten, dan tidak mengubah app lama).

---

## Troubleshooting

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| Halaman tampil "Konfigurasi belum lengkap" | `GAS_URL` belum diisi atau masih placeholder | Isi `js/config.js` dengan URL `/exec`, lalu push ulang |
| Katalog kosong dan muncul "Tidak dapat terhubung ke server" | URL `/exec` salah, atau deployment belum "Anyone" | Cek A5. Jika ubah izin, buat *New version* |
| Katalog kosong padahal sudah ada parcel | Parcel berstatus "Tidak", atau cache belum diperbarui | Pastikan Status Tampil = Ya. Tunggu 10 menit atau ubah parcel |
| Error "Setup belum dijalankan" | `setupAppEnvironment()` belum dijalankan | Jalankan sekali (A2) |
| Login: "GOOGLE_CLIENT_ID belum diisi" | Script Properties belum diisi | Lakukan A3 |
| Login Google menampilkan "origin tidak diizinkan" | Alamat situs tidak sama persis dengan Authorized JavaScript origin | Samakan URI di Google Cloud Console (tanpa `/katalog-parcel/` dan tanpa garis miring akhir) |
| Login: "belum terdaftar sebagai admin" | Email belum ada di sheet Admin, atau kolom Aktif bukan Ya | Lakukan A4 |
| Login berhasil tetapi tiba-tiba diminta login ulang | Sesi 12 jam sudah habis | Login ulang (normal) |
| Foto gagal diunggah | Format bukan JPG/PNG/WEBP, atau ukuran lebih dari 5 MB | Kompres atau pilih foto lain |
| `Password authentication is not supported` saat push | GitHub menolak password biasa | Gunakan Personal Access Token (B4 langkah 5) |
| Halaman GitHub Pages 404 | `index.html` tidak di root, atau Pages belum diatur | Cek B2 dan B5 |
| CSS/JS tidak dimuat (tampil polos) | Folder `css/` atau `js/` tidak ikut ter-push | Pastikan `git add .` dijalankan dari folder yang benar |
| Perubahan di Apps Script tidak terasa | Deployment masih versi lama | Deploy → Manage deployments → Edit → New version |
| `Error: Exceeded maximum execution time` | Sheet sangat besar | Hubungi pengembang untuk optimasi lanjutan |

---

✅ Jika semua checklist uji lolos, katalog Anda siap dibagikan ke pelanggan.
