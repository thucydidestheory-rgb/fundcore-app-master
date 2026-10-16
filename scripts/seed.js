// Membangun data/db.json + data/seed.json deterministik (tanpa dependensi).
// Counter campaign & statistik dihitung dari donasi — selalu konsisten.
// Jalankan: npm run seed   (menimpa db.json; seed.json jadi kanonik)
import { createHash, randomBytes } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
mkdirSync(DATA, { recursive: true });
mkdirSync(join(DATA, 'exports'), { recursive: true });

const SALT = process.env.PASSWORD_SALT || 'fundcore-dev-salt';
const hash = (pw) => createHash('sha256').update(`${SALT}:${pw}`).digest('hex');

let seq = {};
const nid = (p) => `${p}_${String(((seq[p] ?? 0) + 1, (seq[p] = (seq[p] ?? 0) + 1))).padStart(6, '0')}`;
const daysAgo = (n, h = 10) => new Date(Date.now() - n * 86400_000 - h * 3600_000).toISOString();

const site = {
	siteName: 'PeduliBersama',
	tagline: 'Donasi 60 detik tanpa daftar — via QRIS, VA, dan e-wallet. Notifikasi lewat WhatsApp.',
	logoUrl: '/logo.svg',
	faviconUrl: '/favicon.svg',
	colorBg: '#ffffff',
	colorBrand: '#0e7c5b',
	colorAccent: '#f97316',
	orgName: 'Yayasan Peduli Bersama Bangsa',
	orgAddress: 'Jl. Kebaikan No. 45, Bandung, Jawa Barat',
	orgContact: '081234567890',
	socials: { instagram: '', tiktok: '', facebook: '', youtube: '' },
	skKemenkumham: 'AHU-0012345.AH.01.04.Tahun 2022',
	akta: 'No. 12/2022 Notaris A. Budiman',
	nib: '9120101234567',
	platformFeePct: 0.05,
	minDonation: 10000,
	invoiceExpiryHours: 24,
	followupDelayMinutes: 120
};

const users = [
	{ id: 'usr_000001', name: 'Super Admin', phone: '628110000001', email: 'admin@fundcore.id', passwordHash: hash('admin123'), role: 'super_admin', fundraiserStatus: 'none', createdAt: daysAgo(120) },
	{ id: 'usr_000002', name: 'Operator Yayasan', phone: '628110000002', email: 'operator@fundcore.id', passwordHash: hash('admin123'), role: 'operator', fundraiserStatus: 'none', createdAt: daysAgo(100) },
	{ id: 'usr_000003', name: 'Aisyah Fundraiser', phone: '628120000003', email: 'fundraiser@fundcore.id', passwordHash: hash('fundraiser123'), role: 'fundraiser', fundraiserStatus: 'approved', createdAt: daysAgo(90) },
	{ id: 'usr_000004', name: 'Budi Donatur', phone: '628130000004', email: 'donor@fundcore.id', passwordHash: hash('donor123'), role: 'donor', fundraiserStatus: 'none', createdAt: daysAgo(60) }
];
seq.usr = 4;

const categories = [
	{ id: 'cat-kesehatan', name: 'Kesehatan', slug: 'kesehatan', icon: '❤️' },
	{ id: 'cat-pendidikan', name: 'Pendidikan', slug: 'pendidikan', icon: '🎓' },
	{ id: 'cat-bencana', name: 'Bencana', slug: 'bencana', icon: '🆘' },
	{ id: 'cat-sosial', name: 'Sosial', slug: 'sosial', icon: '🤝' },
	{ id: 'cat-ibadah', name: 'Ibadah', slug: 'ibadah', icon: '🕌' },
	{ id: 'cat-lingkungan', name: 'Lingkungan', slug: 'lingkungan', icon: '🌱' }
];

