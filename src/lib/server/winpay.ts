// Adapter Winpay Checkout Page — PRD §6.4.
// Mode mock (default, WINPAY_MOCK=true): invoice dibuat lokal & dibayar lewat
// halaman simulasi /mock-winpay/pay/{ref} — cocok untuk demo & E2E sandbox.
// Mode live: memanggil Checkout Page API resmi (header X-Winpay-Timestamp GMT+7,
// X-Winpay-Signature, X-Winpay-Key). Daftar channel aktif & biaya diverifikasi
// di dashboard Winpay (docs.winpay.id) saat implementasi.
import { createHmac } from 'node:crypto';

const MOCK = (process.env.WINPAY_MOCK ?? 'true') !== 'false';
const BASE =
	process.env.WINPAY_BASE_URL ||
	(process.env.WINPAY_ENV === 'production'
		? 'https://checkout.winpay.id'
		: 'https://sandbox-checkout.winpay.id');

export function winpayMode(): 'mock' | 'live' {
	return MOCK ? 'mock' : 'live';
}

function gmt7Timestamp(): string {
	const now = new Date(Date.now() + 7 * 3600_000);
	return now.toISOString().replace('T', ' ').slice(0, 19);
}

function signature(secret: string, timestamp: string, body: string): string {
	return createHmac('sha256', secret).update(timestamp + body).digest('hex');
}

export interface CreateInvoiceInput {
	ref: string;
	amount: number;
	customerName: string;
	customerPhone: string;
	customerEmail?: string | null;
	backUrl: string;
	intervalMin: number;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<{
	redirectUrl: string;
	invoiceId: string;
	raw: string;
}> {
	if (MOCK) {
		return {
			redirectUrl: `/mock-winpay/pay/${input.ref}`,
			invoiceId: `mock_${input.ref}`,
			raw: JSON.stringify({ mock: true, ref: input.ref, amount: input.amount })
		};
	}
	const key = process.env.WINPAY_API_KEY ?? '';
	const secret = process.env.WINPAY_API_SECRET ?? '';
	if (!key || !secret) throw new Error('Kredensial Winpay belum diatur (lihat Pengaturan Pembayaran).');
	const ts = gmt7Timestamp();
	const body = JSON.stringify({
		customer: {
			name: input.customerName,
			phone: input.customerPhone,
			email: input.customerEmail ?? ''
		},
		invoice: { ref: input.ref, back_url: input.backUrl, interval: input.intervalMin },
		products: [{ name: 'Donasi', price: input.amount, qty: 1 }]
	});
	const res = await fetch(`${BASE}/api/create`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Winpay-Timestamp': ts,
			'X-Winpay-Signature': signature(secret, ts, body),
			'X-Winpay-Key': key
		},
		body
	});
	const raw = await res.text();
	if (!res.ok) throw new Error(`Winpay create invoice gagal (${res.status}): ${raw.slice(0, 300)}`);
	const json = JSON.parse(raw) as { data?: { redirect_url?: string; uuid?: string } };
	const redirectUrl = json.data?.redirect_url;
	if (!redirectUrl) throw new Error('Respons Winpay tanpa redirect_url: ' + raw.slice(0, 300));
	return { redirectUrl, invoiceId: json.data?.uuid ?? input.ref, raw };
}

export interface WinpayStatus {
	found: boolean;
	status: 'paid' | 'pending' | 'expired' | 'failed';
	channel: string | null;
	amount: number;
	fee: number;
	uuid: string | null;
	raw: string;
}

/** Konfirmasi ulang status ke Winpay (Find Invoice By Merchant Ref) — wajib
 *  sebelum donasi ditandai paid (PRD F-33). */
export async function findInvoiceByRef(
	ref: string,
	local: { status: string; channel: string | null; amount: number; fee: number; uuid: string | null }
): Promise<WinpayStatus> {
	if (MOCK) {
		const paid = local.status === 'paid_simulated' || local.status === 'paid';
		return {
			found: true,
			status: paid ? 'paid' : 'pending',
			channel: local.channel ?? (paid ? 'QRIS' : null),
			amount: local.amount,
			fee: local.fee,
			uuid: local.uuid ?? `mock_${ref}`,
			raw: JSON.stringify({ mock: true, ref })
		};
	}
	const key = process.env.WINPAY_API_KEY ?? '';
	const secret = process.env.WINPAY_API_SECRET ?? '';
	const ts = gmt7Timestamp();
	const body = JSON.stringify({ merchant_ref: ref });
	const res = await fetch(`${BASE}/api/invoice/merchant-ref`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Winpay-Timestamp': ts,
			'X-Winpay-Signature': signature(secret, ts, body),
			'X-Winpay-Key': key
		},
		body
	});
	const raw = await res.text();
	if (!res.ok) return { found: false, status: 'pending', channel: null, amount: 0, fee: 0, uuid: null, raw };
	const j = JSON.parse(raw) as {
		data?: { status?: string; channel?: string; amount?: number; fee?: number; uuid?: string };
	};
	const st = (j.data?.status ?? '').toLowerCase();
	return {
		found: true,
		status: st.includes('paid') || st.includes('success') ? 'paid' : 'pending',
		channel: j.data?.channel ?? null,
		amount: j.data?.amount ?? 0,
		fee: j.data?.fee ?? 0,
		uuid: j.data?.uuid ?? null,
		raw
	};
}

export async function deleteInvoice(ref: string): Promise<void> {
	if (MOCK) return;
	const key = process.env.WINPAY_API_KEY ?? '';
	const secret = process.env.WINPAY_API_SECRET ?? '';
	if (!key) return;
	const ts = gmt7Timestamp();
	const body = JSON.stringify({ merchant_ref: ref });
	await fetch(`${BASE}/api/invoice/delete`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Winpay-Timestamp': ts,
			'X-Winpay-Signature': signature(secret, ts, body),
			'X-Winpay-Key': key
		},
		body
	}).catch(() => undefined);
}
