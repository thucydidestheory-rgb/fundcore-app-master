import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadDb } from '$lib/server/store';
import { listCampaigns } from '$lib/server/campaigns';

// GET /api/campaigns?kategori=&urut=&q=&cursor=&limit= — cursor paging (PRD F-03, §9.2).
export const GET: RequestHandler = async ({ url }) => {
	const db = loadDb();
	return json(
		listCampaigns(db, {
			kategori: url.searchParams.get('kategori') ?? '',
			urut: url.searchParams.get('urut') ?? 'terbaru',
			q: url.searchParams.get('q') ?? '',
			cursor: url.searchParams.get('cursor') ?? '',
			limit: Math.min(24, Math.max(1, parseInt(url.searchParams.get('limit') || '9', 10)))
		})
	);
};
