import type { PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';
import { getUserFromCookies, isAdmin } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	const u = getUserFromCookies(cookies)!;
	const db = loadDb();
	const mine = db.campaigns.filter((c) => c.ownerId === u.id);
	const ids = new Set(mine.map((c) => c.id));
	const donations = db.donations.filter((d) => ids.has(d.campaignId) && d.status === 'paid').slice(0, 20);
	const disbursements = db.disbursements.filter((x) => ids.has(x.campaignId));
	return {
		user: { name: u.name, fundraiserStatus: u.fundraiserStatus, role: u.role },
		campaigns: mine,
		donations: donations.map((d) => ({
			...d,
			donorName: d.isAnonymous ? 'Orang Baik' : d.donorName,
			campaignTitle: db.campaigns.find((c) => c.id === d.campaignId)?.title ?? '—'
		})),
		disbursements,
		canCreate: u.fundraiserStatus === 'approved' || isAdmin(u)
	};
};
