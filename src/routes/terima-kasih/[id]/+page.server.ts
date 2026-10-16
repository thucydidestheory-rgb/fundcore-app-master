import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';

export const load: PageServerLoad = async ({ params, url }) => {
	// back_url Winpay membawa invoiceRef (donasi dibuat setelah invoice),
	// bila id donasi langsung diberikan, pakai itu.
	const db = loadDb();
	const d =
		db.donations.find((x) => x.id === params.id) ??
		db.donations.find((x) => x.invoiceRef === params.id);
	if (!d) throw error(404, 'Donasi tidak ditemukan');
	const c = db.campaigns.find((x) => x.id === d.campaignId);
	return { d: { id: d.id, amount: d.amount, status: d.status, invoiceUrl: d.invoiceUrl }, campaignSlug: c?.slug ?? '', campaignTitle: c?.title ?? '', siteUrl: process.env.ORIGIN || url.origin };
};
