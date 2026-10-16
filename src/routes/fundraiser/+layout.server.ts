import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUserFromCookies } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const u = getUserFromCookies(cookies);
	if (!u) throw redirect(303, '/masuk?next=/fundraiser');
	return { user: { id: u.id, name: u.name, role: u.role, fundraiserStatus: u.fundraiserStatus } };
};
