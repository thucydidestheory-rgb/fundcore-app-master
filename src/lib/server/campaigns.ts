// Query daftar campaign — dipakai API (/api/campaigns, infinite scroll) dan
// SSR halaman /campaigns (halaman pertama tanpa JS, PRD §9.1 progressive enhancement).
import type { Campaign, DbShape } from '$lib/types';
import { decodeCursor, encodeCursor } from './store';

export interface ListOpts {
	kategori: string;
	urut: string;
	q: string;
	cursor: string;
	limit: number;
}

export function listCampaigns(db: DbShape, opts: ListOpts): { items: Campaign[]; nextCursor: string | null } {
	let list = db.campaigns.filter((c) => c.status === 'active');
	if (opts.kategori) {
		const cat = db.categories.find((k) => k.slug === opts.kategori);
		list = cat ? list.filter((c) => c.categoryId === cat.id) : [];
	}
	const q = opts.q.toLowerCase();
	if (q) list = list.filter((c) => (c.title + ' ' + c.story).toLowerCase().includes(q));

	const sorted = [...list].sort((a, b) => {
		if (opts.urut === 'populer') return b.donorCount - a.donorCount || (a.id < b.id ? -1 : 1);
		if (opts.urut === 'hampir') {
			const pa = a.collectedAmount / Math.max(1, a.targetAmount);
			const pb = b.collectedAmount / Math.max(1, b.targetAmount);
			return pb - pa || (a.id < b.id ? -1 : 1);
		}
		if (opts.urut === 'mendesak')
			return Number(b.urgent) - Number(a.urgent) || (a.endAt < b.endAt ? -1 : 1) || (a.id < b.id ? -1 : 1);
		return (a.createdAt < b.createdAt ? 1 : -1) || (a.id < b.id ? -1 : 1);
	});
	let rest = sorted;
	const cursor = decodeCursor(opts.cursor);
	if (cursor) {
		const pos = sorted.findIndex((c) => c.id === cursor.id);
		rest = pos >= 0 ? sorted.slice(pos + 1) : [];
	}
	const items = rest.slice(0, opts.limit);
	const last = items[items.length - 1];
	return { items, nextCursor: rest.length > opts.limit && last ? encodeCursor(last.createdAt, last.id) : null };
}
