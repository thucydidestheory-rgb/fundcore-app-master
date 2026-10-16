// worker-pay: jalur uang — kedaluwarsa donasi, konfirmasi status ke Winpay,
// rekonsiliasi pending. Process Dokku terpisah agar tidak antre (PRD §5).
//   dokku ps:scale fundcore worker-pay=1
import { loadDb, saveDb, now, sleep, calcFees, log } from './lib.js';

const MOCK = (process.env.WINPAY_MOCK ?? 'true') !== 'false';
const NAME = 'worker-pay';
const SECRET = process.env.WINPAY_API_SECRET || '';
const KEY = process.env.WINPAY_API_KEY || '';
const BASE =
	process.env.WINPAY_BASE_URL ||
	(process.env.WINPAY_ENV === 'production' ? 'https://checkout.winpay.id' : 'https://sandbox-checkout.winpay.id');

function finalizePaid(db, d, channel, fee, uuid, raw) {
	if (d.status === 'paid') return false;
	const fees = calcFees(d.amount, fee, db.site.platformFeePct);
	Object.assign(d, {
		status: 'paid', channel, amount: fees.gross, gatewayFee: fees.gatewayFee,
		platformFee: fees.platformFee, netAmount: fees.net, paidAt: now()
	});
	const pay = db.payments.find((p) => p.donationId === d.id);
	if (pay) {
		pay.status = 'paid';
		pay.providerUuid = uuid;
		pay.rawCallback = String(raw).slice(0, 4000);
		pay.updatedAt = now();
	}
	const c = db.campaigns.find((x) => x.id === d.campaignId);
	if (c) {
		c.collectedAmount += fees.gross;
		c.donorCount += 1;
		c.lastDonationAt = d.paidAt;
	}
	for (const m of db.waMessages) {
		if (m.donationId === d.id && m.type === 'followup' && (m.status === 'queued' || m.status === 'failed')) m.status = 'cancelled';
	}
	return true;
}

async function confirmLive(ref) {
	// Find Invoice By Merchant Ref (live) — cocokkan dengan docs.winpay.id.
	const ts = new Date(Date.now() + 7 * 3600_000).toISOString().replace('T', ' ').slice(0, 19);
	const body = JSON.stringify({ merchant_ref: ref });
	const { createHmac } = await import('node:crypto');
	const sig = createHmac('sha256', SECRET).update(ts + body).digest('hex');
	const res = await fetch(`${BASE}/api/invoice/merchant-ref`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'X-Winpay-Timestamp': ts, 'X-Winpay-Signature': sig, 'X-Winpay-Key': KEY },
		body,
		signal: AbortSignal.timeout(15000)
	});
	if (!res.ok) return null;
	const j = await res.json().catch(() => null);
	const st = (j?.data?.status ?? '').toLowerCase();
	return {
		paid: st.includes('paid') || st.includes('success'),
		channel: j?.data?.channel ?? null,
		amount: j?.data?.amount ?? 0,
		fee: j?.data?.fee ?? 0,
		uuid: j?.data?.uuid ?? null,
		raw: JSON.stringify(j).slice(0, 2000)
	};
}

async function tick() {
	const db = loadDb();
	let changed = false;
	const t = now();
	// 1) Kedaluwarsa.
	for (const d of db.donations) {
		if ((d.status === 'pending' || d.status === 'created') && d.expiredAt <= t) {
			d.status = 'expired';
			for (const m of db.waMessages) if (m.donationId === d.id && m.status === 'queued') m.status = 'cancelled';
			changed = true;
			log(NAME, 'expired', d.invoiceRef);
		}
	}
	// 2) Rekonsiliasi live: pending >5 menit dikonfirmasi ulang ke Winpay.
	if (!MOCK && KEY && SECRET) {
		const due = db.donations.filter(
			(d) => (d.status === 'pending' || d.status === 'created') && Date.now() - new Date(d.createdAt).getTime() > 5 * 60_000
		).slice(0, 10);
		for (const d of due) {
			try {
				const r = await confirmLive(d.invoiceRef);
				if (r?.paid && finalizePaid(db, d, r.channel ?? 'QRIS', r.fee, r.uuid, r.raw)) {
					changed = true;
					log(NAME, 'reconciled paid', d.invoiceRef);
				}
			} catch (e) {
				log(NAME, 'confirm gagal', d.invoiceRef, e.message);
			}
		}
	}
	if (changed) saveDb(db);
}

log(NAME, `start (mode=${MOCK ? 'mock' : 'live'})`);
for (;;) {
	try {
		await tick();
	} catch (e) {
		log(NAME, 'error', e.message);
	}
	await sleep(15_000);
}
