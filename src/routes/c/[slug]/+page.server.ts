import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadDb, updateDb } from '$lib/server/store';
import { bumpViews } from '$lib/server/payments';
import { isoNow } from '$lib/server/store';

export const load: PageServerLoad = async ({ params, url }) => {
	const db = loadDb();
	const c = db.campaigns.find((x) => x.slug === params.slug && x.status !== 'draft');
	if (!c) throw error(404, 'Campaign tidak ditemukan');
	const sort = url.searchParams.get('sort') === 'terbesar' ? 'terbesar' : 'terbaru';
	let paid = db.donations.filter((d) => d.campaignId === c.id && d.status === 'paid');
	paid = [...paid].sort((a, b) =>
		sort === 'terbesar'
			? b.amount - a.amount || (a.paidAt! < b.paidAt! ? 1 : -1)
			: (a.paidAt! < b.paidAt! ? 1 : -1)
	);
	const donors = paid.slice(0, 10).map((d) => ({
		id: d.id, name: d.isAnonymous ? 'Orang Baik' : d.donorName,
		amount: d.amount, prayer: d.prayer, aamiin: d.aamiinCount, paidAt: d.paidAt
	}));
	// Doa-doa orang baik: donasi berdoa, terbaru dulu (ala niatbaik.id).
	const withPrayer = db.donations
		.filter((d) => d.campaignId === c.id && d.status === 'paid' && d.prayer)
		.sort((a, b) => (a.paidAt! < b.paidAt! ? 1 : -1));
	const updates = db.updates.filter((u) => u.campaignId === c.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
	const category = db.categories.find((k) => k.id === c.categoryId);
	const related = db.campaigns.filter((x) => x.status === 'active' && x.id !== c.id && x.categoryId === c.categoryId).slice(0, 3);
	const tab = url.searchParams.get('tab') ?? 'cerita';
	const today = isoNow().slice(0, 10);
	updateDb((d) => bumpViews(d, today, 'views', 1));
	return {
		c, donors, sort, donorTotal: paid.length,
		doas: withPrayer.slice(0, 10).map((d) => ({
			id: d.id, name: d.isAnonymous ? 'Orang Baik' : d.donorName,
			prayer: d.prayer!, aamiin: d.aamiinCount, paidAt: d.paidAt
		})),
		doaTotal: withPrayer.length,
		updates, category, categories: db.categories, related, tab, siteUrl: process.env.ORIGIN || url.origin
	};
};
