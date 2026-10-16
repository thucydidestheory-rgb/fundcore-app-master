# Design System: FundCore (PeduliBersama)

Sumber kebenaran visual untuk semua layar FundCore — publik, fundraiser, admin.
Dihasilkan mengikuti skill `stitch-skill`; audit berkala mengikuti `redesign-skill`.
Batasan tak-negosiable: white-label (nama/logo/warna dari admin, tanpa deploy),
mobile-first 360px, budget performa PRD §9.1 (JS < 60 KB, CSS < 30 KB gzip).

## 1. Visual Theme & Atmosphere

"Ruang terang yang menenangkan dengan satu aksi hangat yang jelas."
Density 4 (Daily App Balanced): lapang, satu tugas per layar, checkout 1 layar.
Variance 5: sebagian besar simetris menenangkan (kepercayaan donasi), dengan
aksen editorial asimetris di home (hero bottom-left, zig-zag "Kenapa", laporan
featured). Motion 4 (Fluid CSS): transisi 200–300 ms, stagger reveal halus,
tanpa motion yang menunda konversi. Nuansa seperti klinik modern yang ramah —
bersih, terang, dan setiap rupiah terbaca jelas.

Narrative spine: **"Kebaikan kecil setiap hari"** — terulang di banner patungan
dan footer CTA sebagai benang merah halaman.

## 2. Color Palette & Roles

Model white-label 60/30/10 (PRD §6.8). Nilai di bawah = default; admin dapat
mengganti ketiganya dari menu Branding & Tema tanpa deploy ulang.

- **Canvas** (`--color-bg`, default #ffffff) — 60%: background halaman & kartu.
- **Brand Pine** (`--color-brand`, default #0e7c5b) — 30%: header, judul,
  progress bar, ikon, hero. Turunan `--color-brand-dark` untuk gradient.
- **Aksen Amber** (`--color-accent`, default #f97316) — 10%: hanya tombol utama
  (Donasi Sekarang), chip nominal terpilih, badge eyebrow. Turunan
  `--color-accent-dark` untuk hover.
- **Ink** (#1a1a1a) — teks utama. **Muted Sage** (#5c6570) — teks sekunder,
  satu-satunya gray family untuk teks.
- **Hairline** (#e9e7e2, warm-tinted) — border & divider, satu-satunya border.
- **Footer Charcoal** (#101a16, green-tinted off-black) — footer + CTA, satu tone.
- **WA Green** (#1faa53) — hanya tombol WhatsApp (konvensi platform).

Aturan: maksimal 1 aksen selain hijau WA. Saturasi aksen < 80%.
Dilarang: ungu/biru neon "AI", gradient mesh, teks gradient, glow luar,
pure black #000000, dark section acak di tengah halaman terang.

## 3. Typography Rules

- **Display/Headline:** system stack (`system-ui, -apple-system, Segoe UI,
  Roboto`) — tracking ketat (-0.02em), `text-wrap: balance`, weight 800,
  line-height 1.15–1.25. Skala: hero `clamp(22px,5.5vw,36px)`,
  section `clamp(20px,4.5vw,26px)`, card 16px.
- **Body:** sama, 15–16px, line-height 1.55–1.7, max 65ch (`story`,
  `hero-desc`). Weight 400/500/600/700 dipakai bertingkat (500 label,
  600 sub-judul, 700 tombol, 800 display).
- **Angka/nominal:** selalu `font-variant-numeric: tabular-nums` agar tidak
  bergeser saat polling status.
- **Eyebrow label:** 13px, 800, uppercase, tracking +0.04em, pill aksen.
- **Dilarang:** webfont eksternal (budget performa + audiens 3G/4G Indonesia;
  system stack yang di-subset perilaku), Inter-look generik tanpa tracking,
  all-caps untuk subheader panjang, satu kata yatim (pakai balance/pretty).

## 4. Component Stylings

- **Buttons:** radius 12px, min-height 44px, transisi 200ms, hover gelapkan
  12% (`--color-*-dark`), active `scale(0.98)`, focus-visible outline 2px
  aksen offset 2px. Primer = aksen fill; sekunder = ghost border hairline.
  Satu primer per viewport (CTA restraint).
- **Cards:** radius 14px, border hairline ATAU shadow lembut (jangan keduanya
  menumpuk). Hover: lift `translateY(-2px)` + shadow tinted hue background.
  Tombol dalam grup kartu sejajar bawah (flex column + margin-top auto).
- **Progress:** 8px, track hairline-dark, fill brand, radius penuh.
- **Inputs:** label 700 di atas, radius 12px, border 1.5px hairline-dark,
  focus ring aksen 2px. Error inline merah (#b42323), tanpa alert().
- **Tabs:** underline 3px brand untuk aktif, sticky di bawah header.
- **Loaders:** skeleton sesuai bentuk layout (`.skel`), tanpa spinner.
- **Empty:** ilustrasi emoji + ajakan aksi ("Jadilah donatur pertama").
- **Badges:** pill kecil; verified hijau, mendesak merah muda.

## 5. Layout Principles

- Container 1080px, padding 16px mobile. Grid dulu, bukan flex-math.
- Section rhythm: hero (bottom-left over image) → kategori grid →
  Campaign Pilihan (grid) → Mendesak (grid) → banner Patungan full-band →
  Terbaru (grid) → Laporan (1 featured wide + rows) → Kenapa (zig-zag 2 kolom
  + ghost numerals) → footer CTA. Anchor & background bervariasi tiap section;
  tidak ada dua section berurutan yang terasa sama.
- Mobile: semua multi-kolom collapse 1 kolom < 640px. Tanpa horizontal scroll.
  Sticky CTA donasi + bottom-nav 44px+ target.
- Kedalaman via overlap berlapis (hero text di atas gambar, eyebrow pill di
  atas cover), bukan flat berdampingan semua.

## 6. Motion & Interaction

- Transisi standar 200–300ms `cubic-bezier(.2,.7,.2,1)`; active springy ringan.
- Stagger reveal: kartu masuk `fadeUp` berjenjang (delay nth-child), murni CSS.
- Ticker donatur: marquee linear 30s (jeda bila `prefers-reduced-motion`).
- Polling status: interval bertahap, berhenti saat tab hidden.
- Animasikan hanya `transform`/`opacity`. Hormati `prefers-reduced-motion`
  (matikan ticker, reveal, smooth scroll).

## 7. Anti-Patterns (Banned)

Tanpa emoji sebagai *sistem ikon global* (emoji di konten kategori/doa
dipertahankan sebagai bahasa produk yang sudah dikenal donatur); tanpa font
eksternal; tanpa pure black; tanpa neon/glow; tanpa gradient ungu-biru;
tanpa 3-kartu-equal untuk section fitur; tanpa nama generik (Acme/dll);
tanpa angka palsu bulat; tanpa cliche AI ("seamless", "unleash", "elevate",
"next-gen"); tanpa teks filler ("scroll untuk eksplor"); tanpa link mati `#`;
tanpa alert(); tanpa z-index 9999 (skala: header 40, sticky 50, modal 80,
skip 99); tanpa foto stok; tanpa Unsplash rusak (cover = SVG lokal ringan).
