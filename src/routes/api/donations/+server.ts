import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { loadDb, updateDb, nextId, isoNow } from '$lib/server/store';
import { normalizePhone } from '$lib/format';
import { createInvoice } from '$lib/server/winpay';
import { queueWaMessage, bumpViews } from '$lib/server/payments';
import { randomBytes } from 'node:crypto';

const Body = z.object({
	campaignId: z.string().min(1),
	amount: z.number().int().min(1).max(1_000_000_000),
	donorName: z.string().trim().min(2).max(80),
	donorPhone: z.string().trim().min(9).max(18),
	donorEmail: z.string().trim().email().max(120).nullable().optional(),
	isAnonymous: z.boolean().default(false),
	prayer: z.string().trim().max(500).nullable().optional(),
	utmSource: z.string().max(80).nullable().optional()
});

// Rate limit: maks 10 donasi / 10 menit / IP (anti spam & card testing, PRD §9.3).
const hits = new Map<string, number[]>();

// POST /api/donations — buat donasi + invoice Winpay (PRD F-10..F-14).
export const POST: RequestHandler = async ({ request, url, getClientAddress }) => {
	const ip = getClientAddress();
	const now = Date.now();
	const arr = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
	if (arr.length >= 10) return json({ message: 'Terlalu banyak percobaan. Tunggu beberapa menit.' }, { status: 429 });
	arr.push(now);
	hits.set(ip, arr);

	let body: z.infer<typeof Body>;
	try {
		body = Body.parse(await request.json());
	} catch {
		return json({ message: 'Data donasi tidak valid.' }, { status: 400 });
	}
	const db = loadDb();
	const c = db.campaigns.find((x) => x.id === body.campaignId && x.status === 'active');
	if (!c) return json({ message: 'Campaign tidak aktif.' }, { status: 400 });
	if (new Date(c.endAt).getTime() < Date.now())
		return json({ message: 'Campaign sudah berakhir. Terima kasih atas niat baiknya.' }, { status: 400 });
	if (body.amount < db.site.minDonation)
		return json({ message: `Nominal minimum ${db.site.minDonation}.` }, { status: 400 });
	const phone62 = normalizePhone(body.donorPhone);
	if (!phone62) return json({ message: 'Nomor WhatsApp tidak valid.' }, { status: 400 });

	const siteUrl = process.env.ORIGIN || url.origin;
	const invoiceRef = `INV-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
	const expiredAt = new Date(Date.now() + db.site.invoiceExpiryHours * 3600_000).toISOString();

	let inv: { redirectUrl: string; invoiceId: string; raw: string };
	try {
		inv = await createInvoice({
			ref: invoiceRef,
			amount: body.amount,
			customerName: body.donorName,
			customerPhone: phone62,
			customerEmail: body.donorEmail ?? null,
			backUrl: `${siteUrl}/terima-kasih/${invoiceRef}`,
			intervalMin: db.site.invoiceExpiryHours * 60
		});
	} catch (e) {
		return json({ message: e instanceof Error ? e.message : 'Payment gateway sibuk.' }, { status: 502 });
	}

	const created = updateDb((d) => {
		const id = nextId(d, 'don');
		const donation = {
			id,
			campaignId: c.id,
			donorName: body.donorName,
			donorPhone: phone62,
			donorEmail: body.donorEmail ?? null,
			amount: body.amount,
			isAnonymous: body.isAnonymous,
			prayer: body.prayer ?? null,
			aamiinCount: 0,
			status: 'pending' as const,
			channel: null,
			invoiceRef,
			invoiceUrl: new URL(inv.redirectUrl, siteUrl).toString(),
			waAccountId: null,
			gatewayFee: 0,
			platformFee: 0,
			netAmount: 0,
			utmSource: body.utmSource ?? null,
			historyToken: randomBytes(16).toString('hex'),
			createdAt: isoNow(),
			paidAt: null,
			expiredAt
		};
		d.donations.unshift(donation);
		d.payments.unshift({
			id: nextId(d, 'pay'),
			donationId: id,
			provider: 'winpay' as const,
			providerUuid: inv.invoiceId,
			status: 'pending',
			rawRequest: inv.raw.slice(0, 4000),
			rawCallback: null,
			createdAt: isoNow(),
			updatedAt: isoNow()
		});
		// Funnel checkout + antre WA (dibuat & followup 2 jam).
		bumpViews(d, isoNow().slice(0, 10), 'checkouts', 1);
		queueWaMessage(d, donation, 'created', siteUrl);
		queueWaMessage(d, donation, 'followup', siteUrl);
		return { id, token: donation.historyToken };
	});

	return json({ ok: true, donationId: created.id, historyToken: created.token, redirectUrl: inv.redirectUrl }, { status: 201 });
};
