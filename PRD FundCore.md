# PRD FundCore: Platform Crowdfunding Donasi

**Versi:** 1.0 (Draft) | **Tanggal:** 6 Oktober 2026 | **Referensi UX:** niatbaik.id, kitabisa.com

## 1. Ringkasan Produk

FundCore adalah platform crowdfunding berbasis web untuk penggalangan dana (donasi) yang **mobile-first, sangat ringan, dan berorientasi konversi**. Donatur dapat menemukan campaign, berdonasi dalam kurang dari 60 detik tanpa wajib registrasi, membayar via Winpay, lalu menerima notifikasi WhatsApp melalui WAHA. Admin memantau capaian donasi secara menyeluruh lewat dashboard.

**Stack:** SvelteKit + TypeScript (fullstack, satu codebase, satu app Dokku, beberapa container per fungsi), PostgreSQL + Redis, MinIO (storage file), WAHA (WhatsApp), Winpay (payment gateway), dan Dokku di VPS. Aplikasi bersifat **white-label**: nama, logo, dan warna (aturan 60/30/10) diatur dari menu admin.

### Catatan Keputusan Teknis Penting

1. **MinIO adalah object storage (kompatibel S3), bukan database.** MinIO tidak cocok untuk query transaksi, agregasi, atau relasi. Rekomendasi: **MinIO untuk file** (gambar campaign, bukti penyaluran, dokumen verifikasi, export laporan, backup) dan **PostgreSQL untuk data transaksional** (user, campaign, donasi, pembayaran). Ini juga kunci agar sistem tidak lemot saat data membesar.
2. **SvelteKit dipilih agar fullstack, ringan, dan mudah dirawat.** Pendekatan yang disarankan: **server-side rendering (SSR) dengan JavaScript hanya untuk bagian interaktif, dalam satu codebase**. Hasilnya halaman cepat dimuat, SEO bagus (penting untuk traffic organik campaign), dan hemat data seluler.
3. **WAHA adalah WhatsApp HTTP API tidak resmi** (berbasis WhatsApp Web). Ada risiko nomor diblokir jika dipakai untuk blast. Perlu rate limiting, opt-in, dan fallback (lihat bagian Risiko).
4. Integrasi Winpay memakai Checkout Page (lihat 6.4); daftar channel aktif dan biaya per channel tetap harus **diverifikasi ulang ke dokumentasi resmi Winpay** (docs.winpay.id) saat implementasi.

## 2. Tujuan & Metrik Keberhasilan

| Tujuan | KPI | Target awal |
| --- | --- | --- |
| Mendatangkan banyak donatur | Conversion rate halaman campaign ke donasi sukses | ≥ 3–5% |
| Checkout cepat | Waktu dari klik "Donasi" hingga bayar | < 60 detik |
| Donasi berulang | Repeat donor rate (90 hari) | ≥ 15% |
| Performa | LCP di 4G (Moto G class) | < 2,5 detik |
| Ketersediaan | Uptime | ≥ 99,5% |
| Kepercayaan | Campaign terverifikasi | 100% campaign aktif dibuat admin atau fundraiser yang sudah disetujui |

## 3. Persona

- **Donatur (utama):** pengguna Android kelas menengah ke bawah, koneksi 3G/4G tidak stabil, terbiasa WhatsApp, mengenal e-wallet/QRIS/VA. Sering datang dari link share WhatsApp, Instagram, TikTok.
- **Penggalang dana (fundraiser):** individu/yayasan yang membuat campaign dan membagikan link.
- **Admin/Operator:** menyetujui fundraiser, memantau donasi, mencairkan dana, mengelola konten.
- **Finance:** rekonsiliasi pembayaran dan pencairan.

## 4. Ruang Lingkup

### Dalam Lingkup (MVP)

Halaman publik (home, daftar & detail campaign), checkout donasi tanpa login, integrasi Winpay, notifikasi WhatsApp, form pembuatan campaign, pengaturan branding dan tema (white-label), dashboard admin dengan monitoring capaian donasi, manajemen campaign, laporan.

### Di Luar Lingkup MVP (Fase Lanjutan)

Aplikasi native, donasi rutin otomatis (recurring), zakat/wakaf, fundraiser leaderboard, multi-bahasa, multi-tenant dalam satu instalasi, program corporate/CSR.

## 5. Arsitektur Tingkat Tinggi

**Komponen**

- **Process `web` (SvelteKit + TypeScript):** halaman publik (SSR), dashboard admin dan fundraiser, API, dan endpoint callback yang hanya memvalidasi lalu menaruh job di antrean. Satu-satunya process yang menerima trafik HTTP.
- **Process `worker-pay`:** memproses callback Winpay, konfirmasi status, rekonsiliasi, kedaluwarsa donasi, dan perhitungan biaya. Jalur uang dipisah agar tidak antre di belakang pekerjaan lain.
- **Process `worker-wa`:** mengirim WhatsApp (donasi dibuat, donasi sukses, follow up 2 jam) dengan rate limit per nomor CS dan jeda acak.
- **Process `worker-batch`:** rollup dashboard, export, laporan, job terjadwal, dan kompresi gambar; pekerjaan berat yang boleh lambat.
- **PostgreSQL:** data utama, dengan read replica untuk dashboard saat skala naik.
- **Redis:** cache halaman dan fragmen, rate limit, antrean job (BullMQ), idempotency key, cache tema.
- **MinIO:** penyimpanan gambar dan dokumen, diakses lewat CDN.
- **WAHA (Docker):** gateway WhatsApp, layanan terpisah; hanya dipanggil oleh `worker-wa`.
- **CDN + reverse proxy (nginx Dokku/Cloudflare):** cache aset statis dan halaman campaign publik.

Semua process type berasal dari satu codebase dan satu proyek Dokku (`fundcore`), tetapi berjalan sebagai container terpisah yang di-scale sendiri-sendiri. PostgreSQL, Redis, MinIO, dan WAHA adalah software lain, jadi berjalan sebagai layanan tersendiri.

**Alur data donasi**

