# FundCore — Platform Crowdfunding Donasi

Mobile-first, ringan, berorientasi konversi. Donatur berdonasi < 60 detik tanpa
daftar → bayar via Winpay → notifikasi WhatsApp via WAHA. Referensi PRD:
[`PRD FundCore.md`](./PRD%20FundCore.md).

**Stack:** SvelteKit + TypeScript (satu codebase) · Postgres (prod) / file JSON
(dev) · Redis opsional · MinIO/S3 untuk file · WAHA · Winpay Checkout Page ·
Dokku satu app (`fundcore`) dengan 4 process type.

## Cara jalan cepat (5 menit, tanpa Postgres/Redis)

```bash
export PATH=/tmp/opencode/node/node-v20.19.0-linux-x64/bin:$PATH  # bila node belum ada
npm install
npm run seed     # membangun data/db.json demo
npm run dev      # buka http://localhost:5173
```

Mode `*_MOCK=true` (default): Winpay diganti halaman simulasi
`/mock-winpay/pay/{ref}`, WhatsApp hanya dicatat ke log admin. Semua jalan
dengan `npm run dev` saja — sweeper dalam proses web mengerjakan tugas worker.

**Akun demo:** `admin@fundcore.id` / `admin123` (Super Admin) ·
`fundraiser@fundcore.id` / `fundraiser123` · `donor@fundcore.id` / `donor123`.

## Alur donasi end-to-end (coba sendiri)

1. Buka campaign → **Donasi Sekarang** → isi nominal, nama, WA → Bayar.
2. Diarahkan ke halaman simulasi Winpay → pilih channel → bayar.
3. Callback `POST /webhooks/winpay/dev-callback-secret` diterima (`ACCEPTED`),
   status dikonfirmasi ulang, donasi jadi `paid`, total campaign bertambah.
4. Cek Admin → WhatsApp → Log: pesan *dibuat*, *sukses* tercatat (mode mock).
5. Halaman terima kasih mem-poll `/api/donations/{id}/status` dengan interval
   bertahap (5s → 10s → 20s → 30s).

## Struktur

```
src/routes/                 halaman publik, fundraiser, admin, API, webhook
  +layout.svelte            header, footer, bottom-nav, injeksi tema (CSS vars)
  /  /campaigns  /c/[slug]  home, daftar (cursor infinite scroll), detail + tab
  /donasi/[slug]            checkout 1 layar (tanpa login)
  /terima-kasih/[id]        polling status + ajakan share
  /riwayat/[token]          riwayat tanpa login (F-18)
  /api/donations            buat donasi + invoice Winpay
  /webhooks/winpay/[secret] callback → ACCEPTED → konfirmasi → paid (idempotent)
  /admin/*                  overview, campaign, fundraiser, donasi+CSV, WA, pembayaran,
                            branding (60/30/10 + cek kontras), konten+pencairan, pengguna+RBAC
  /fundraiser/*             dashboard, buat campaign, kabar, ajukan cair
src/lib/server/             store (JSON, kolom = DDL Postgres), winpay, waha,
                            payments (finalisasi idempotent), queue WA sticky, auth, sweeper
src/lib/format.ts           Rupiah, waktu relatif, kontras WCAG, template WA
workers/{pay,wa,batch}.js   process Dokku (plain Node, berbagi DATA_DIR)
db/postgres.sql             DDL produksi + index + catatan partisi
```

## Deploy Dokku (VPS)

```bash
dokku apps:create fundcore
dokku postgres:link / redis:link ...          # bila sudah ada (opsional)
dokku config:set fundcore ORIGIN=https://donasi.domainanda.com \
  PROTOCOL_HEADER=x-forwarded-proto ADDRESS_HEADER=X-Forwarded-For \
  WINPAY_MOCK=false WINPAY_ENV=production WINPAY_API_KEY=... \
  WINPAY_API_SECRET=... WINPAY_CALLBACK_SECRET=$(openssl rand -hex 16) \
  WAHA_MOCK=false PASSWORD_SALT=$(openssl rand -hex 32)
dokku storage:ensure-volume --mount /app/data fundcore-data
git push dokku main
dokku ps:scale fundcore web=2 worker-pay=1 worker-wa=1 worker-batch=1
```

Hanya `web` yang menerima trafik (health check nginx); worker tidak membuka
port. Migrasi Postgres: `psql $DATABASE_URL -f db/postgres.sql`, lalu ganti
lapisan `store.ts` (nama kolom identik).

## Keputusan penting (dari PRD)

- MinIO/S3 **hanya untuk file**; data transaksional di Postgres (dev: JSON).
- Donatur membayar **tepat nominal**; bersih = kotor − gateway − 5% platform.
- WAHA tidak resmi: rate limit ±10 pesan/mnt/nomor, jeda acak, retry backoff,
  sticky nomor per donasi, opt-out via balasan STOP.
- Callback Winpay selalu **dikonfirmasi ulang** sebelum `paid` (anti palsu).
- Halaman publik tidak pernah `SUM()` — memakai counter denormalisasi +
  rollup harian; daftar memakai cursor paging, bukan OFFSET.

## Kriteria penerimaan MVP → status

| Kriteria | Status |
|---|---|
| Donasi tanpa login, total terupdate otomatis | ✅ |
| Callback ganda idempotent; palsu ditolak via konfirmasi | ✅ |
| WA dibuat+sukses < 30 dtk (mock); follow-up 2 jam bila pending | ✅ (mock; live ikut antrean) |
| Performance budget (JS < 60 KB, CSS < 30 KB, tanpa UI framework) | ✅ by-design |
| Dashboard tren/funnel/top, responsif | ✅ (rollup harian) |
| Setujui fundraiser, bekukan campaign, export CSV | ✅ |
| Branding 60/30/10 tanpa deploy + peringatan kontras | ✅ |
| Satu app Dokku 4 process type | ✅ (Procfile + workers) |
