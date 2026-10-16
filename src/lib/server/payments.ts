// Logika inti pembayaran: finalisasi donasi menjadi `paid` secara idempotent.
// Dipakai oleh: endpoint callback web (enqueue → proses async), worker-pay
// (process terpisah di Dokku), dan job rekonsiliasi. PRD §6.4, §11.
import { updateDb, nextId, isoNow } from './store';
import { calcFees } from './fees';
import { fillTemplate, normalizePhone } from '$lib/format';
import type { DbShape, Donation } from '$lib/types';

export interface FinalizeInput {
	invoiceRef: string;
	channel: string;
	amount: number;
	fee: number;
	providerUuid: string | null;
	rawCallback: string;
}

/** Idempotent: callback ganda dengan ref sama tidak menggandakan donasi. */
export function finalizePaid(input: FinalizeInput, siteUrl: string): { ok: boolean; already: boolean; donationId: string | null } {
	return updateDb((db: DbShape) => {
		const d = db.donations.find((x) => x.invoiceRef === input.invoiceRef);
		if (!d) return { ok: false, already: false, donationId: null };
		if (d.status === 'paid') return { ok: true, already: true, donationId: d.id };
		// Hanya pending/created yang bisa jadi paid (invoice kedaluwarsa tak bisa dibayar).
		if (d.status !== 'pending' && d.status !== 'created') return { ok: false, already: false, donationId: d.id };

		const fees = calcFees(input.amount > 0 ? input.amount : d.amount, input.fee, db.site.platformFeePct);
		d.status = 'paid';
		d.channel = input.channel;
		d.amount = fees.gross;
		d.gatewayFee = fees.gatewayFee;
		d.platformFee = fees.platformFee;
		d.netAmount = fees.net;
		d.paidAt = isoNow();

		const pay = db.payments.find((p) => p.donationId === d.id);
		if (pay) {
			pay.status = 'paid';
			pay.providerUuid = input.providerUuid;
			pay.rawCallback = input.rawCallback.slice(0, 4000);
			pay.updatedAt = isoNow();
		}

		// Counter denormalisasi — halaman publik tidak pernah SUM() (PRD §9.2).
		const c = db.campaigns.find((x) => x.id === d.campaignId);
		if (c) {
			c.collectedAmount += fees.gross;
			c.donorCount += 1;
			c.lastDonationAt = d.paidAt;
		}

		// Batalkan follow-up pending donasi ini; jadwalkan pesan sukses.
		for (const m of db.waMessages) {
			if (m.donationId === d.id && m.type === 'followup' && (m.status === 'queued' || m.status === 'failed')) {
				m.status = 'cancelled';
			}
		}
		queueWaMessage(db, d, 'success', siteUrl);

		// Rollup harian (diringkas worker-batch; di sini update cepat juga).
		if (d.paidAt) bumpDayStat(db, d.paidAt.slice(0, 10), fees.gross, fees.gatewayFee, fees.platformFee, fees.net);

		return { ok: true, already: false, donationId: d.id };
	});
}


/** Expire semua pending yang lewat batas; kembalikan jumlahnya. */
export function expireOverdue(nowIso = isoNow()): number {
	return updateDb((db) => {
		let n = 0;
		for (const d of db.donations) {
			if ((d.status === 'pending' || d.status === 'created') && d.expiredAt <= nowIso) {
				d.status = 'expired';
				for (const m of db.waMessages) {
					if (m.donationId === d.id && m.status === 'queued') m.status = 'cancelled';
				}
				n++;
			}
		}
		return n;
	});
}

function bumpDayStat(
	db: DbShape,
	day: string,
	gross: number,
	gw: number,
	pf: number,
	net: number
) {
	let s = db.statsDaily.find((x) => x.day === day);
	if (!s) {
		s = { day, gross: 0, gatewayFee: 0, platformFee: 0, net: 0, count: 0, paidCount: 0, views: 0, checkouts: 0 };
		db.statsDaily.push(s);
	}
	s.gross += gross;
	s.gatewayFee += gw;
	s.platformFee += pf;
	s.net += net;
	s.paidCount += 1;
	s.count += 1;
}