const C = (i, o) => Object.assign({ id: `cmp_${String(i).padStart(6, '0')}`, collectedAmount: 0, donorCount: 0, verified: true, urgent: false, status: 'active', lastDonationAt: null }, o);
const campaigns = [
	C(1, { slug: 'bantu-operasi-jantung-adik-naila', ownerId: 'usr_000003', ownerName: 'Aisyah Fundraiser', title: 'Bantu Operasi Jantung Adik Naila (7 th)', categoryId: 'cat-kesehatan', targetAmount: 150000000, urgent: true, startAt: daysAgo(20), endAt: new Date(Date.now() + 10 * 86400_000).toISOString(), coverUrl: '/covers/c1.svg', story: 'Naila (7 tahun) didiagnosis kelainan jantung bawaan dan harus segera operasi.\nBiaya operasi dan perawatan mencapai Rp150 juta, jauh di luar kemampuan orang tuanya yang buruh harian.\nSetiap rupiah Anda mempercepat jadwal operasi Naila. Mari bantu Naila sembuh dan bermain lagi.', receiver: 'Naila — Bandung', createdAt: daysAgo(20) }),
	C(2, { slug: 'beasiswa-100-anak-pelosok', ownerId: 'usr_000001', ownerName: 'Yayasan Peduli Bersama Bangsa', title: 'Beasiswa Sekolah 100 Anak Pelosok', categoryId: 'cat-pendidikan', targetAmount: 200000000, startAt: daysAgo(35), endAt: new Date(Date.now() + 55 * 86400_000).toISOString(), coverUrl: '/covers/c2.svg', story: 'Seratus anak di pelosok terancam putus sekolah karena biaya.\nDonasi Anda menjadi seragam, buku, dan SPP mereka selama setahun penuh.\nLaporan penyaluran dipublikasikan tiap tahap agar transparan.', receiver: '100 anak — NTT & Maluku', createdAt: daysAgo(35) }),
	C(3, { slug: 'tanggap-banjir-demak', ownerId: 'usr_000001', ownerName: 'Yayasan Peduli Bersama Bangsa', title: 'Tanggap Darurat Banjir Demak', categoryId: 'cat-bencana', targetAmount: 75000000, urgent: true, startAt: daysAgo(5), endAt: new Date(Date.now() + 15 * 86400_000).toISOString(), coverUrl: '/covers/c3.svg', story: 'Banjir merendam 12 desa di Demak. Ribuan warga mengungsi dan butuh logistik.\nDana dipakai untuk sembako, air bersih, dapur umum, dan obat-obatan.\nTim relawan kami sudah di lapangan sejak hari pertama.', receiver: 'Warga terdampak — Demak', createdAt: daysAgo(5) }),
	C(4, { slug: 'modal-usaha-janda-pahlawan', ownerId: 'usr_000003', ownerName: 'Aisyah Fundraiser', title: 'Modal Usaha Ibu-Ibu Tangguh', categoryId: 'cat-sosial', targetAmount: 50000000, startAt: daysAgo(12), endAt: new Date(Date.now() + 40 * 86400_000).toISOString(), coverUrl: '/covers/c4.svg', story: 'Dua puluh ibu kepala keluarga mendapat pelatihan dan modal usaha warung.\nBantuan bergulir: keuntungan usaha dipakai membantu penerima berikutnya.\nPantau perkembangannya lewat kabar terbaru tiap bulan.', receiver: '20 ibu — Garut', createdAt: daysAgo(12) }),
	C(5, { slug: 'renovasi-mushola-al-ikhlas', ownerId: 'usr_000003', ownerName: 'Aisyah Fundraiser', title: 'Renovasi Mushola Al-Ikhlas', categoryId: 'cat-ibadah', targetAmount: 80000000, startAt: daysAgo(28), endAt: new Date(Date.now() + 30 * 86400_000).toISOString(), coverUrl: '/covers/c5.svg', story: 'Atap mushola bocor dan lantai retak. Jamaah 200 orang butuh tempat ibadah layak.\nDana dipakai untuk atap, lantai, sound system, dan tempat wudu.\nSetiap donasi adalah amal jariyah yang pahalanya terus mengalir.', receiver: 'Jamaah Mushola Al-Ikhlas — Cimahi', createdAt: daysAgo(28) }),
	C(6, { slug: '1000-pohon-mangrove-pesisir', ownerId: 'usr_000001', ownerName: 'Yayasan Peduli Bersama Bangsa', title: '1.000 Pohon Mangrove Pesisir Utara', categoryId: 'cat-lingkungan', targetAmount: 30000000, startAt: daysAgo(8), endAt: new Date(Date.now() + 50 * 86400_000).toISOString(), coverUrl: '/covers/c6.svg', story: 'Abrasi menggerus 2 meter garis pantai per tahun.\nSeribu bibit mangrove ditanam bersama nelayan dan karang taruna.\nDokumentasi penanaman dan perawatan diunggah berkala.', receiver: 'Pesisir Utara Jawa', createdAt: daysAgo(8) })
];
seq.cmp = 6;

