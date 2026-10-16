import type { PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';

export const load: PageServerLoad = async () => {
	const db = loadDb();
	return { siteName: db.site.siteName, contact: db.site.orgContact, address: db.site.orgAddress };
};
