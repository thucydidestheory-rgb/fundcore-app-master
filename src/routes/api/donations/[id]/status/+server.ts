import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadDb } from '$lib/server/store';

// GET /api/donations/{id}/status — polling ringan halaman terima kasih (F-15).
export const GET: RequestHandler = async ({ params }) => {
	const db = loadDb();
	const d = db.donations.find((x) => x.id === params.id);
	if (!d) return json({ status: 'unknown' }, { status: 404 });
	return json(
		{ status: d.status, amount: d.amount, invoiceUrl: d.invoiceUrl, paidAt: d.paidAt },
		{ headers: { 'Cache-Control': 'no-store' } }
	);
};
