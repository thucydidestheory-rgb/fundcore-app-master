import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateDb } from '$lib/server/store';

// POST /api/campaigns/{id}/aamiin — tombol "Aamiin" untuk doa donatur (F-05).
// Rate limit sederhana: 1x per donasi per 60 detik per IP (memori proses).
const lastHit = new Map<string, number>();

export const POST: RequestHandler = async ({ params, request, getClientAddress }) => {
	const key = `${getClientAddress()}:${params.id}`;
	const now = Date.now();
	if (now - (lastHit.get(key) ?? 0) < 60_000) {
		return json({ ok: false, message: 'Terlalu sering. Coba lagi sebentar.' }, { status: 429 });
	}
	lastHit.set(key, now);
	const count = updateDb((db) => {
		const d = db.donations.find((x) => x.id === params.id);
		if (!d || d.status !== 'paid') return -1;
		d.aamiinCount += 1;
		return d.aamiinCount;
	});
	if (count < 0) return json({ ok: false }, { status: 404 });
	return json({ ok: true, aamiin: count });
};
