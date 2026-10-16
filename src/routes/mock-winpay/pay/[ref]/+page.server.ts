import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';
import { winpayMode } from '$lib/server/winpay';

// Halaman simulasi Checkout Page Winpay — HANYA mode mock (WINPAY_MOCK=true).
// Di produksi rute ini 404; donatur membayar di halaman resmi Winpay.
export const load: PageServerLoad = async ({ params }) => {
	if (winpayMode() !== 'mock') throw error(404);
	const db = loadDb();
	const d = db.donations.find((x) => x.invoiceRef === params.ref);
	if (!d) throw error(404, 'Invoice tidak ditemukan');
	const c = db.campaigns.find((x) => x.id === d.campaignId);
	return {
		d: { id: d.id, amount: d.amount, status: d.status, invoiceRef: d.invoiceRef },
		campaignTitle: c?.title ?? ''
	};
};

export const actions: Actions = {
	// Simulasi "sudah bayar": finalisasi idempotent persis seperti callback asli.
	bayar: async ({ request, params, url }) => {
		if (winpayMode() !== 'mock') throw error(404);
		const fd = await request.formData();
		const channel = String(fd.get('channel') ?? 'QRIS').slice(0, 20);
		const { finalizePaid } = await import('$lib/server/payments');
		const r = finalizePaid(
			{
				invoiceRef: params.ref,
				channel,
				amount: 0, // dihitung ulang dari donasi tersimpan
				fee: channel === 'QRIS' ? 2000 : 4000,
				providerUuid: `mock_${params.ref}`,
				rawCallback: JSON.stringify({ mock: true, ref: params.ref, channel })
			},
			url.origin
		);
		if (!r.ok) return fail(400, { message: 'Invoice sudah kedaluwarsa atau tidak valid.' });
		return { ok: true, donationId: r.donationId };
	}
};
