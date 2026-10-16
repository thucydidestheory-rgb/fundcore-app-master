// worker-batch: pekerjaan berat yang boleh lambat — self-heal counter campaign,
// rollup statistik, bersih-bersih sesi & export lama (PRD §9.2).
//   dokku ps:scale fundcore worker-batch=1
import { readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadDb, saveDb, DATA_DIR, sleep, log } from './lib.js';

const NAME = 'worker-batch';

function rollup(db) {
	// Hitung ulang counter dari donasi paid (sumber kebenaran).
	let fixed = 0;
	for (const c of db.campaigns) {
		const paid = db.donations.filter((d) => d.campaignId === c.id && d.status === 'paid');
		const gross = paid.reduce((s, d) => s + d.amount, 0);
		if (c.collectedAmount !== gross || c.donorCount !== paid.length) {
			c.collectedAmount = gross;
			c.donorCount = paid.length;
			c.lastDonationAt = paid.length ? paid.map((d) => d.paidAt).sort().at(-1) : null;
			fixed++;
		}
	}
	// Rollup harian dari donasi paid.
	const map = new Map(db.statsDaily.map((s) => [s.day, s]));
	for (const d of db.donations) {
		if (d.status !== 'paid' || !d.paidAt) continue;
		const day = d.paidAt.slice(0, 10);
		let s = map.get(day);
		if (!s) {
			s = { day, gross: 0, gatewayFee: 0, platformFee: 0, net: 0, count: 0, paidCount: 0, views: 0, checkouts: 0 };
			map.set(day, s);
			db.statsDaily.push(s);
		}
	}
	db.statsDaily.sort((a, b) => (a.day < b.day ? -1 : 1));
	db.statsDaily = db.statsDaily.slice(-365);
	// Bersihkan sesi >30 hari & batasi audit log.
	const cutoff = Date.now() - 30 * 86400_000;
	const s0 = db.sessions.length;
	db.sessions = db.sessions.filter((s) => new Date(s.createdAt).getTime() > cutoff);
	db.auditLogs = db.auditLogs.slice(0, 500);
	// Hapus export >7 hari.
	try {
		const dir = join(DATA_DIR, 'exports');
		if (existsSync(dir)) {
			for (const f of readdirSync(dir)) {
				const p = join(dir, f);
				if (Date.now() - statSync(p).mtimeMs > 7 * 86400_000) unlinkSync(p);
			}
		}
	} catch { /* abaikan */ }
	return { fixed, sessionsDropped: s0 - db.sessions.length };
}

log(NAME, 'start');
for (;;) {
	try {
		const db = loadDb();
		const r = rollup(db);
		saveDb(db);
		if (r.fixed || r.sessionsDropped) log(NAME, 'rollup', r);
		else log(NAME, 'rollup ok');
	} catch (e) {
		log(NAME, 'error', e.message);
	}
	await sleep(5 * 60_000);
}
