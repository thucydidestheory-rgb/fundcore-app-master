import type { PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';

export const load: PageServerLoad = async () => {
	const db = loadDb();
	return { faqs: db.contents.faqs, siteName: db.site.siteName };
};
