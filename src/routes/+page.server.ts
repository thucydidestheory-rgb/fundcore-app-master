import { loadDb, updateDb, isoNow } from '$lib/server/store';
import { bumpViews } from '$lib/server/payments';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const db = loadDb();
	const active = db.campaigns.filter((c) => c.status === 'active');
	const byCollected = [...active].sort((a, b) => b.collectedAmount - a.collectedAmount);
	const terbaru = [...active].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);
	const mendesak = active.filter((c) => c.urgent).slice(0, 6);
	// Campaign Pilihan = unggulan untuk hero + section (mendesak dulu, lalu terkumpul terbesar).
	const featured = mendesak[0] ?? byCollected[0] ?? null;
	const pilihan = byCollected.slice(0, 4);
	const featuredCat = db.categories.find((k) => k.id === featured?.categoryId);
	// Laporan penyaluran = kabar terbaru lintas campaign (maks 4).
	const laporan = [...db.updates]
		.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
		.slice(0, 4)
		.map((u) => {
			const c = db.campaigns.find((x) => x.id === u.campaignId);
			return { ...u, campaignTitle: c?.title ?? '', campaignSlug: c?.slug ?? '', coverUrl: c?.coverUrl ?? '' };
		});
	const ticker = db.donations
		.filter((d) => d.status === 'paid')
		.sort((a, b) => (a.paidAt! < b.paidAt! ? 1 : -1))
		.slice(0, 8);
	// Funnel: kunjungan home dihitung sebagai view (ringan, tanpa query agregat).
	updateDb((d) => bumpViews(d, isoNow().slice(0, 10), 'views', 1));
	return {
		siteName: db.site.siteName,
		categories: db.categories,
		featured,
		featuredCat: featuredCat ? { name: featuredCat.name, icon: featuredCat.icon } : null,
		pilihan,
		mendesak,
		terbaru,
		laporan,
		ticker: ticker.map((t) => ({ name: t.isAnonymous ? 'Orang Baik' : t.donorName, amount: t.amount })),
		siteTagline: db.site.tagline
	};
};
