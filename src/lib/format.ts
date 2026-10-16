// Util format & tema — aman dipakai di client maupun server (tanpa import node:*).

export function formatRupiah(n: number): string {
	return 'Rp' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatRingkas(n: number): string {
	if (n >= 1_000_000_000) return trimNum(n / 1_000_000_000) + ' M';
	if (n >= 1_000_000) return trimNum(n / 1_000_000) + ' jt';
	if (n >= 1_000) return trimNum(n / 1_000) + ' rb';
	return String(Math.round(n));
}

function trimNum(n: number): string {
	return (Math.round(n * 10) / 10).toString().replace('.', ',');
}

export function parseRupiah(s: string): number {
	const digits = (s || '').replace(/[^0-9]/g, '');
	return digits ? parseInt(digits, 10) : 0;
}

export function timeAgo(iso: string, nowMs = Date.now()): string {
	const diff = Math.max(0, nowMs - new Date(iso).getTime());
	const m = Math.floor(diff / 60000);
	if (m < 1) return 'baru saja';
	if (m < 60) return `${m} mnt lalu`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h} jam lalu`;
	const d = Math.floor(h / 24);
	if (d < 30) return `${d} hari lalu`;
	const mo = Math.floor(d / 30);
	if (mo < 12) return `${mo} bln lalu`;
	return `${Math.floor(mo / 12)} thn lalu`;
}

export function sisaHari(endIso: string, nowMs = Date.now()): number {
	return Math.max(0, Math.ceil((new Date(endIso).getTime() - nowMs) / 86400000));
}

export function progressPct(collected: number, target: number): number {
	if (!target || target <= 0) return 0;
	return Math.min(100, Math.round((collected / target) * 100));
}

// --- Warna & kontras WCAG AA (PRD F-52) ---

function lum(hex: string): number {
	const h = hex.replace('#', '');
	const c = [0, 2, 4].map((i) => {
		const v = parseInt(h.slice(i, i + 2), 16) / 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrastRatio(a: string, b: string): number {
	try {
		const l1 = lum(a);
		const l2 = lum(b);
		return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
	} catch {
		return 1;
	}
}

/** Teks putih atau hitam yang kontras di atas warna latar. */
export function onColor(bg: string): string {
	return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#111111') ? '#ffffff' : '#111111';
}

export function shade(hex: string, amt: number): string {
	// amt -100..100: negatif = gelapkan, positif = terangkan
	const h = hex.replace('#', '');
	const n = [0, 2, 4].map((i) => {
		const v = parseInt(h.slice(i, i + 2), 16);
		const t = amt < 0 ? 0 : 255;
		const p = Math.abs(amt) / 100;
		return Math.round((t - v) * p + v);
	});
	return '#' + n.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Peringatan kontras untuk kombinasi penting (min. 4.5 teks normal, 3.0 teks besar/UI). */
export function checkThemeContrast(bg: string, brand: string, accent: string): string[] {
	const warns: string[] = [];
	if (contrastRatio(brand, bg) < 3)
		warns.push('Warna brand kurang kontras di atas warna dasar — judul/progress bar sulit dibaca.');
	if (contrastRatio(onColor(accent), accent) < 4.5)
		warns.push('Teks tombol utama (aksen) kurang kontras — naikkan kecerahan teks atau gelapkan aksen.');
	if (contrastRatio('#1a1a1a', bg) < 4.5 && contrastRatio('#ffffff', bg) < 4.5)
		warns.push('Warna dasar terlalu tengah — teks gelap maupun terang sama-sama sulit dibaca.');
	return warns;
}

export function themeCss(bg: string, brand: string, accent: string): string {
	return (
		`:root{--color-bg:${bg};--color-brand:${brand};--color-accent:${accent};` +
		`--color-brand-dark:${shade(brand, -12)};--color-accent-dark:${shade(accent, -12)};` +
		`--color-on-brand:${onColor(brand)};--color-on-accent:${onColor(accent)};` +
		`--color-border:${shade(bg, bg.toLowerCase() === '#ffffff' ? -10 : 12)};}`
	);
}

export function normalizePhone(input: string): string | null {
	let d = (input || '').replace(/[^0-9]/g, '');
	if (d.startsWith('0')) d = '62' + d.slice(1);
	if (d.startsWith('620')) d = '62' + d.slice(3);
	if (!/^62[0-9]{8,13}$/.test(d)) return null;
	return d;
}

export function waChatId(phone62: string): string {
	return `${phone62}@c.us`;
}

export function fillTemplate(
	tpl: string,
	vars: Record<string, string>,
	siteName: string
): string {
	return tpl
		.replace(/\{nama\}/g, vars.nama ?? '')
		.replace(/\{nominal\}/g, vars.nominal ?? '')
		.replace(/\{campaign\}/g, vars.campaign ?? '')
		.replace(/\{link_bayar\}/g, vars.link_bayar ?? '')
		.replace(/\{batas_bayar\}/g, vars.batas_bayar ?? '')
		.replace(/\{link_campaign\}/g, vars.link_campaign ?? '')
		.replace(/\{nama_cs\}/g, vars.nama_cs ?? '')
		.replace(/\{nama_situs\}/g, siteName)
		.replace(/\{link_riwayat\}/g, vars.link_riwayat ?? '');
}