1. Donatur mengisi nominal, nama, dan nomor WhatsApp, lalu klik Bayar.
2. Backend membuat donasi berstatus `pending` dan invoice Winpay Checkout Page, lalu menyimpan `redirect_url`.
3. Donatur diarahkan ke halaman bayar Winpay. Link yang sama dikirim lewat WhatsApp (notifikasi donasi dibuat) dan follow up 2 jam dijadwalkan.
4. Winpay mengirim callback; backend membalas `ACCEPTED`, menaruh job di antrean, dan worker mengonfirmasi status ke Winpay.
5. Donasi menjadi `paid`; worker menghitung biaya, memperbarui total campaign, membatalkan follow up, dan mengirim WhatsApp donasi sukses.

### Deployment di VPS (Dokku)

FundCore dideploy sebagai **satu app Dokku** (`fundcore`) yang menjalankan beberapa **process type**. Semuanya dari kode yang sama dan sekali `git push`, tetapi tiap process type berjalan di container sendiri dan di-scale sendiri, sehingga pekerjaan berat tidak membuat halaman publik lemot. Perawatan tetap lewat satu nama app, misalnya `dokku logs fundcore -p worker-wa` atau `dokku ps:report fundcore`.

| Process type | Fungsi | Skala awal | Kenapa dipisah |
| --- | --- | --- | --- |
| `web` | Halaman publik, dashboard, API, penerima callback | 2 | Satu-satunya yang menerima trafik; dua instance agar deploy tanpa downtime dan tahan lonjakan |
| `worker-pay` | Callback Winpay, konfirmasi status, rekonsiliasi, kedaluwarsa donasi | 1 | Jalur uang tidak boleh antre di belakang pesan WhatsApp atau export |
| `worker-wa` | Pengiriman WhatsApp lewat antrean dengan rate limit per nomor | 1 | Pengiriman sengaja lambat (jeda acak) dan tidak boleh menahan pekerjaan lain |
| `worker-batch` | Rollup dashboard, export, laporan, job terjadwal, kompresi gambar | 1 | Pekerjaan berat dan boleh lambat; diberi batas CPU dan memori sendiri agar tidak mengganggu `web` |

| Layanan | Di Dokku | Catatan |
| --- | --- | --- |
| PostgreSQL | Plugin dokku-postgres, di-link ke app `fundcore` | Backup terjadwal ke MinIO dan salinan di luar VPS |
| Redis | Plugin dokku-redis, di-link ke app `fundcore` | Cache, antrean job, rate limit |
| MinIO | Container layanan terpisah dengan volume persisten | Gambar publik lewat CDN, dokumen privat lewat pre-signed URL |
| WAHA | Container layanan terpisah dengan volume sesi persisten dan API key aktif | Hanya dipanggil oleh `worker-wa` |

Pembagian process type didefinisikan di `Procfile`, dan skalanya diatur dengan satu perintah:

```text
# Procfile
web: node build/index.js
worker-pay: node build/workers/pay.js
worker-wa: node build/workers/wa.js
worker-batch: node build/workers/batch.js

# skala awal
dokku ps:scale fundcore web=2 worker-pay=1 worker-wa=1 worker-batch=1
```

- Hanya `web` yang terhubung ke nginx Dokku dan memakai health check; worker tidak membuka port.
- Tiap process type diberi batas CPU dan memori sendiri lewat plugin resource Dokku, terutama `worker-batch`.
- Migrasi database berjalan otomatis pada tahap release deploy.
- Saat trafik naik, langkah pertama adalah menambah `web` (mis. `web=3`). Perlu diingat `ps:scale` hanya menambah container di VPS yang sama; bila CPU atau RAM VPS jenuh, naikkan spesifikasi VPS atau pindahkan PostgreSQL, Redis, dan MinIO ke server lain.

Dokku menyediakan reverse proxy nginx, SSL Let's Encrypt, dan deploy tanpa downtime lewat health check. Rahasia (credential Winpay, kunci enkripsi) disimpan sebagai config app Dokku.

## 6. Kebutuhan Fungsional

Prioritas: **P0** = wajib MVP, **P1** = penting, **P2** = nanti.

### 6.1 Halaman Publik (UX mengikuti niatbaik.id)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F-01 | **Home:** hero/banner, kategori (kesehatan, pendidikan, bencana, dll.), campaign mendesak, campaign terbaru, campaign populer, bagian "Kenapa donasi di sini" (kepercayaan) | P0 |
| F-02 | **Kartu campaign:** gambar, judul, penggalang (badge verified), progress bar, terkumpul, sisa hari, jumlah donatur | P0 |
| F-03 | **Daftar campaign:** filter kategori, urutan (terbaru, mendesak, hampir tercapai), pencarian, **infinite scroll/"muat lebih banyak" berbasis cursor** | P0 |
| F-04 | **Detail campaign:** gambar utama, progress, cerita, tab Cerita / Kabar Terbaru / Donatur / Dokumen penyaluran | P0 |
| F-05 | **Daftar donatur & doa:** nama (opsi anonim "Orang Baik"), nominal, waktu relatif, doa/komentar; tombol "Aamiin" | P1 |
| F-06 | **Tombol Donasi sticky** di bawah layar mobile, selalu terlihat | P0 |
| F-07 | **Share:** tombol bagikan ke WhatsApp, salin link, Facebook, X; preview OpenGraph yang menarik | P0 |
| F-08 | **Kabar terbaru (updates)** dari penggalang dan **laporan penyaluran dana** | P1 |
| F-09 | **Halaman tentang, FAQ, kontak, syarat & ketentuan, kebijakan privasi, biaya platform** | P0 |

