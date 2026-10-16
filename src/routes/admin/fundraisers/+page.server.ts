import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDb, saveDb, isoNow } from '$lib/server/store';
import { getUserFromCookies, can, audit } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	const db = loadDb();
	return { applications: db.applications };
};

export const actions: Actions = {
	review: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		const id = String(fd.id ?? '');
		const approve = fd.decision === 'approve';
		const db = loadDb();
		const app = db.applications.find((a) => a.id === id);
		if (!app || app.status !== 'pending') return fail(400, { message: 'Pengajuan tidak valid.' });
		app.status = approve ? 'approved' : 'rejected';
		app.note = String(fd.note ?? '').slice(0, 500) || null;
		app.reviewedBy = u.id;
		app.reviewedAt = isoNow();
		const user = db.users.find((x) => x.id === app.userId);
		if (user) user.fundraiserStatus = approve ? 'approved' : 'rejected';
		audit(db, u, approve ? 'fundraiser.approve' : 'fundraiser.reject', app.userId, { status: 'pending' }, { status: app.status }, getClientAddress());
		saveDb(db);
		return { ok: true };
	}
};
