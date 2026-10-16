import { fail, redirect, error } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { loadDb, saveDb, nextId, isoNow, slugify } from '$lib/server/store';
import { getUserFromCookies, isAdmin, audit } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	const u = getUserFromCookies(cookies)!;
	if (u.fundraiserStatus !== 'approved' && !isAdmin(u)) throw error(403, 'Butuh verifikasi fundraiser.');
	const db = loadDb();
	return { categories: db.categories };
};

const COVERS = ['/covers/c1.svg', '/covers/c2.svg', '/covers/c3.svg', '/covers/c4.svg', '/covers/c5.svg', '/covers/c6.svg'];

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (u.fundraiserStatus !== 'approved' && !isAdmin(u)) throw error(403);
		const fd = Object.fromEntries(await request.formData());
		const parsed = z.object({
			title: z.string().trim().min(10).max(120),
			categoryId: z.string().min(1),
			targetAmount: z.coerce.number().int().min(100000).max(100_000_000_000),
			durationDays: z.coerce.number().int().min(1).max(365),
			story: z.string().trim().min(50).max(20000),
			receiver: z.string().trim().min(3).max(200),
			cover: z.string().max(200).optional()
		}).safeParse(fd);
		if (!parsed.success) return fail(400, { message: 'Periksa: judul ≥10 huruf, cerita ≥50 huruf, target ≥ Rp100rb.' });
		const db = loadDb();
		// Sanitasi cerita: buang tag script/event handler (anti XSS, PRD §9.3).
		const story = parsed.data.story
			.replace(/<script[\s\S]*?<\/script>/gi, '')
			.replace(/ on\w+="[^"]*"/gi, '')
			.slice(0, 20000);
		let slug = slugify(parsed.data.title);
		if (db.campaigns.some((c) => c.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`;
		const cover = parsed.data.cover && parsed.data.cover.startsWith('/covers/') ? parsed.data.cover : COVERS[db.campaigns.length % COVERS.length];
		const now = isoNow();
		const campaign = {
			id: nextId(db, 'cmp'),
			slug,
			ownerId: u.id,
			ownerName: u.name,
			verified: true,
			title: parsed.data.title,
			categoryId: parsed.data.categoryId,
			targetAmount: parsed.data.targetAmount,
			collectedAmount: 0,
			donorCount: 0,
			status: 'active' as const, // fundraiser terverifikasi langsung tayang (PRD F-24)
			urgent: false,
			startAt: now,
			endAt: new Date(Date.now() + parsed.data.durationDays * 86400_000).toISOString(),
			coverUrl: cover,
			story,
			receiver: parsed.data.receiver,
			createdAt: now,
			lastDonationAt: null
		};
		db.campaigns.unshift(campaign);
		audit(db, u, 'campaign.create', campaign.id, null, { title: campaign.title }, getClientAddress());
		saveDb(db);
		throw redirect(303, `/c/${slug}`);
	}
};