const updates = [
	{ id: 'upd_000001', campaignId: 'cmp_000001', title: 'Jadwal operasi Naila keluar', body: 'RS menjadwalkan operasi dua minggu lagi. Terima kasih para donatur!', createdAt: daysAgo(3) },
	{ id: 'upd_000002', campaignId: 'cmp_000003', title: 'Dapur umum hari ke-4', body: '1.200 paket nasi dibagikan ke 6 titik pengungsian hari ini.', createdAt: daysAgo(1) },
	{ id: 'upd_000003', campaignId: 'cmp_000002', title: 'Penyaluran tahap 1', body: '40 anak menerima paket sekolah. Bukti foto terlampir di dokumen penyaluran.', createdAt: daysAgo(6) }
];
seq.upd = 3;

// Donasi: [campaignIdx, nama, phone, amount, hariLalu, status, channel, anonim?, doa?]
const seedDon = [
	[0, 'Budi Santoso', '6281311111111', 100000, 0, 'paid', 'QRIS', false, 'Semoga cepat sembuh ya Naila 🤲'],
	[0, 'Hamba Allah', '6281322222222', 50000, 0, 'paid', 'DANA', true, null],
	[0, 'Siti Rahayu', '6281333333333', 250000, 1, 'paid', 'BCA VA', false, 'Titip doa untuk kesembuhan'],
	[0, 'Andi Pratama', '6281344444444', 100000, 1, 'pending', null, false, null],
	[0, 'Dewi Lestari', '6281355555555', 75000, 2, 'paid', 'QRIS', false, null],
	[0, 'Hamba Allah', '6281366666666', 1000000, 3, 'paid', 'BRI VA', true, 'Untuk Naila'],
	[0, 'Rina Marlina', '6281377777777', 50000, 4, 'paid', 'GoPay', false, null],
	[0, 'Agus Wijaya', '6281388888888', 200000, 5, 'paid', 'QRIS', false, 'Lekas sembuh!'],
	[1, 'Hamba Allah', '6281399999999', 500000, 1, 'paid', 'BCA VA', true, 'Untuk pendidikan anak bangsa'],
	[1, 'Farhan Hidayat', '6281411111111', 150000, 2, 'paid', 'QRIS', false, null],
	[1, 'Maya Putri', '6281422222222', 100000, 4, 'paid', 'OVO', false, 'Semangat sekolah!'],
	[1, 'Joko Susilo', '6281433333333', 250000, 7, 'paid', 'QRIS', false, null],
	[1, 'Ratna Sari', '6281444444444', 100000, 9, 'paid', 'DANA', false, null],
	[2, 'Hamba Allah', '6281455555555', 200000, 0, 'paid', 'QRIS', true, 'Untuk korban banjir'],
	[2, 'Dedi Kurniawan', '6281466666666', 100000, 1, 'paid', 'BCA VA', false, null],
	[2, 'Nina Kurnia', '6281477777777', 50000, 1, 'pending', null, false, null],
	[2, 'Eko Saputra', '6281488888888', 300000, 2, 'paid', 'QRIS', false, 'Semoga cepat surut'],
	[3, 'Lina Marlina', '6281499999999', 100000, 3, 'paid', 'QRIS', false, null],
	[3, 'Hamba Allah', '6281511111111', 250000, 6, 'paid', 'BRI VA', true, null],
	[4, 'Ustaz Hidayat', '6281522222222', 500000, 2, 'paid', 'BCA VA', false, 'Jariyah untuk mushola'],
	[4, 'Fitri Handayani', '6281533333333', 100000, 5, 'paid', 'QRIS', false, null],
	[5, 'Green Lovers', '6281544444444', 150000, 1, 'paid', 'QRIS', false, 'Hijaukan pesisir!'],
	[5, 'Tono Prasetyo', '6281555555555', 50000, 8, 'paid', 'DANA', false, null]
];

