// Sweeper dalam proses `web`: membuat `npm run dev` jalan mandiri tanpa worker.
// Di Dokku, tugas ini diambil alih process worker-pay / worker-wa / worker-batch
// (workers/*.js) yang berjalan sebagai container terpisah — sweeper ini otomatis
// nonaktif bila DISABLE_SWEEPER=true.
import { loadDb, saveDb } from './store';
import { expireOverdue, sendDueMessages } from './payments';
import { sendText } from './waha';
import type { WaAccount } from '$lib/types';

let started = false;

export function startSweeper(): void {
	if (started || process.env.DISABLE_SWEEPER === 'true') return;
	started = true;
	const tick = async () => {
		try {
			expireOverdue();
			const db = loadDb();
			const cancelledAwal = db.waMessages.filter((m) => m.status === 'cancelled').length;
			const accounts = new Map<string, WaAccount>(db.waAccounts.map((a) => [a.id, a]));
			const res = await sendDueMessages(
				db,
				async (accountId, to, text) => {
					const acc = (accountId && accounts.get(accountId)) || null;
					if (!acc) return { ok: false, error: 'akun WA tidak ada' };
					return sendText(acc, to, text);
				},
				10
			);
			// Expire/followup bisa mengubah status ke 'cancelled' — pastikan tersimpan.
			const cancelledAkhir = db.waMessages.filter((m) => m.status === 'cancelled').length;
			if (res.sent + res.failed > 0 || cancelledAkhir !== cancelledAwal) saveDb(db);
		} catch (e) {
			console.error('[sweeper]', e);
		}
	};
	setInterval(tick, 20_000);
	setTimeout(tick, 5_000);
}
