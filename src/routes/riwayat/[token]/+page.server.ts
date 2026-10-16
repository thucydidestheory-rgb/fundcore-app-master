import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';

// Riwayat donasi lewat link unik WhatsApp — tanpa login (PRD F-18).
export const load: PageServerLoad = async ({ params }) => {
	const db = loadDb();
	const list = db.donations.filter((d) => d.historyToken === params.token);
	if (!list.length) throw error(404, 'Riwayat tidak ditemukan');
	const first = list[0];
	const enriched = list.map((d) => ({
		...d,
		campaignTitle: db.campaigns.find((c) => c.id === d.campaignId)?.title ?? '',
		campaignSlug: db.campaigns.find((c) => c.id === d.campaignId)?.slug ?? ''
	}));
	return { name: first.isAnonymous ? 'Orang Baik' : first.donorName, items: enriched };
};