const donations = [];
const payments = [];
let di = 0;
for (const [ci, nama, phone, amount, ago, status, channel, anon, doa] of seedDon) {
	di++;
	const id = `don_${String(di).padStart(6, '0')}`;
	const created = daysAgo(ago, ago === 0 ? 2 : 9);
	const paid = status === 'paid';
	const fee = paid ? (channel === 'QRIS' ? 2000 : 4000) : 0;
	const pf = paid ? Math.round(amount * 0.05) : 0;
	const ref = `INV-SEED${String(di).padStart(4, '0')}`;
	donations.push({
		id, campaignId: campaigns[ci].id, donorName: nama, donorPhone: phone, donorEmail: null,
		amount, isAnonymous: anon, prayer: doa, aamiinCount: paid ? (di % 4) : 0,
		status, channel, invoiceRef: ref,
		invoiceUrl: `/mock-winpay/pay/${ref}`,
		waAccountId: 'waa_000001', gatewayFee: fee, platformFee: pf,
		netAmount: paid ? amount - fee - pf : 0, utmSource: di % 3 === 0 ? 'instagram' : di % 3 === 1 ? 'whatsapp' : null,
		historyToken: randomBytes(8).toString('hex') + String(di).padStart(4, '0'),
		createdAt: created, paidAt: paid ? new Date(new Date(created).getTime() + 3600_000).toISOString() : null,
		expiredAt: new Date(new Date(created).getTime() + 24 * 3600_000).toISOString()
	});
	payments.push({
		id: `pay_${String(di).padStart(6, '0')}`, donationId: id, provider: 'winpay',
		providerUuid: `mock_${ref}`, status: paid ? 'paid' : 'pending',
		rawRequest: JSON.stringify({ mock: true, ref }), rawCallback: paid ? JSON.stringify({ merchant_ref: ref, status: 'success' }) : null,
		createdAt: created, updatedAt: created
	});
	// Counter campaign.
	if (paid) {
		campaigns[ci].collectedAmount += amount;
		campaigns[ci].donorCount += 1;
		if (!campaigns[ci].lastDonationAt || created > campaigns[ci].lastDonationAt) campaigns[ci].lastDonationAt = created;
	}
}
seq.don = di; seq.pay = di; seq.exp = 0;

// Statistik harian dari donasi paid.
const statMap = {};
for (const d of donations) {
	if (d.status !== 'paid') continue;
	const day = d.paidAt.slice(0, 10);
	statMap[day] ??= { day, gross: 0, gatewayFee: 0, platformFee: 0, net: 0, count: 0, paidCount: 0, views: 0, checkouts: 0 };
	const s = statMap[day];
	s.gross += d.amount; s.gatewayFee += d.gatewayFee; s.platformFee += d.platformFee; s.net += d.netAmount; s.count++; s.paidCount++;
}
// Views/checkout sintetis agar funnel & grafik hidup.
for (let i = 29; i >= 0; i--) {
	const day = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
	statMap[day] ??= { day, gross: 0, gatewayFee: 0, platformFee: 0, net: 0, count: 0, paidCount: 0, views: 0, checkouts: 0 };
	statMap[day].views += 120 + ((i * 37) % 200);
	statMap[day].checkouts += 4 + ((i * 13) % 12);
}
const statsDaily = Object.values(statMap).sort((a, b) => (a.day < b.day ? -1 : 1));

const waAccounts = [
	{ id: 'waa_000001', label: 'CS 1', baseUrl: '', session: 'default', apiKey: '', phone: '6281234567890', profileName: 'CS PeduliBersama', status: 'connected', isActive: true, lastCheckedAt: daysAgo(0) },
	{ id: 'waa_000002', label: 'CS 2 (cadangan)', baseUrl: '', session: 'cs2', apiKey: '', phone: null, profileName: null, status: 'qr_needed', isActive: true, lastCheckedAt: null }
];
seq.waa = 2;

const waSettings = [
	{ type: 'created', isActive: true, delayMinutes: 0, template: 'Halo {nama}, terima kasih sudah berniat berdonasi Rp{nominal} untuk “{campaign}”. Selesaikan pembayaran sebelum {batas_bayar}: {link_bayar}' },
	{ type: 'success', isActive: true, delayMinutes: 0, template: 'Alhamdulillah, donasi Rp{nominal} untuk “{campaign}” sudah kami terima. Riwayat donasi Anda: {link_riwayat}. Bantu sebarkan agar lebih banyak yang terbantu: {link_campaign}' },
	{ type: 'followup', isActive: true, delayMinutes: 120, template: 'Halo {nama}, donasi Rp{nominal} untuk “{campaign}” belum selesai dibayar. Lanjutkan di sini: {link_bayar}' }
];

const waMessages = donations.slice(0, 6).map((d, i) => ({
	id: `wam_${String(i + 1).padStart(6, '0')}`, donationId: d.id,
	type: d.status === 'paid' ? 'success' : 'created', waAccountId: 'waa_000001',
	toPhone: d.donorPhone, payload: `[seed] notifikasi ${d.status} Rp${d.amount}`,
	status: 'sent', attempts: 1, scheduledAt: d.createdAt, sentAt: d.createdAt, error: null
}));
seq.wam = 6;

const disbursements = [
	{ id: 'dis_000001', campaignId: 'cmp_000002', amount: 5000000, status: 'approved', proofUrl: null, note: 'Tahap 1 — 40 paket sekolah', requestedBy: 'usr_000003', requestedAt: daysAgo(5), approvedBy: 'usr_000001' }
];
seq.dis = 1;

