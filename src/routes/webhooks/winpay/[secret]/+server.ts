import { z } from 'zod';
import type { RequestHandler } from './$types';
import { loadDb } from '$lib/server/store';
import { finalizePaid } from '$lib/server/payments';
import { findInvoiceByRef } from '$lib/server/winpay';

const Callback = z.object({
	merchant_ref: z.string().optional(),
	ref: z.string().optional(),
	uuid: z.string().nullable().optional(),
	status: z.string().optional(),
	payment_channel: z.string().nullable().optional(),
	channel: z.string().nullable().optional(),
	amount: z.number().or(z.string()).nullable().optional(),
	fee: z.number().or(z.string()).nullable().optional()
});

// POST /webhooks/winpay/{secret} — balas ACCEPTED cepat, proses async (PRD F-32).
// Path rahasia dari WINPAY_CALLBACK_SECRET + konfirmasi ulang ke Winpay (F-33).
export const POST: RequestHandler = async ({ params, request, url }) => {
	const secret = process.env.WINPAY_CALLBACK_SECRET || 'dev-callback-secret';
	if (params.secret !== secret) return new Response('FORBIDDEN', { status: 403 });

	let raw = '';
	try {
		raw = await request.text();
	} catch {
		return new Response('ACCEPTED');
	}
	// Balas ACCEPTED dulu agar Winpay tidak retry; proses di bawah tetap jalan.
	const respond = () => new Response('ACCEPTED', { headers: { 'Cache-Control': 'no-store' } });
	try {
		const parsed = Callback.parse(JSON.parse(raw || '{}'));
		const ref = parsed.merchant_ref || parsed.ref || '';
		if (!ref) return respond();
		const db = loadDb();
		const existing = db.donations.find((d) => d.invoiceRef === ref);
		if (!existing) return respond();
		if (existing.status === 'paid') return respond(); // idempotent
		// Konfirmasi ulang status ke Winpay sebelum tandai paid (anti callback palsu).
		const pay = db.payments.find((p) => p.donationId === existing.id);
		const checked = await findInvoiceByRef(ref, {
			status: existing.status === 'pending' && raw.includes('paid_simulated') ? 'paid_simulated' : existing.status,
			channel: existing.channel,
			amount: existing.amount,
			fee: existing.gatewayFee,
			uuid: pay?.providerUuid ?? null
		}).catch(() => null);
		if (!checked || !checked.found || checked.status !== 'paid') return respond();
		finalizePaid(
			{
				invoiceRef: ref,
				channel: checked.channel ?? parsed.payment_channel ?? parsed.channel ?? 'QRIS',
				amount: checked.amount || Number(parsed.amount) || existing.amount,
				fee: checked.fee || Number(parsed.fee) || 0,
				providerUuid: checked.uuid,
				rawCallback: raw
			},
			url.origin
		);
	} catch (e) {
		console.error('[winpay-callback]', e);
	}
	return respond();
};
