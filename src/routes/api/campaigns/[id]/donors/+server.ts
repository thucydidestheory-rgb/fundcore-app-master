import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadDb, decodeCursor, encodeCursor } from '$lib/server/store';

// GET /api/campaigns/{id}/donors?cursor=&sort=terbaru|terbesar — keyset paging.
export const GET: RequestHandler = async ({ params, url }) => {
	const db = loadDb();
	const limit = Math.min(30, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));
	const sort = url.searchParams.get('sort') === 'terbesar' ? 'terbesar' : 'terbaru';
	const cursor = decodeCursor(url.searchParams.get('cursor') ?? '');
	let list = db.donations.filter((d) => d.campaignId === params.id && d.status === 'paid');
	list = [...list].sort((a, b) =>
		sort === 'terbesar'
			? b.amount - a.amount || (a.paidAt! < b.paidAt! ? 1 : -1)
			: (a.paidAt! < b.paidAt! ? 1 : -1)
	);
	if (cursor) {
		const pos = list.findIndex((d) => d.id === cursor.id);
		list = pos >= 0 ? list.slice(pos + 1) : [];
	}
	const items = list.slice(0, limit).map((d) => ({
		id: d.id,
		name: d.isAnonymous ? 'Orang Baik' : d.donorName,
		amount: d.amount,
		prayer: d.prayer,
		aamiin: d.aamiinCount,
		paidAt: d.paidAt
	}));
	const last = list[limit - 1] ?? list[list.length - 1];
	return json({
		items,
		nextCursor: list.length > limit && last ? encodeCursor(last.paidAt!, last.id) : null
	});
};
