import type { PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';
import { listCampaigns } from '$lib/server/campaigns';

export const load: PageServerLoad = async ({ url }) => {
	const db = loadDb();
	const kategori = url.searchParams.get('kategori') ?? '';
	const urut = url.searchParams.get('urut') ?? 'terbaru';
	const q = url.searchParams.get('q') ?? '';
	// Halaman pertama di-render server (SEO + tanpa-JS); sisanya infinite scroll.
	const first = listCampaigns(db, { kategori, urut, q, cursor: '', limit: 9 });
	return { categories: db.categories, kategori, urut, q, initialItems: first.items, initialCursor: first.nextCursor };
};
