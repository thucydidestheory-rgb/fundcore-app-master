import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { loadDb, saveDb, nextId, isoNow, slugify } from '$lib/server/store';
import { getUserFromCookies, can, audit } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	const db = loadDb();
	return { campaigns: db.campaigns, categories: db.categories };
};

export const actions: Actions = {
	freeze: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		const id = String(fd.id ?? '');
		const db = loadDb();
		const c = db.campaigns.find((x) => x.id === id);
		if (!c) return fail(404, { message: 'Tidak ditemukan.' });
		const before = c.status;
		c.status = c.status === 'frozen' ? 'active' : 'frozen';
		audit(db, u, c.status === 'frozen' ? 'campaign.freeze' : 'campaign.unfreeze', c.id, { status: before }, { status: c.status }, getClientAddress());
		saveDb(db);
		return { ok: true };
	},
	finish: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		const db = loadDb();
		const c = db.campaigns.find((x) => x.id === String(fd.id ?? ''));
		if (!c) return fail(404, { message: 'Tidak ditemukan.' });
		const before = c.status;
		c.status = 'finished';
		audit(db, u, 'campaign.finish', c.id, { status: before }, { status: 'finished' }, getClientAddress());
		saveDb(db);
		return { ok: true };
	},
	// Admin membuat campaign langsung atas nama yayasan (PRD F-22).
	buat: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		const p = z.object({
			title: z.string().trim().min(10).max(120),
			categoryId: z.string().min(1),
			targetAmount: z.coerce.number().int().min(100000),
			durationDays: z.coerce.number().int().min(1).max(365),
			story: z.string().trim().min(20).max(20000),
			receiver: z.string().trim().min(3).max(200)
		}).safeParse(fd);
		if (!p.success) return fail(400, { message: 'Lengkapi judul, target, cerita, penerima.' });
		const db = loadDb();
		let slug = slugify(p.data.title);
		if (db.campaigns.some((c) => c.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`;
		const now = isoNow();
		db.campaigns.unshift({
			id: nextId(db, 'cmp'), slug, ownerId: u.id, ownerName: db.site.orgName, verified: true,
			title: p.data.title, categoryId: p.data.categoryId, targetAmount: p.data.targetAmount,
			collectedAmount: 0, donorCount: 0, status: 'active', urgent: false,
			startAt: now, endAt: new Date(Date.now() + p.data.durationDays * 86400_000).toISOString(),
			coverUrl: '/covers/c1.svg', story: p.data.story, receiver: p.data.receiver,
			createdAt: now, lastDonationAt: null
		});
		audit(db, u, 'campaign.create.admin', slug, null, { title: p.data.title }, getClientAddress());
		saveDb(db);
		return { ok: true };
	}
};
