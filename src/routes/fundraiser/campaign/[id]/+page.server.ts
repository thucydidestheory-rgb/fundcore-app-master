import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { loadDb, saveDb, nextId, isoNow } from '$lib/server/store';
import { getUserFromCookies, isAdmin, audit } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const u = getUserFromCookies(cookies)!;
	const db = loadDb();
	const c = db.campaigns.find((x) => x.id === params.id);
	if (!c) throw error(404);
	if (c.ownerId !== u.id && !isAdmin(u)) throw error(403);
	const donations = db.donations.filter((d) => d.campaignId === c.id && d.status === 'paid').slice(0, 30);
	const updates = db.updates.filter((x) => x.campaignId === c.id);
	const net = db.donations.filter((d) => d.campaignId === c.id && d.status === 'paid').reduce((s, d) => s + d.netAmount, 0);
	return { c, donations, updates, net };
};

export const actions: Actions = {
	kabar: async ({ request, cookies, params, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		const fd = Object.fromEntries(await request.formData());
		const p = z.object({ title: z.string().trim().min(3).max(120), body: z.string().trim().min(10).max(5000) }).safeParse(fd);
		if (!p.success) return fail(400, { message: 'Judul & isi kabar wajib diisi.' });
		const db = loadDb();
		const c = db.campaigns.find((x) => x.id === params.id);
		if (!c || (c.ownerId !== u.id && !isAdmin(u))) throw error(403);
		db.updates.unshift({ id: nextId(db, 'upd'), campaignId: c.id, title: p.data.title, body: p.data.body, createdAt: isoNow() });
		audit(db, u, 'campaign.update', c.id, null, { title: p.data.title }, getClientAddress());
		saveDb(db);
		return { ok: true };
	},
	cairkan: async ({ request, cookies, params, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		const fd = Object.fromEntries(await request.formData());
		const p = z.object({ amount: z.coerce.number().int().min(50000) }).safeParse(fd);
		if (!p.success) return fail(400, { message: 'Nominal pencairan min Rp50rb.' });
		const db = loadDb();
		const c = db.campaigns.find((x) => x.id === params.id);
		if (!c || (c.ownerId !== u.id && !isAdmin(u))) throw error(403);
		db.disbursements.unshift({
			id: nextId(db, 'dis'), campaignId: c.id, amount: p.data.amount,
			status: 'requested', proofUrl: null, note: null,
			requestedBy: u.id, requestedAt: isoNow(), approvedBy: null
		});
		audit(db, u, 'disbursement.request', c.id, null, { amount: p.data.amount }, getClientAddress());
		saveDb(db);
		return { ok: true };
	}
};
