import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';
import { verifyPassword, createSession, getUserFromCookies } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	if (getUserFromCookies(cookies)) throw redirect(303, '/fundraiser');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		const fd = Object.fromEntries(await request.formData());
		const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(fd);
		if (!parsed.success) return fail(400, { message: 'Email/password tidak valid.' });
		const db = loadDb();
		const u = db.users.find((x) => x.email.toLowerCase() === parsed.data.email.toLowerCase());
		if (!u || !verifyPassword(parsed.data.password, u.passwordHash)) {
			return fail(400, { message: 'Email atau password salah.' });
		}
		console.log(`[auth] login ${u.email} dari ${getClientAddress()}`);
		createSession(cookies, u.id);
		const next = url.searchParams.get('next');
		throw redirect(303, next && next.startsWith('/') && !next.startsWith('//') ? next : u.role === 'donor' || u.role === 'fundraiser' ? '/fundraiser' : '/admin');
	}
};