export function bumpViews(db: DbShape, day: string, field: 'views' | 'checkouts', n = 1) {
	let s = db.statsDaily.find((x) => x.day === day);
	if (!s) {
		s = { day, gross: 0, gatewayFee: 0, platformFee: 0, net: 0, count: 0, paidCount: 0, views: 0, checkouts: 0 };
		db.statsDaily.push(s);
	}
	s[field] += n;
}

/**
 * Antrekan WhatsApp: pilih nomor CS round-robin lalu kunci (sticky) ke donasi.
 * Seluruh pesan donasi itu keluar dari nomor yang sama (PRD §6.5).
 */
export function queueWaMessage(
	db: DbShape,
	d: Donation,
	type: 'created' | 'success' | 'followup',
	siteUrl: string
): void {
	const setting = db.waSettings.find((s) => s.type === type);
	if (!setting || !setting.isActive) return;
	if (!normalizePhone(d.donorPhone)) return;

	let accountId = d.waAccountId;
	if (!accountId) {
		const active = db.waAccounts.filter((a) => a.isActive && a.status !== 'disconnected');
		const pool = active.length ? active : db.waAccounts.filter((a) => a.isActive);
		if (!pool.length) return;
		// Round-robin sederhana: pilih akun dengan pesan terkirim paling sedikit.
		const counts = new Map<string, number>();
		for (const m of db.waMessages) counts.set(m.waAccountId ?? '', (counts.get(m.waAccountId ?? '') ?? 0) + 1);
		pool.sort((a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0));
		accountId = pool[0].id;
		d.waAccountId = accountId; // sticky
	}
	const account = db.waAccounts.find((a) => a.id === accountId);
	const campaign = db.campaigns.find((c) => c.id === d.campaignId);
	const vars = {
		nama: d.isAnonymous ? 'Orang Baik' : d.donorName,
		nominal: d.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
		campaign: campaign?.title ?? '',
		link_bayar: d.invoiceUrl ?? `${siteUrl}/terima-kasih/${d.id}`,
		link_riwayat: `${siteUrl}/riwayat/${d.historyToken}`,
		batas_bayar: new Date(d.expiredAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
		link_campaign: `${siteUrl}/c/${campaign?.slug ?? ''}`,
		nama_cs: account?.profileName ?? account?.label ?? ''
	};
	const text = fillTemplate(setting.template, vars, db.site.siteName);
	const delayMs = type === 'followup' ? setting.delayMinutes * 60000 : type === 'success' ? 5000 : 15000;
	db.waMessages.push({
		id: nextId(db, 'wam'),
		donationId: d.id,
		type,
		waAccountId: accountId,
		toPhone: normalizePhone(d.donorPhone)!,
		payload: text,
		status: 'queued',
		attempts: 0,
		scheduledAt: new Date(Date.now() + delayMs).toISOString(),
		sentAt: null,
		error: null
	});
}

/** Ambil pesan jatuh tempo & kirim lewat adapter; dipakai web sweeper & worker-wa. */
export async function sendDueMessages(
	db: DbShape,
	send: (accountId: string | null, to: string, text: string) => Promise<{ ok: boolean; error?: string }>,
	limit = 10
): Promise<{ sent: number; failed: number }> {
	const now = isoNow();
	const due = db.waMessages
		.filter((m) => m.status === 'queued' && m.scheduledAt <= now)
		.sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1))
		.slice(0, limit);
	let sent = 0;
	let failed = 0;
	for (const m of due) {
		// Jangan kirim followup bila donasi sudah paid/expired.
		const d = db.donations.find((x) => x.id === m.donationId);
		if (m.type === 'followup' && d && d.status !== 'pending' && d.status !== 'created') {
			m.status = 'cancelled';
			continue;
		}
		m.status = 'sending';
		m.attempts += 1;
		const r = await send(m.waAccountId, m.toPhone, m.payload);
		if (r.ok) {
			m.status = 'sent';
			m.sentAt = isoNow();
			m.error = null;
			sent++;
		} else {
			m.error = r.error ?? 'gagal';
			if (m.attempts >= 5) {
				m.status = 'failed';
				failed++;
			} else {
				m.status = 'queued'; // retry dengan backoff
				m.scheduledAt = new Date(Date.now() + m.attempts * 60000).toISOString();
			}
		}
	}
	return { sent, failed };
}

export type { Donation };
