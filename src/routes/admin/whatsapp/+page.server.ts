import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { loadDb, saveDb, nextId, isoNow, updateDb } from '$lib/server/store';
import { getUserFromCookies, can, audit } from '$lib/server/auth';
import { sendText, checkSession } from '$lib/server/waha';

export const load: PageServerLoad = async () => {
	const db = loadDb();
	return {
		accounts: db.waAccounts,
		settings: db.waSettings,
		logs: db.waMessages.slice(0, 60).map((m) => ({
			...m,
			payload: m.payload.slice(0, 140)
		})),
		site: { invoiceHours: db.site.invoiceExpiryHours, followupMin: db.site.followupDelayMinutes }
	};
};

export const actions: Actions = {
	simpanAkun: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		const p = z.object({
			id: z.string().optional(),
			label: z.string().trim().min(2).max(60),
			baseUrl: z.string().trim().max(200).default(''),
			session: z.string().trim().min(1).max(60),
			apiKey: z.string().max(300).default('')
		}).safeParse(fd);
		if (!p.success) return fail(400, { message: 'Label, session wajib diisi.' });
		const db = loadDb();
		if (p.data.id) {
			const a = db.waAccounts.find((x) => x.id === p.data.id);
			if (!a) return fail(404, { message: 'Tidak ditemukan.' });
			Object.assign(a, { label: p.data.label, baseUrl: p.data.baseUrl.replace(/\/$/, ''), session: p.data.session });
			if (p.data.apiKey) a.apiKey = p.data.apiKey; // kosong = tidak diubah
			a.lastCheckedAt = isoNow();
		} else {
			db.waAccounts.push({
				id: nextId(db, 'waa'), label: p.data.label, baseUrl: p.data.baseUrl.replace(/\/$/, ''),
				session: p.data.session, apiKey: p.data.apiKey, phone: null, profileName: null,
				status: 'disconnected', isActive: true, lastCheckedAt: null
			});
		}
		audit(db, u, 'wa.account.save', p.data.id ?? 'baru', null, { label: p.data.label }, getClientAddress());
		saveDb(db);
		return { ok: true };
	},
	toggleAkun: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		const db = loadDb();
		const a = db.waAccounts.find((x) => x.id === String(fd.id ?? ''));
		if (!a) return fail(404, { message: 'Tidak ditemukan.' });
		a.isActive = !a.isActive;
		audit(db, u, 'wa.account.toggle', a.id, null, { isActive: a.isActive }, getClientAddress());
		saveDb(db);
		return { ok: true };
	},
	tesKoneksi: async ({ request, cookies }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		const db = loadDb();
		const a = db.waAccounts.find((x) => x.id === String(fd.id ?? ''));
		if (!a) return fail(404, { message: 'Tidak ditemukan.' });
		const r = await checkSession(a);
		a.status = r.status;
		a.phone = r.phone;
		a.profileName = r.profileName;
		a.lastCheckedAt = isoNow();
		saveDb(db);
		return { ok: true, hasil: `${r.status} · ${r.profileName ?? '-'} · ${r.phone ?? '-'}` };
	},
	tesKirim: async ({ request, cookies }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		const to = String(fd.to ?? '');
		const db = loadDb();
		const a = db.waAccounts.find((x) => x.id === String(fd.id ?? ''));
		if (!a) return fail(404, { message: 'Tidak ditemukan.' });
		const r = await sendText(a, to, `Tes dari ${db.site.siteName} — koneksi WA OK ✅`);
		return r.ok ? { ok: true, hasil: 'Terkirim (cek log / WA tujuan).' } : fail(400, { message: r.error ?? 'Gagal.' });
	},
	simpanTemplate: async ({ request, cookies, getClientAddress }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		const db = loadDb();
		for (const t of ['created', 'success', 'followup'] as const) {
			const s = db.waSettings.find((x) => x.type === t);
			if (!s) continue;
			s.isActive = fd[`on_${t}`] === 'on';
			const tpl = String(fd[`tpl_${t}`] ?? '');
			if (tpl.trim()) s.template = tpl.slice(0, 1000);
		}
		const delay = parseInt(String(fd.followupDelay ?? ''), 10);
		if (Number.isFinite(delay)) {
			if (delay < 15 || delay > 1440)
				return fail(400, { message: 'Jeda follow-up harus 15–1440 menit.' });
			const invoiceMin = db.site.invoiceExpiryHours * 60;
			if (delay >= invoiceMin)
				return fail(400, { message: `Jeda follow-up (${delay} mnt) harus lebih pendek dari masa invoice (${invoiceMin} mnt).` });
		}
		// Validasi lolos → simpan semuanya dalam satu langkah (tidak ada state setengah tersimpan).
		if (Number.isFinite(delay)) {
			db.waSettings.find((x) => x.type === 'followup')!.delayMinutes = delay;
			db.site.followupDelayMinutes = delay;
		}
		audit(db, u, 'wa.settings.save', 'wa_settings', null, { delay }, getClientAddress());
		saveDb(db);
		return { ok: true };
	},
	kirimUlang: async ({ request, cookies }) => {
		const u = getUserFromCookies(cookies)!;
		if (!can(u, 'manage')) return fail(403, { message: 'Butuh peran Operator.' });
		const fd = Object.fromEntries(await request.formData());
		updateDb((db) => {
			const m = db.waMessages.find((x) => x.id === String(fd.id ?? ''));
			if (m && (m.status === 'failed' || m.status === 'cancelled')) {
				m.status = 'queued';
				m.attempts = 0;
				m.scheduledAt = isoNow();
				m.error = null;
			}
		});
		return { ok: true };
	}
};