### 6.2 Checkout Donasi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F-10 | **Tanpa wajib login.** Cukup nama dan nomor WhatsApp (wajib, karena notifikasi dikirim lewat WhatsApp); email opsional | P0 |
| F-11 | **Chip nominal cepat** (mis. 10rb, 25rb, 50rb, 100rb) + input nominal bebas, format Rupiah otomatis, dan nominal minimum | P0 |
| F-12 | Opsi **donasi anonim** dan opsi menulis doa | P0 |
| F-13 | Setelah klik Bayar, backend membuat invoice Winpay dan donatur diarahkan ke **halaman bayar Winpay** (VA, QRIS, e-Wallet sesuai channel yang aktif di akun Winpay) | P0 |
| F-14 | Link bayar yang sama dikirim lewat WhatsApp, sehingga donatur bisa kembali membayar kapan saja sebelum invoice kedaluwarsa | P0 |
| F-15 | Halaman terima kasih (`back_url`): memeriksa status ke backend; bila belum terkonfirmasi tampil 'menunggu konfirmasi' dengan refresh bertahap; ajakan membagikan campaign | P0 |
| F-16 | Follow up WhatsApp 2 jam setelah donasi dibuat bila belum dibayar (lihat 6.5) | P0 |
| F-17 | **Transparansi biaya:** donatur membayar tepat nominal yang dipilih; biaya platform 5% dan biaya gateway dijelaskan di halaman Biaya & Transparansi (dipotong dari dana yang disalurkan, tidak ditambahkan ke tagihan donatur) | P0 |
| F-18 | Riwayat donasi lewat link unik di WhatsApp (tanpa login) | P1 |

### 6.3 Pembuatan Campaign (Fundraiser)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F-20 | Registrasi akun (nama, email, nomor WhatsApp, password). **Semua pendaftar otomatis berstatus Donatur** | P0 |
| F-21 | Pengajuan menjadi **Fundraiser**: unggah dokumen identitas (MinIO privat); admin menyetujui atau menolak. Sebelum disetujui, akun tetap Donatur dan belum bisa membuat campaign | P0 |
| F-22 | **Admin dapat membuat campaign langsung** (mis. atas nama yayasan) tanpa proses pengajuan fundraiser | P0 |
| F-23 | Form buat campaign untuk fundraiser yang sudah disetujui: judul, kategori, target dana, durasi, cerita (editor sederhana), foto, data penerima, dokumen pendukung | P0 |
| F-24 | Status campaign: Draft, Aktif, Selesai, Dibekukan. Campaign fundraiser yang sudah disetujui langsung tayang; admin dapat membekukan kapan saja | P0 |
| F-25 | Dashboard fundraiser: capaian campaign, daftar donatur, posting kabar terbaru, ajukan pencairan | P1 |
| F-26 | Kompresi dan konversi gambar otomatis ke WebP/AVIF sebelum disimpan | P0 |

### 6.4 Integrasi Winpay

