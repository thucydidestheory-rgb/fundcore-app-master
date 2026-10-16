import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { loadDb, saveDb } from '$lib/server/store';
import { getUserFromCookies, can, audit } from '$lib/server/auth';
import { winpayMode } from '$lib/server/winpay';

export const load: PageServerLoad = async () => {
	const db = loadDb();
	return {
		mode: winpayMode(),
		env: process.env.WINPAY_ENV ?? 'sandbox',
		maskedKey: process.env.WINPAY_API_KEY ? '••••' + process.env.WINPAY_API_KEY.slice(-4) : '(belum diatur)',
		hasSecret: !!(process.env.WINPAY_API_SECRET || process.env.WINPAY_CALLBACK_SECRET),
		channelNote: db.contents.paymentNote,
		recon: recentRecon()
	};
};

function recentRecon() {
	// Ringkasan rekonsiliasi: pending lama vs paid hari ini.
	const db = loadDb();
	const pending = db.donations.filter((d) => d.status === 'pending' || d.status === 'created');
	return {
		pendingCount: pending.length,
		pendingAmount: pending.reduce((s, d) => s + d.amount, 0),
		paidToday: db.donations
			.filter((d) => d.status === 'paid' && (d.paidAt ?? '').slice(0, 10) === new Date().toISOString().slice(0, 10))
			.reduce((s, d) => s + d.amount, 0)
	};
}

export const actions: Actions = {
	simpan: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		const p = z.object({ channelNote: z.string().max(2000).default('') }).safeParse(fd);
		if (!p.success) return fail(400, { message: 'Catatan tidak valid.' });
		const db = loadDb();
		db.contents.paymentNote = p.data.channelNote;
		audit(db, u, 'payment.note.save', 'payment', null, {}, getClientAddress());
		saveDb(db);
		return { ok: true, message: 'Catatan channel tersimpan. Kredensial diatur via env Dokku (lihat .env.example).' };
	}
};
