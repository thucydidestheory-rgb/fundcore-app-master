// worker-wa: pengiriman WhatsApp via antrean — rate limit per nomor CS,
// jeda acak, retry backoff, sticky nomor per donasi (PRD §6.5).
//   dokku ps:scale fundcore worker-wa=1
import { loadDb, saveDb, now, sleep, log } from './lib.js';

const MOCK = (process.env.WAHA_MOCK ?? 'true') !== 'false';
const NAME = 'worker-wa';
const MIN_INTERVAL_MS = parseInt(process.env.WA_MIN_INTERVAL_MS || '6000', 10); // ±10 pesan/mnt/nomor
const lastSent = new Map();

async function sendLive(acc, to, text) {
	const res = await fetch(`${acc.baseUrl.replace(/\/$/, '')}/api/sendText`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'X-Api-Key': acc.apiKey },
		body: JSON.stringify({ session: acc.session, chatId: `${to}@c.us`, text }),
		signal: AbortSignal.timeout(15000)
	});
	if (!res.ok) throw new Error(`WAHA ${res.status}`);
}

async function tick() {
	const db = loadDb();
	const t = now();
	const due = db.waMessages
		.filter((m) => m.status === 'queued' && m.scheduledAt <= t)
		.sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1))
		.slice(0, 5);
	if (!due.length) return;
	let changed = false;
	for (const m of due) {
		const d = db.donations.find((x) => x.id === m.donationId);
		if (m.type === 'followup' && d && d.status !== 'pending' && d.status !== 'created') {
			m.status = 'cancelled';
			changed = true;
			continue;
		}
		// Rate limit per nomor CS + jeda acak 0–4 dtk.
		const acc = db.waAccounts.find((a) => a.id === m.waAccountId);
		const since = Date.now() - (lastSent.get(m.waAccountId ?? '') ?? 0);
		if (since < MIN_INTERVAL_MS) continue;
		await sleep(Math.floor(Math.random() * 4000));
		m.status = 'sending';
		m.attempts += 1;
		try {
			if (MOCK || !acc?.baseUrl) {
				log(NAME, `mock→${m.toPhone} [${m.type}]`, m.payload.slice(0, 80));
			} else {
				await sendLive(acc, m.toPhone, m.payload);
			}
			m.status = 'sent';
			m.sentAt = now();
			m.error = null;
			lastSent.set(m.waAccountId ?? '', Date.now());
		} catch (e) {
			m.error = e.message;
			if (m.attempts >= 5) m.status = 'failed';
			else {
				m.status = 'queued';
				m.scheduledAt = new Date(Date.now() + m.attempts * 60_000).toISOString();
			}
			log(NAME, 'gagal', m.id, e.message);
		}
		changed = true;
	}
	if (changed) saveDb(db);
}

log(NAME, `start (mode=${MOCK ? 'mock' : 'live'}, interval=${MIN_INTERVAL_MS}ms)`);
for (;;) {
	try {
		await tick();
	} catch (e) {
		log(NAME, 'error', e.message);
	}
	await sleep(10_000);
}
