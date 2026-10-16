import type { PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';

// Overview: kartu ringkasan, tren, funnel, breakdown, top campaign, status ops (PRD §6.6).
export const load: PageServerLoad = async ({ url }) => {
	const db = loadDb();
	const range = Math.min(90, Math.max(7, parseInt(url.searchParams.get('range') || '30', 10)));
	const days: string[] = [];
	for (let i = range - 1; i >= 0; i--) {
		const d = new Date(Date.now() - i * 86400_000);
		days.push(d.toISOString().slice(0, 10));
	}
	const byDay = new Map(db.statsDaily.map((s) => [s.day, s]));
	const stats = days.map(
		(day) => byDay.get(day) ?? { day, gross: 0, gatewayFee: 0, platformFee: 0, net: 0, count: 0, paidCount: 0, views: 0, checkouts: 0 }
	);
	const paid = db.donations.filter((d) => d.status === 'paid');
	const totalGross = paid.reduce((s, d) => s + d.amount, 0);
	const totalGw = paid.reduce((s, d) => s + d.gatewayFee, 0);
	const totalPf = paid.reduce((s, d) => s + d.platformFee, 0);
	const donors = new Set(paid.map((d) => d.donorPhone)).size;
	const today = new Date().toISOString().slice(0, 10);
	const inRange = (iso: string | null) => !!iso && iso.slice(0, 10) >= days[0];
	const grossRange = paid.filter((d) => inRange(d.paidAt)).reduce((s, d) => s + d.amount, 0);

	const byChannel = new Map<string, number>();
	const byCategory = new Map<string, number>();
	const byUtm = new Map<string, number>();
	for (const d of paid.filter((x) => inRange(x.paidAt))) {
		byChannel.set(d.channel ?? '?', (byChannel.get(d.channel ?? '?') ?? 0) + d.amount);
		const c = db.campaigns.find((x) => x.id === d.campaignId);
		const cat = db.categories.find((k) => k.id === c?.categoryId)?.name ?? '?';
		byCategory.set(cat, (byCategory.get(cat) ?? 0) + d.amount);
		byUtm.set(d.utmSource ?? 'langsung', (byUtm.get(d.utmSource ?? 'langsung') ?? 0) + d.amount);
	}
	const top = [...db.campaigns].sort((a, b) => b.collectedAmount - a.collectedAmount).slice(0, 5);
	const hampir = db.campaigns
		.filter((c) => c.status === 'active' && c.collectedAmount / Math.max(1, c.targetAmount) >= 0.7)
		.slice(0, 5);
	const sepi = db.campaigns
		.filter((c) => c.status === 'active')
		.sort((a, b) => a.donorCount - b.donorCount)
		.slice(0, 5);
	const views = stats.reduce((s, x) => s + x.views, 0);
	const checkouts = stats.reduce((s, x) => s + x.checkouts, 0);
	const created = db.donations.filter((d) => d.createdAt.slice(0, 10) >= days[0]).length;
	const paidCount = paid.filter((d) => inRange(d.paidAt)).length;

	return {
		range,
		kards: {
			totalGross, grossRange, donors, paidCount,
			rata: paidCount ? Math.round(grossRange / Math.max(1, paidCount)) : 0,
			aktif: db.campaigns.filter((c) => c.status === 'active').length,
			siapCair: totalGross - totalGw - totalPf,
			todayGross: byDay.get(today)?.gross ?? 0
		},
		stats,
		funnel: { views, checkouts, created, paid: paidCount },
		byChannel: [...byChannel.entries()],
		byCategory: [...byCategory.entries()],
		byUtm: [...byUtm.entries()],
		top: top.map((c) => ({ id: c.id, slug: c.slug, title: c.title, collected: c.collectedAmount, target: c.targetAmount })),
		hampir: hampir.map((c) => ({ slug: c.slug, title: c.title, pct: Math.round((c.collectedAmount / Math.max(1, c.targetAmount)) * 100) })),
		sepi: sepi.map((c) => ({ slug: c.slug, title: c.title, donors: c.donorCount })),
		ops: {
			waQueued: db.waMessages.filter((m) => m.status === 'queued').length,
			waFailed: db.waMessages.filter((m) => m.status === 'failed').length,
			pendingLama: db.donations.filter((d) => d.status === 'pending' && Date.now() - new Date(d.createdAt).getTime() > 3 * 3600_000).length,
			waAccounts: db.waAccounts.map((a) => ({ label: a.label, status: a.status, isActive: a.isActive }))
		}
	};
};
