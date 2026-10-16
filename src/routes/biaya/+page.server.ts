import type { PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';
import { calcFees } from '$lib/server/fees';

export const load: PageServerLoad = async () => {
	const db = loadDb();
	return { siteName: db.site.siteName, org: { name: db.site.orgName, addr: db.site.orgAddress, contact: db.site.orgContact }, fee: db.site.platformFeePct, note: db.contents.paymentNote, contoh: calcFees(100000, 4000, db.site.platformFeePct) };
};