MVP memakai **Winpay Checkout Page**: backend membuat invoice, donatur diarahkan ke halaman bayar yang di-host Winpay, dan hasilnya kembali lewat callback. Menurut [dokumentasi Winpay](https://docs.winpay.id/payments/checkout-page/overview), Checkout Page menerima Virtual Account, QRIS, dan e-Wallet lewat satu integrasi, dan satu merchant bisa punya beberapa credential dengan channel aktif, logo, dan URL callback yang berbeda.

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F-30 | Buat invoice per donasi lewat `POST /api/create` (header `X-Winpay-Timestamp` GMT+7, `X-Winpay-Signature`, `X-Winpay-Key`). Isi: data customer, `invoice.ref` unik per donasi, produk = nominal donasi, `back_url` ke halaman terima kasih, `interval` (menit) | P0 |
| F-31 | Simpan `redirect_url` dari respons; arahkan donatur ke sana dan kirim link yang sama lewat WhatsApp | P0 |
| F-32 | Endpoint callback membalas teks `ACCEPTED` (bila tidak, Winpay mengulang 3 kali); pemrosesan idempotent berdasarkan `ref` / `uuid` | P0 |
| F-33 | Validasi callback: halaman callback Checkout Page yang saya baca tidak menjelaskan signature. Amankan dengan path callback rahasia, whitelist IP bila disediakan Winpay, dan **konfirmasi ulang status lewat Find Invoice By Merchant Ref** sebelum donasi ditandai `paid` | P0 |
| F-34 | Simpan `channel`, `amount`, `fee`, `nett_amount` dari callback; ini dasar perhitungan dana bersih (6.7) | P0 |
| F-35 | Job rekonsiliasi: cek invoice pending ke Winpay bila callback tidak masuk; hapus invoice (Delete Invoice) untuk donasi yang kedaluwarsa | P0 |
| F-36 | Sandbox (`sandbox-checkout.winpay.id`) dan production (`checkout.winpay.id`) lewat environment; credential disimpan sebagai config/secret Dokku, bukan di repo | P0 |
| F-37 | Menu admin **Pengaturan Pembayaran**: simpan API key dan secret key (ter-mask), pilih environment, dan catatan channel aktif beserta biaya per channel (diisi manual dari kontrak Winpay) untuk estimasi | P1 |
| F-38 | Log request/response (data sensitif di-mask) dan laporan rekonsiliasi harian Winpay vs sistem | P1 |
| F-39 | Disbursement/payout otomatis lewat Winpay: ditunda, dikerjakan paling akhir bila dirasa perlu | P2 |

### Soal memilih metode bayar

Dengan Checkout Page, ceklis metode dilakukan di sisi Winpay (channel aktif per credential), sehingga situs ini otomatis mengikuti apa pun yang diaktifkan di sana. Daftar bank dan e-wallet spesifik tidak saya temukan di halaman yang saya baca; cek di dashboard Winpay. Bila nanti ingin pilihan metode bayar tampil di situs sendiri (lebih mulus untuk konversi, tetapi pekerjaannya lebih besar), pilihannya SNAP API Winpay, yang daftar isinya juga memuat Modern Retail dan Kartu Kredit.

### 6.5 Notifikasi WhatsApp (WAHA)

Ada tiga notifikasi ke donatur: donasi dibuat, donasi sukses, dan follow up donasi pending. Admin mengatur semuanya dari satu menu **Pengaturan WhatsApp**.

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F-40 | **Donasi dibuat:** dikirim saat donatur masuk ke halaman bayar; berisi nominal, nama campaign, link bayar Winpay, dan batas waktu bayar | P0 |
| F-41 | **Donasi sukses:** konfirmasi, ucapan terima kasih, dan link campaign untuk dibagikan | P0 |
| F-42 | **Follow up donasi pending:** dikirim 1 kali, 2 jam setelah donasi dibuat, hanya bila belum ada tanda donasi sukses; jadwal otomatis dibatalkan bila donasi sudah dibayar atau kedaluwarsa | P0 |
| F-43 | Menu admin **Pengaturan WhatsApp**: daftar nomor CS, saklar tiap notifikasi, template pesan (rincian di bawah) | P0 |
| F-44 | Semua pengiriman lewat antrean dengan rate limit per nomor, jeda acak antar pesan, dan retry dengan backoff; status terkirim atau gagal tercatat | P0 |
| F-45 | Log pengiriman per donasi dan tombol kirim ulang | P1 |
| F-46 | Opt-out (balas STOP) dan validasi nomor sebelum kirim | P1 |
| F-47 | OTP login fundraiser, update campaign ke donatur, notifikasi internal ke admin | P2 |

### Menu Pengaturan WhatsApp (Admin)

Untuk mengaktifkan notifikasi, admin cukup mengisi tiga data WAHA untuk satu nomor CS. Menambah nomor CS berarti mengisi ketiganya lagi.

| Input | Contoh | Keterangan |
| --- | --- | --- |
| Base URL | `https://waha.domainanda.com` | Alamat server WAHA |
| Session | `default` | Nama session di WAHA |
| API Key | ••••••••• | Dikirim sebagai header `X-Api-Key`; disimpan terenkripsi dan ditampilkan ter-mask |

- Setelah disimpan, sistem menjalankan **Tes Koneksi** ke WAHA. Nomor WhatsApp dan nama profil dibaca otomatis dari session, jadi tidak perlu diisi.
- Status tiap nomor: Terhubung, Perlu scan QR, atau Terputus; ada tombol aktif/nonaktif, hapus, dan kirim pesan tes.
- Tiga saklar global: Donasi dibuat, Donasi sukses, Follow up pending.
- Template tiap pesan bisa diedit dengan variabel `{nama}`, `{nominal}`, `{campaign}`, `{link_bayar}`, `{batas_bayar}`, `{link_campaign}`, dan `{nama_cs}`, lengkap dengan pratinjau.
- Jeda follow up default 120 menit dan bisa diubah. Masa berlaku invoice Winpay (`interval`) harus lebih panjang dari jeda ini; default 24 jam.
- Bila lebih dari satu nomor aktif, nomor dipilih bergantian (round-robin) saat donasi dibuat, lalu dikunci (sticky) pada donasi itu: pesan donasi dibuat, follow up, dan donasi sukses selalu keluar dari nomor CS yang sama, tidak pernah berpindah nomor. Nomor yang dinonaktifkan tidak lagi dipilih untuk donasi baru, tetapi tetap melayani donasi yang sudah terkunci padanya. Bila nomor terkunci sedang terputus, pesan ditahan di antrean dan dicoba ulang, admin mendapat peringatan, dan admin dapat mengalihkan donasi ke nomor lain secara manual.

Contoh template awal:

```text
Donasi dibuat:
Halo {nama}, terima kasih sudah berniat berdonasi Rp{nominal} untuk “{campaign}”. Selesaikan pembayaran sebelum {batas_bayar}: {link_bayar}

Donasi sukses:
Alhamdulillah, donasi Rp{nominal} untuk “{campaign}” sudah kami terima. Bantu sebarkan agar lebih banyak yang terbantu: {link_campaign}

Follow up pending:
Halo {nama}, donasi Rp{nominal} untuk “{campaign}” belum selesai dibayar. Lanjutkan di sini: {link_bayar}
```

Catatan teknis: pengiriman memakai endpoint kirim teks WAHA (`POST /api/sendText` dengan `session`, `chatId` format `628xxx@c.us`, dan `text`). Ini dari pengetahuan umum saya tentang WAHA, jadi cocokkan dengan dokumentasi WAHA saat implementasi.

### 6.6 Dashboard Admin (Overall Monitoring Capaian Donasi)

**Halaman Overview**

- Kartu ringkasan: **total donasi terkumpul**, donasi hari ini/minggu/bulan, jumlah donatur unik, jumlah donasi sukses, rata-rata nominal donasi, jumlah campaign aktif, total dana siap dicairkan.
- **Grafik tren donasi** (harian/mingguan/bulanan) dengan filter rentang tanggal.
- **Funnel konversi:** kunjungan campaign, mulai checkout, donasi dibuat, donasi dibayar.
- Breakdown berdasarkan **metode bayar**, **kategori campaign**, dan **sumber trafik** (UTM).
- **Top campaign**, campaign hampir mencapai target, campaign sepi (perlu dorongan).
- **Capaian vs target** keseluruhan dan per campaign (progress).
- Status operasional: antrean WhatsApp, status sesi WAHA, callback Winpay gagal, donasi pending lama.

**Modul lain**

| ID | Modul | Prioritas |
| --- | --- | --- |
| D-01 | Manajemen campaign: pantau campaign yang tayang, edit, bekukan, tandai selesai; admin bisa membuat campaign langsung | P0 |
| D-02 | Persetujuan fundraiser: daftar pengajuan, dokumen, setujui/tolak (pendaftar tetap berstatus Donatur sampai disetujui) | P0 |
| D-03 | Daftar donasi: filter status/tanggal/metode/campaign, pencarian, export CSV (dijalankan sebagai job background) | P0 |
| D-04 | Manajemen donatur: riwayat donasi, segmentasi (donatur setia, nominal besar) | P1 |
| D-05 | Pencairan dana: hitung dana bersih per campaign (lihat 6.7), catat pencairan manual beserta bukti transfer; disbursement otomatis Winpay menyusul paling akhir | P1 |
| D-06 | Pengaturan WhatsApp: nomor CS, saklar notifikasi, template, log pengiriman (lihat 6.5) | P0 |
| D-07 | Pengaturan Pembayaran: credential Winpay, environment, catatan channel dan biaya | P1 |
| D-08 | Manajemen konten: banner, kategori, FAQ, halaman legalitas yayasan | P1 |
| D-09 | Role dan izin (RBAC): Super Admin, Operator, Finance, Viewer; **audit log** setiap aksi sensitif | P0 |
| D-10 | Laporan terjadwal (harian/mingguan) dikirim ke WhatsApp/email pengelola | P2 |

### 6.7 Biaya & Perhitungan Dana Bersih

Donatur membayar tepat nominal yang dipilih. Biaya gateway ditanggung merchant lebih dulu dan dipotong sebelum dana disalurkan, ditambah biaya platform 5%.

| Komponen | Aturan | Sumber data |
| --- | --- | --- |
| Donasi kotor | Nominal yang dibayar donatur | `amount` dari callback Winpay |
| Biaya gateway | Berbeda per channel; ditanggung merchant dulu | `fee` dari callback Winpay |
| Biaya platform | 5% dari donasi kotor (sudah dikonfirmasi) | Dihitung sistem |
| Dana bersih | Sisa yang boleh disalurkan | Dihitung sistem |

```latex
\text{dana bersih} = \text{donasi kotor} - \text{biaya gateway} - 0{,}05 \times \text{donasi kotor}
```

Contoh (angka ilustrasi): donasi Rp100.000, biaya gateway Rp4.000, biaya platform Rp5.000, dana bersih Rp91.000.

- Tiap donasi menyimpan `gateway_fee`, `platform_fee`, dan `net_amount` saat callback diterima, jadi laporan tidak perlu menghitung ulang.
- Dashboard overview menampilkan donasi kotor, total biaya gateway, biaya platform, dan dana bersih siap disalurkan, per campaign dan keseluruhan.
- Progress bar di halaman publik memakai donasi kotor.
- Pencairan hanya dihitung dari donasi berstatus `paid`.

### 6.8 White-Label & Tema

FundCore adalah nama produk; nama, logo, warna, dan data legal yang dilihat donatur diatur dari menu admin tanpa mengubah kode dan tanpa deploy ulang. Model white-label MVP adalah **satu instalasi per brand** (satu app Dokku dan satu database per klien), karena paling sederhana, ringan, dan datanya terpisah.

Warna mengikuti aturan 60/30/10:

| Peran | Porsi | Dipakai untuk | Pengaturan admin |
| --- | --- | --- | --- |
| Warna dasar | 60% | Background halaman dan permukaan kartu | `color_bg` |
| Warna brand | 30% | Header, judul, progress bar, ikon, area hero | `color_brand` |
| Aksen | 10% | Tombol utama (Donasi Sekarang), chip nominal terpilih, badge | `color_accent` |

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F-50 | Menu admin **Branding & Tema**: nama situs, tagline, logo, favicon, dan tiga warna lewat color picker, dengan pratinjau langsung dalam tampilan mobile | P0 |
| F-51 | Tema diterapkan lewat **CSS variables** (`--color-bg`, `--color-brand`, `--color-accent`) yang dibuat server dari pengaturan; mengganti warna tidak butuh build atau deploy ulang | P0 |
| F-52 | Warna turunan (hover, border, teks di atas brand dan aksen) dibuat otomatis, dan sistem **memeriksa kontras WCAG AA** serta memberi peringatan bila kombinasi sulit dibaca | P0 |
| F-53 | Nama situs, logo, dan data legal (nama yayasan, alamat, kontak, nomor SK Kemenkumham, kebijakan privasi) berasal dari pengaturan, bukan tertulis mati di kode; tidak ada teks 'FundCore' yang tampil ke donatur kecuali diatur admin | P0 |
| F-54 | Pengaturan tema di-cache di Redis dan ditulis sebagai CSS kecil di `<head>`, sehingga tanpa request tambahan dan tanpa kilatan warna | P0 |
| F-55 | Template WhatsApp dan email memakai nama situs dari pengaturan (variabel `{nama_situs}`) | P1 |
| F-56 | Preset tema siap pakai (3–5) dan tombol reset ke bawaan | P2 |

## 7. Strategi Konversi & Akuisisi Donatur

- **Checkout minim friksi:** tanpa login, 1 layar (nominal, nama, WhatsApp, metode), nominal default terpilih.
- **Social proof:** ticker donatur terbaru ("Budi baru saja berdonasi Rp50.000"), jumlah donatur, doa donatur.
- **Urgensi jujur:** sisa hari, progress mendekati target, label "Mendesak".
- **Kepercayaan:** badge verified, dokumen terlampir, laporan penyaluran, halaman biaya yang transparan.
- **Viral loop:** tombol share ke WhatsApp ditonjolkan setelah donasi dan di halaman terima kasih; pesan share siap pakai.
- **Recovery:** pengingat WhatsApp untuk donasi pending dan ajakan donasi lagi ke donatur lama (dengan opt-in).
- **Tracking:** dukungan UTM, Meta Pixel / TikTok Pixel / GA4 (dimuat async dan ditunda agar tidak mengganggu performa), event: view\_campaign, begin\_checkout, purchase.
- **SEO:** URL bersih (`/c/{slug}`), meta dan OpenGraph dinamis, schema.org, sitemap otomatis, halaman campaign di-render server.
- **A/B testing** ringan untuk teks CTA, urutan nominal, dan layout (P2).

## 8. Kebutuhan UI/UX (Mobile-First)

- Desain untuk lebar 360px lebih dulu; desktop adalah pelebaran, bukan sebaliknya.
- Gaya mengikuti niatbaik.id: kartu campaign bersih, progress bar jelas, warna aksen hangat untuk CTA donasi, banyak ruang putih, tipografi besar dan terbaca.
- **Navigasi:** header ringkas + bottom navigation opsional (Beranda, Campaign, Donasi Saya, Akun).
- **Tap target** minimal 44px, kontras memenuhi WCAG AA, form dengan tipe input yang tepat (`inputmode="numeric"`, `tel`) agar keyboard sesuai.
- **Skeleton loading** dan state kosong/error yang jelas; tidak ada layout shift (CLS < 0,1).
- Dukungan koneksi buruk: halaman tetap berfungsi bila JavaScript terlambat (progressive enhancement), retry otomatis, pesan error ramah.
- Dashboard admin responsif, dapat dipakai dari tablet/HP untuk pemantauan cepat.

## 9. Kebutuhan Non-Fungsional

### 9.1 Performance Budget (Halaman Publik)

| Metrik | Target |
| --- | --- |
| LCP (4G, perangkat menengah) | < 2,5 detik |
| INP | < 200 ms |
| CLS | < 0,1 |
| TTFB halaman campaign (cache hit) | < 200 ms |
| Total JS per halaman | < 60 KB gzip (termasuk runtime framework) |
| Total CSS | < 30 KB gzip |
| Berat halaman awal | < 500 KB (tanpa gambar di bawah lipatan) |
| Skor Lighthouse mobile | ≥ 90 |

**Teknik wajib:**

- Tailwind/CSS di-purge atau CSS kustom ringan; **tanpa framework UI berat**; JavaScript hanya dimuat untuk komponen interaktif, dengan `defer`.
- Gambar WebP/AVIF, `srcset` responsif, `loading="lazy"`, dimensi eksplisit, thumbnail pra-generate (mis. 320/640/1080 px).
- Font sistem atau 1 font variable yang di-subset dan `font-display: swap`.
- Kompresi Brotli/gzip, HTTP/2 atau HTTP/3, cache header agresif untuk aset ber-hash.
- Script pihak ketiga (pixel, analytics) di-load setelah interaksi/idle.
- Hindari polling berat; status pembayaran dicek dengan interval bertahap (mis. 5s, 10s, 20s) dan berhenti saat tab tidak aktif.
- Service worker ringan (opsional, P2) untuk cache aset dan halaman offline sederhana.

### 9.2 Skalabilitas Data (Agar Tidak Lemot Saat Data Membesar)

**Database (PostgreSQL)**

- **Counter denormalisasi** pada tabel campaign: `collected_amount`, `donor_count`, `last_donation_at`. Diperbarui saat donasi `paid` (di worker, atomik), sehingga halaman tidak pernah menjalankan `SUM()` atas jutaan baris.
- **Index terencana:** `donations(campaign_id, status, paid_at DESC)`, `donations(payment_ref)` unik, `campaigns(status, category_id, created_at DESC)`, `campaigns(slug)` unik, partial index untuk `status = 'paid'`.
- **Paginasi keyset/cursor** (berdasarkan `paid_at, id`), **bukan OFFSET**, untuk daftar donatur dan daftar donasi di admin.
- **Partisi tabel `donations`** per bulan/tahun (declarative partitioning) begitu data besar; arsip partisi lama.
- **Tabel agregat/rollup** (mis. `daily_campaign_stats`, `daily_platform_stats`) diisi oleh job, dan **materialized view** untuk dashboard. Grafik dashboard membaca rollup, bukan tabel mentah.
- **Read replica** untuk beban dashboard dan laporan; connection pooling (PgBouncer).
- Query lambat dipantau (`pg_stat_statements`), batas `statement_timeout`.
- Export besar dan laporan berat selalu dijalankan sebagai **job asinkron**, hasilnya disimpan di MinIO dengan link unduh.

**Cache (Redis + CDN)**

- Halaman publik (home, daftar, detail campaign) di-cache di CDN/edge selama 30–60 detik (stale-while-revalidate); angka terkumpul bisa diperbarui lewat fragmen/endpoint kecil ber-cache.
- Cache daftar campaign populer dan hasil query dashboard dengan TTL pendek.
- Rate limiting per IP/nomor di Redis untuk endpoint donasi dan OTP.

**Storage (MinIO)**

- Bucket terpisah: `public-media` (gambar campaign, lewat CDN), `private-docs` (dokumen verifikasi, akses pre-signed URL berumur pendek), `exports`, `backups`.
- Lifecycle policy untuk menghapus export lama; versioning untuk dokumen penting; replikasi/erasure coding sesuai kebutuhan.
- Jalankan MinIO terdistribusi (multi-node) saat skala meningkat; gambar tidak pernah disajikan langsung dari MinIO tanpa CDN.

**Aplikasi**

- Aplikasi stateless sehingga bisa di-scale horizontal; pekerjaan berat (webhook, WhatsApp, rollup, export) lewat antrean worker, yang berjalan sebagai process type terpisah (lihat bagian 5).
- Webhook Winpay hanya memvalidasi dan menaruh job di antrean lalu membalas cepat; pemrosesan dilakukan async.
- Dashboard memuat widget secara bertahap (lazy), dengan paginasi dan filter tanggal default 30 hari.
- **Load test** sebelum rilis (target awal: 50 request/detik di halaman campaign dan 2 donasi/detik saat lonjakan, lihat 9.5) dan secara berkala.

### 9.3 Keamanan & Kepatuhan

- HTTPS wajib, HSTS, header keamanan (CSP, X-Frame-Options), proteksi CSRF.
- Validasi dan sanitasi input; sanitasi konten cerita campaign (cegah XSS).
- Proteksi bot di form donasi (rate limit, honeypot, Turnstile/reCAPTCHA bila perlu); cegah *card testing*/spam donasi.
- Verifikasi signature Winpay; kredensial hanya di config app Dokku; rotasi kunci berkala.
- Data pribadi (nomor WhatsApp, dokumen KTP) dienkripsi saat disimpan (at rest) dan dibatasi aksesnya; kepatuhan **UU Pelindungan Data Pribadi (UU PDP)**; kebijakan privasi dan persetujuan eksplisit untuk notifikasi WhatsApp.
- RBAC dan audit log di dashboard; 2FA untuk admin.
- Backup otomatis harian PostgreSQL dan MinIO, uji restore berkala (RPO ≤ 24 jam, RTO ≤ 4 jam).
- Aspek legal penggalangan dana: perhatikan perizinan PUB (Pengumpulan Uang atau Barang) dan ketentuan terkait; konsultasikan dengan legal.

### 9.4 Observability

Logging terstruktur, metrik (latency, error rate, antrean, kegagalan webhook), tracing, alert (Sentry/Grafana/Prometheus atau setara), health check untuk WAHA, Winpay, DB, MinIO, Redis.

### 9.5 Estimasi Kapasitas (50.000 Donasi per Tahun)

Beban ini ringan untuk satu VPS. Prinsip skalabilitas di 9.2 tetap dipakai karena murah (index, counter, rollup, paginasi cursor), tetapi partisi tabel dan read replica ditunda sampai ambang di bawah tercapai.

| Skenario | Asumsi | Perkiraan |
| --- | --- | --- |
| Rata-rata | 50.000 donasi dibagi 365 hari | ±137 donasi/hari (±6/jam) |
| Kunjungan campaign | Konversi 3% | ±1,7 juta/tahun (±4.600/hari) |
| Hari puncak | 20 kali rata-rata (campaign viral) | ±2.700 donasi dan ±90.000 kunjungan/hari |
| Lonjakan beberapa menit | Link disebar ke banyak grup WhatsApp | ±50 request/detik di halaman campaign (sebagian besar dilayani cache), 1–2 donasi/detik |
| Pesan WhatsApp | 2–3 pesan per donasi | ±100–150 ribu/tahun; ±8.000 pada hari puncak |
| Data setelah 5 tahun | Pertumbuhan linear | ±250.000 baris donasi |

- **Titik rawan ada di WhatsApp, bukan database.** Satu nomor dengan jeda acak hanya mampu ±10 pesan/menit, sehingga 8.000 pesan hari puncak butuh sekitar 12 jam. Prioritas antrean: donasi sukses, lalu donasi dibuat, lalu follow up; tambah nomor CS bila antrean sering menumpuk.
- Ambang naik tingkat: partisi tabel donasi dan read replica dipertimbangkan bila donasi melewati 5 juta baris atau query dashboard lebih lambat dari 1 detik.

### 9.6 Perawatan Kode

Tujuannya perawatan yang mudah oleh tim kecil: satu repo, satu bahasa, satu app Dokku.

- **Satu bahasa (TypeScript)** untuk halaman, server, dan worker. Tipe data dan validasi (Zod) dipakai bersama, sehingga perubahan kolom langsung terdeteksi editor.
- **Struktur per fitur:** campaign, donasi, pembayaran, whatsapp, tema, dan admin masing-masing punya folder sendiri di sisi server, dengan route dipisah untuk area publik, admin, API, dan webhook.
- **ORM bertipe dengan migrasi** (Drizzle). Migrasi berjalan otomatis saat release di Dokku.
- **Adapter untuk layanan luar:** Winpay dan WAHA masing-masing dibungkus satu modul dengan antarmuka jelas, sehingga mudah diuji dan diganti.
- **Validasi di pintu masuk:** input form, callback Winpay, dan respons WAHA divalidasi dengan Zod sebelum diproses.
- **Test pada alur berisiko saja:** perhitungan dana bersih, idempotensi callback, follow up 2 jam beserta pembatalannya, sticky nomor CS, dan kontras tema; ditambah satu tes end-to-end alur donasi di sandbox Winpay.
- **CI sebelum deploy:** lint, typecheck, test, dan pemeriksaan ukuran bundle JS terhadap budget di 9.1.
- **Runbook singkat:** scan ulang QR WAHA, menangani callback yang gagal, restore backup, dan mengganti credential.

## 10. Model Data (Garis Besar)

| Tabel | Kolom utama |
| --- | --- |
| `site_settings` | id, site\_name, tagline, logo\_url, favicon\_url, color\_bg, color\_brand, color\_accent, org\_name, data legal (akta, NIB, nomor SK Kemenkumham), kontak, updated\_at |
| `users` | id, name, phone, email, password\_hash, role (donor, fundraiser, admin, dst.), fundraiser\_status (none, pending, approved, rejected), created\_at |
| `fundraiser_applications` | id, user\_id, dokumen (object key MinIO), status, reviewed\_by, reviewed\_at |
| `campaigns` | id, slug, owner\_id, title, category\_id, target\_amount, **collected\_amount**, **donor\_count**, status, start\_at, end\_at, cover\_url, story |
| `campaign_updates` | id, campaign\_id, title, body, created\_at |
| `donations` | id, campaign\_id, donor\_name, donor\_phone, amount, is\_anonymous, prayer, status, channel, invoice\_ref, invoice\_url, wa\_account\_id (nomor CS yang dikunci untuk donasi ini), gateway\_fee, platform\_fee, net\_amount, utm\_source, created\_at, paid\_at, expired\_at |
| `payments` | id, donation\_id, provider (winpay), provider\_uuid, status, raw\_request, raw\_callback |
| `wa_accounts` | id, label, base\_url, session, api\_key (terenkripsi), phone (dibaca dari session), status, is\_active, last\_checked\_at |
| `wa_settings` | type (created, success, followup), is\_active, template, delay\_minutes |
| `wa_messages` | id, donation\_id, type, wa\_account\_id, to\_phone, payload, status, attempts, scheduled\_at, sent\_at, error |
| `disbursements` | id, campaign\_id, amount, status, requested\_at, approved\_by, proof\_url |
| `documents` | id, campaign\_id, type, object\_key (MinIO), verified |
| `daily_campaign_stats` / `daily_platform_stats` | tanggal, gross\_amount, gateway\_fee, platform\_fee, net\_amount, donation\_count, donor\_count, views, checkouts |
| `audit_logs` | id, actor\_id, action, entity, before, after, ip, created\_at |

## 11. Alur Status Donasi

`created` → `pending` (menunggu bayar) → `paid` | `expired` | `failed`

Hanya status `paid` yang menambah total terkumpul, memicu notifikasi sukses, dan masuk laporan. Perubahan status harus **idempotent** dan tercatat.

## 12. Ringkasan Endpoint (Draft)

Semua endpoint berada di satu aplikasi FundCore.

| Endpoint | Fungsi |
| --- | --- |
| `GET /`, `GET /campaigns`, `GET /c/{slug}` | Halaman publik (SSR) |
| `GET /api/campaigns?cursor=` | Daftar campaign (cursor paging) |
| `GET /api/campaigns/{id}/donors?cursor=` | Daftar donatur |
| `POST /api/donations` | Buat donasi + invoice Winpay, kembalikan `redirect_url` |
| `GET /api/donations/{id}/status` | Status pembayaran (ringan, cache pendek) |
| `POST /webhooks/winpay/{secret}` | Callback Winpay: balas `ACCEPTED`, enqueue |
| `GET/POST /admin/api/wa-accounts`, `POST .../{id}/test` | Kelola nomor CS WAHA dan tes koneksi |
| `GET/PUT /admin/api/wa-settings` | Saklar notifikasi, template, jeda follow up |
| `GET/PUT /admin/api/theme` | Branding & Tema (nama, logo, tiga warna) |
| `GET /admin/api/overview`, `/stats` | Data dashboard (dari rollup) |
| `POST /admin/api/fundraisers/{id}/approve` | Setujui fundraiser |
| `POST /admin/api/campaigns/{id}/freeze` | Bekukan campaign |

## 13. Roadmap Rilis

| Fase | Durasi (perkiraan) | Isi |
| --- | --- | --- |
| **0. Discovery & Desain** | 2 minggu | Finalisasi PRD, wireframe mobile, UI kit ala niatbaik.id, kontrak Winpay (sandbox), setup WAHA, kelengkapan legalitas yayasan (akta, NIB, SK Kemenkumham, rekening yayasan) |
| **1. MVP Core** | 5–6 minggu | Halaman publik, checkout, integrasi Winpay, WhatsApp notif dasar, Branding & Tema (nama, logo, tiga warna), admin: persetujuan fundraiser, pantau campaign, dan daftar donasi, dashboard overview dasar |
| **2. Growth & Skala** | 3–4 minggu | Social proof, share, pengingat WA, tracking pixel/UTM, rollup dan materialized view, caching CDN, load test |
| **3. Fundraiser & Finance** | 3–4 minggu | Dashboard fundraiser, pencairan dana manual (disbursement otomatis Winpay opsional, paling akhir), rekonsiliasi, laporan terjadwal |
| **4. Optimasi** | Berkelanjutan | A/B testing, recurring donation, PWA, partisi data, replika baca |

## 14. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| WAHA (tidak resmi) menyebabkan nomor diblokir | Notifikasi berhenti | Opt-in, rate limit, jeda acak, template bervariasi, nomor khusus bisnis, beberapa nomor CS, fallback email/SMS, evaluasi WhatsApp Business API resmi di kemudian hari |
| Sesi WAHA terputus | Pesan tertunda | Health check, alert, antrean dengan retry (pesan menunggu nomor CS yang terkunci), scan ulang QR terdokumentasi |
| Callback Winpay terlambat, hilang, atau dipalsukan | Donasi tidak tercatat atau tercatat palsu | Job rekonsiliasi, path callback rahasia, konfirmasi ulang status ke Winpay sebelum `paid`, alert |
| Lonjakan trafik saat campaign viral | Situs lambat atau down | CDN, cache, antrean, load test |
| Semua process type berbagi satu VPS | Worker dan export menyaingi halaman publik untuk CPU dan RAM | Batas CPU dan memori per process type, konkurensi worker dibatasi, export di luar jam sibuk, naikkan spesifikasi VPS atau pindahkan database ke server lain; bila perlu pecah lagi process type `worker` bila perlu |
| Warna pilihan admin sulit dibaca | Konversi turun, aksesibilitas buruk | Pemeriksaan kontras WCAG AA otomatis dengan peringatan saat simpan, preset tema aman |
| Penipuan campaign | Reputasi rusak | Persetujuan fundraiser berbasis dokumen, badge verified, fitur laporkan, pembekuan cepat |
| Pemakaian MinIO sebagai database | Performa dan integritas buruk | Gunakan PostgreSQL untuk data transaksional, MinIO hanya untuk objek |
| Kebocoran data pribadi | Risiko hukum | Enkripsi, RBAC, audit log, kepatuhan UU PDP |

## 15. Keputusan & Asumsi

Semua keputusan sudah final. Satu asumsi saya yang perlu dikonfirmasi ada pada model white-label (satu instalasi per brand).

| Topik | Keputusan | Status |
| --- | --- | --- |
| Database | PostgreSQL dan Redis untuk data; MinIO untuk file | Final |
| Aplikasi | SvelteKit + TypeScript, fullstack dalam satu codebase; web dan worker berjalan sebagai process type (container) terpisah | Final |
| Nama produk | FundCore; brand yang tampil ke donatur diatur admin | Final |
| White-label | Nama, logo, dan warna dapat diatur (aturan 60/30/10: dasar, brand, aksen); satu instalasi per brand | Final; model satu instalasi per brand adalah asumsi saya |
| Metode bayar | Winpay Checkout Page; donatur diarahkan ke halaman bayar Winpay; channel aktif diatur di akun Winpay; disbursement paling akhir | Final; daftar channel dicek di dashboard Winpay |
| Biaya | Platform 5% dari donasi kotor; biaya gateway ditanggung merchant dulu, dipotong sebelum penyaluran | Final |
| Campaign dan fundraiser | Admin dan fundraiser publik; pendaftar berstatus Donatur sampai disetujui admin; campaign fundraiser yang sudah disetujui langsung tayang | Final |
| Trafik | 50.000 transaksi per tahun (lihat 9.5) | Final; asumsi konversi 3% |
| Hosting | VPS dengan Dokku; satu app (`fundcore`) dengan process type web, worker-pay, worker-wa, dan worker-batch | Final |
| Legalitas | Akta, NIB, rekening atas nama yayasan, SK Kemenkumham | Final; izin PUB tetap dicek |
| Nomor CS WhatsApp | Round-robin saat donasi dibuat, lalu sticky: seluruh pesan donasi itu dikirim dari nomor yang sama | Final |

Tidak ada pertanyaan terbuka yang menghalangi MVP.

## 16. Kriteria Penerimaan MVP

- Donatur dapat menyelesaikan donasi (tanpa login) dan total campaign terupdate otomatis setelah pembayaran sukses.
- Callback Winpay ganda tidak menghasilkan donasi ganda, dan callback palsu tidak mengubah status donasi karena status dikonfirmasi ulang ke Winpay.
- Notifikasi donasi dibuat dan donasi sukses terkirim dari nomor CS yang sama dalam < 30 detik pada kondisi normal; follow up terkirim 2 jam setelah donasi dibuat hanya bila donasi masih pending.
- Halaman campaign memenuhi performance budget pada uji Lighthouse mobile.
- Dashboard menampilkan total donasi, tren, funnel, dan top campaign, serta tetap responsif (< 2 detik) pada data uji 5 juta baris donasi.
- Admin dapat menyetujui fundraiser, membekukan campaign, dan mengekspor laporan donasi.
- Admin dapat mengubah nama situs, logo, dan tiga warna tanpa deploy ulang, dan kombinasi warna berkontras rendah diberi peringatan.
- Seluruh aplikasi berjalan sebagai satu app Dokku dengan process type web, worker-pay, worker-wa, dan worker-batch yang bisa di-scale terpisah; saat worker sibuk (pengiriman massal atau export), waktu muat halaman publik tidak melewati budget di 9.1.
