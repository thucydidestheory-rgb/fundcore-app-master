import { fail } from '@sveltejs/kit';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Actions, PageServerLoad } from './$types';
import { loadDb, saveDb, nextId, DATA_DIR } from '$lib/server/store';
import { getUserFromCookies, can, audit } from '$lib/server/auth';

const EXPORT_DIR = join(DATA_DIR, 'exports');

export const load: PageServerLoad = async ({ url }) => {
	const db = loadDb();
	const status = url.searchParams.get('status') ?? '';
	const q = (url.searchParams.get('q') ?? '').toLowerCase();
	let list = [...db.donations].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
	if (status) list = list.filter((d) => d.status === status);
	if (q) list = list.filter((d) => (d.donorName + d.invoiceRef).toLowerCase().includes(q));
	const items = list.slice(0, 100).map((d) => ({
		...d,
		campaignTitle: db.campaigns.find((c) => c.id === d.campaignId)?.title ?? d.campaignId
	}));
	return { items, total: list.length, status, q };
};

export const actions: Actions = {
	// Export CSV sebagai job: file ditulis ke data/exports + link unduh (PRD D-03).
	export: async ({ cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'finance')) return fail(403, { message: 'Butuh peran Finance/Operator.' });
		const db = loadDb();
		const rows = [
			'id,campaign,donatur,phone,amount,channel,gateway_fee,platform_fee,net,status,paid_at,utm'
		];
		for (const d of db.donations) {
			const c = db.campaigns.find((x) => x.id === d.campaignId)?.title ?? d.campaignId;
			rows.push(
				[d.id, `"${c.replace(/"/g, '""')}"`, `"${d.donorName}"`, d.donorPhone, d.amount, d.channel ?? '', d.gatewayFee, d.platformFee, d.netAmount, d.status, d.paidAt ?? '', d.utmSource ?? ''].join(',')
			);
		}
		mkdirSync(EXPORT_DIR, { recursive: true });
		const fname = `donasi-${new Date().toISOString().slice(0, 10)}-${nextId(db, 'exp')}.csv`;
		writeFileSync(join(EXPORT_DIR, fname), rows.join('\n'));
		audit(db, u, 'donations.export', 'donations', null, { file: fname, rows: rows.length - 1 }, getClientAddress());
		saveDb(db);
		return { ok: true, file: fname, rows: rows.length - 1 };
	}
};
