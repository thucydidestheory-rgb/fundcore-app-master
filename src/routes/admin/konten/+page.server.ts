import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { loadDb, saveDb } from '$lib/server/store';
import { getUserFromCookies, can, audit } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	const db = loadDb();
	return { contents: db.contents, disbursements: db.disbursements };
};

export const actions: Actions = {
	konten: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		const p = z.object({
			aboutBody: z.string().max(5000).default(''),
			visi: z.string().max(2000).default(''),
			misi: z.string().max(5000).default(''),
			nilai: z.string().max(5000).default(''),
			faq: z.string().max(10000).default('')
		}).safeParse(fd);
		if (!p.success) return fail(400, { message: 'Konten tidak valid.' });
		const db = loadDb();
		db.contents.aboutBody = p.data.aboutBody;
		db.contents.visi = p.data.visi;
		db.contents.misi = p.data.misi;
		db.contents.nilai = p.data.nilai;
		db.contents.faqs = p.data.faq
			.split('\n---\n')
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => {
				const [q, ...rest] = s.split('\n');
				return { q: q.slice(0, 200), a: rest.join('\n').slice(0, 2000) };
			});
		audit(db, u, 'content.save', 'contents', null, {}, getClientAddress());
		saveDb(db);
		return { ok: true };
	},
	pencairan: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'finance')) return fail(403, { message: 'Butuh peran Finance.' });
		const fd = Object.fromEntries(await request.formData());
		const db = loadDb();
		const p = db.disbursements.find((x) => x.id === String(fd.id ?? ''));
		if (!p) return fail(404, { message: 'Tidak ditemukan.' });
		if (fd.decision === 'transfer') {
			p.status = 'transferred';
			p.proofUrl = String(fd.proof ?? '').slice(0, 300) || null;
		} else {
			p.status = 'approved';
		}
		p.approvedBy = u.id;
		audit(db, u, 'disbursement.decide', p.id, null, { status: p.status }, getClientAddress());
		saveDb(db);
		return { ok: true };
	}
};
