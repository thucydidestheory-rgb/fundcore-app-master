import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';

export const load: PageServerLoad = async ({ params, url }) => {
	const db = loadDb();
	const c = db.campaigns.find((x) => x.slug === params.slug && x.status === 'active');
	if (!c) throw error(404, 'Campaign tidak ditemukan atau tidak aktif');
	return {
		c,
		minDonation: db.site.minDonation,
		utm: url.searchParams.get('utm_source') ?? ''
	};
};