const applications = [
	{ id: 'app_000001', userId: 'usr_000003', userName: 'Aisyah Fundraiser', docType: 'KTP', docUrl: 'ktp-aisyah.jpg', status: 'approved', note: null, reviewedBy: 'usr_000001', reviewedAt: daysAgo(89), createdAt: daysAgo(90) },
	{ id: 'app_000002', userId: 'usr_000004', userName: 'Budi Donatur', docType: 'KTP', docUrl: 'ktp-budi.jpg', status: 'pending', note: null, reviewedBy: null, reviewedAt: null, createdAt: daysAgo(1) }
];
seq.app = 2;

const db = {
	version: 1, site, users, sessions: [], categories, campaigns, updates, donations, payments,
	waAccounts, waSettings, waMessages, disbursements, applications,
	auditLogs: [{ id: 'log_000001', actorId: 'usr_000001', actorName: 'Super Admin', action: 'seed.init', entity: 'db', before: null, after: null, ip: '127.0.0.1', createdAt: daysAgo(30) }],
	contents: {
		banners: [{ id: 'b1', title: 'Darurat Banjir Demak', subtitle: 'Ribuan warga butuh logistik hari ini', cta: 'Donasi Sekarang', href: '/c/tanggap-banjir-demak' }],
		faqs: [
			{ q: 'Apakah harus daftar untuk berdonasi?', a: 'Tidak. Cukup isi nama dan nomor WhatsApp — donasi selesai dalam 60 detik.' },
			{ q: 'Metode pembayaran apa saja?', a: 'QRIS, Virtual Account bank, dan e-wallet — melalui halaman bayar Winpay yang aman.' },
			{ q: 'Berapa biaya platform?', a: '5% dari donasi kotor + biaya gateway, dipotong sebelum disalurkan. Anda membayar tepat nominal pilihan.' },
			{ q: 'Bagaimana saya tahu donasi tersalurkan?', a: 'Lewat tab Kabar Terbaru di halaman campaign dan laporan penyaluran berkala.' }
		],
		paymentNote: 'Estimasi biaya (cek kontrak Winpay): QRIS ± Rp2.000/transaksi; VA bank ± Rp4.000; e-wallet ± 2%. Channel aktif diatur di dashboard Winpay.',
		aboutBody: 'Kami percaya setiap niat baik layak memiliki jalan untuk diwujudkan. Platform ini hadir sebagai jembatan kebaikan yang amanah untuk mengalirkan bantuan, mewujudkan harapan, dan memberdayakan masyarakat di seluruh Indonesia.\nMelalui teknologi ini, kami memfasilitasi berbagai program sosial dan kemanusiaan dari para mitra — mulai dari dukungan pendidikan, kesehatan, kebutuhan dasar, pemberdayaan masyarakat, hingga respon tanggap darurat bencana.',
		visi: 'Menjadi jembatan kebaikan yang amanah untuk mengalirkan bantuan, mewujudkan harapan, dan memberdayakan masyarakat di seluruh Indonesia.',
		misi: 'Memfasilitasi kolaborasi: sarana teknologi yang aman dan intuitif bagi yayasan serta mitra untuk menggalang dana publik secara efisien.\nMenjamin transparansi & akuntabilitas: setiap campaign melalui verifikasi dan pelaporan penyaluran yang terbuka.\nMemudahkan akses kebaikan: donatur mudah menemukan, menyalurkan, dan memantau dampak donasinya.\nMemperluas jangkauan manfaat: menghubungkan inisiatif sosial lokal dengan donatur yang lebih luas.',
		nilai: 'Amanah: menjaga kepercayaan donatur dan mitra dengan integritas dalam setiap tata kelola.\nTransparan: menyajikan perizinan, legalitas, serta laporan dampak secara jelas dan mudah diakses.\nKolaboratif: membangun kemitraan kuat dengan lembaga sosial untuk memperbesar dampak.\nInovatif: mengembangkan teknologi terbaik demi kemudahan, keamanan, dan kenyamanan berdonasi.'
	},
	statsDaily, seq: { ...seq, log: 1 }
};
seq.log = 1;

writeFileSync(join(DATA, 'seed.json'), JSON.stringify(db, null, 1));
writeFileSync(join(DATA, 'db.json'), JSON.stringify(db, null, 1));
console.log(`seed OK: ${campaigns.length} campaign, ${donations.length} donasi, ${users.length} user → ${join(DATA, 'db.json')}`);
console.log('Akun demo — admin@fundcore.id/admin123 · fundraiser@fundcore.id/fundraiser123 · donor@fundcore.id/donor123');
