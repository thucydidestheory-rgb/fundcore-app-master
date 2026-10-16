import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDb, saveDb } from '$lib/server/store';
import { getUserFromCookies, audit } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	const db = loadDb();
	return {
		users: db.users.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, fundraiserStatus: u.fundraiserStatus, createdAt: u.createdAt })),
		logs: db.auditLogs.slice(0, 80)
	};
};

export const actions: Actions = {
	role: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (u.role !== 'super_admin') return fail(403, { message: 'Hanya Super Admin.' });
		const fd = Object.fromEntries(await request.formData());
		const db = loadDb();
		const t = db.users.find((x) => x.id === String(fd.id ?? ''));
		if (!t) return fail(404, { message: 'Tidak ditemukan.' });
		const role = String(fd.role ?? '');
		if (!['super_admin', 'operator', 'finance', 'viewer', 'fundraiser', 'donor'].includes(role)) return fail(400, { message: 'Role tidak valid.' });
		const before = t.role;
		t.role = role as typeof t.role;
		audit(db, u, 'user.role', t.id, { role: before }, { role }, getClientAddress());
		saveDb(db);
		return { ok: true };
	}
};
