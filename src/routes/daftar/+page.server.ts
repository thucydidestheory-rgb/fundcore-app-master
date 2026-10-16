import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { loadDb, saveDb, nextId, isoNow } from '$lib/server/store';
import { hashPassword, createSession, getUserFromCookies } from '$lib/server/auth';
import { normalizePhone } from '$lib/format';

export const load: PageServerLoad = async ({ cookies }) => {
	if (getUserFromCookies(cookies)) throw redirect(303, '/fundraiser');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const fd = Object.fromEntries(await request.formData());
		const parsed = z.object({
			name: z.string().trim().min(3).max(80),
			email: z.string().trim().email().max(120),
			phone: z.string().trim().min(9).max(18),
			password: z.string().min(6).max(100)
		}).safeParse(fd);
		if (!parsed.success) return fail(400, { message: 'Periksa lagi: nama, email, WA, dan password (min 6).' });
		const phone62 = normalizePhone(parsed.data.phone);
		if (!phone62) return fail(400, { message: 'Nomor WhatsApp tidak valid.' });
		const db = loadDb();
		if (db.users.some((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase()))
			return fail(400, { message: 'Email sudah terdaftar. Silakan masuk.' });
		const user = {
			id: nextId(db, 'usr'),
			name: parsed.data.name,
			phone: phone62,
			email: parsed.data.email,
			passwordHash: hashPassword(parsed.data.password),
			role: 'donor' as const,
			fundraiserStatus: 'none' as const,
			createdAt: isoNow()
		};
		db.users.push(user);
		saveDb(db);
		createSession(cookies, user.id);
		throw redirect(303, '/fundraiser');
	}
};
