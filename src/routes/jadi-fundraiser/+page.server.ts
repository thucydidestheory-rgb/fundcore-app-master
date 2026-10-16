import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { loadDb, saveDb, nextId, isoNow } from '$lib/server/store';
import { getUserFromCookies } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	const u = getUserFromCookies(cookies);
	const db = loadDb();
	return {
		user: u ? { id: u.id, name: u.name, fundraiserStatus: u.fundraiserStatus } : null,
		pending: u ? db.applications.find((a) => a.userId === u.id && a.status === 'pending') ?? null : null
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const u = getUserFromCookies(cookies);
		if (!u) throw redirect(303, '/masuk?next=/jadi-fundraiser');
		if (u.fundraiserStatus === 'approved') throw redirect(303, '/fundraiser');
		const fd = Object.fromEntries(await request.formData());
		const parsed = z.object({ docType: z.string().min(2), docUrl: z.string().min(2) }).safeParse(fd);
		if (!parsed.success) return fail(400, { message: 'Lengkapi jenis & link dokumen identitas.' });
		const db = loadDb();
		if (db.applications.some((a) => a.userId === u.id && a.status === 'pending'))
			return { ok: true };
		const me = db.users.find((x) => x.id === u.id)!;
		me.fundraiserStatus = 'pending';
		db.applications.unshift({
			id: nextId(db, 'app'), userId: me.id, userName: me.name,
			docType: parsed.data.docType, docUrl: parsed.data.docUrl,
			status: 'pending', note: null, reviewedBy: null, reviewedAt: null, createdAt: isoNow()
		});
		saveDb(db);
		return { ok: true };
	}
};
