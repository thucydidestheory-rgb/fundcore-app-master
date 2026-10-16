import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { loadDb, saveDb } from '$lib/server/store';
import { getUserFromCookies, can, audit } from '$lib/server/auth';
import { checkThemeContrast } from '$lib/format';

export const load: PageServerLoad = async () => {
	const db = loadDb();
	return { site: db.site, warns: checkThemeContrast(db.site.colorBg, db.site.colorBrand, db.site.colorAccent) };
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		const p = z.object({
			siteName: z.string().trim().min(2).max(60),
			tagline: z.string().trim().max(200).default(''),
			logoUrl: z.string().trim().max(300).default('/logo.svg'),
			colorBg: z.string().regex(/^#[0-9a-fA-F]{6}$/),
			colorBrand: z.string().regex(/^#[0-9a-fA-F]{6}$/),
			colorAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
			orgName: z.string().trim().max(120).default(''),
			orgAddress: z.string().trim().max(300).default(''),
			orgContact: z.string().trim().max(60).default(''),
			skKemenkumham: z.string().trim().max(120).default(''),
			socInstagram: z.string().trim().max(200).default(''),
			socTiktok: z.string().trim().max(200).default(''),
			socFacebook: z.string().trim().max(200).default(''),
			socYoutube: z.string().trim().max(200).default('')
		}).safeParse(fd);
		if (!p.success) return fail(400, { message: 'Nama min 2 huruf; warna harus hex (#rrggbb).' });
		const db = loadDb();
		const before = { ...db.site };
		const { socInstagram, socTiktok, socFacebook, socYoutube, ...rest } = p.data;
		Object.assign(db.site, rest);
		db.site.socials = {
			instagram: socInstagram,
			tiktok: socTiktok,
			facebook: socFacebook,
			youtube: socYoutube
		};
		const warns = checkThemeContrast(p.data.colorBg, p.data.colorBrand, p.data.colorAccent);
		audit(db, u, 'theme.save', 'site_settings', { siteName: before.siteName }, { siteName: p.data.siteName }, getClientAddress());
		saveDb(db);
		return { ok: true, warns };
	}
};
