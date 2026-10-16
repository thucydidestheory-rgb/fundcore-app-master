import type { PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';

export const load: PageServerLoad = async () => {
	const db = loadDb();
	const active = db.campaigns.filter((c) => c.status === 'active');
	const paid = db.donations.filter((d) => d.status === 'paid');
	return {
		site: db.site,
		about: db.contents.aboutBody,
		visi: db.contents.visi ?? '',
		misi: (db.contents.misi ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
		nilai: (db.contents.nilai ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
		stats: {
			campaign: active.length,
			donatur: new Set(paid.map((d) => d.donorPhone)).size,
			terkumpul: paid.reduce((s, d) => s + d.amount, 0)
		}
	};
};
