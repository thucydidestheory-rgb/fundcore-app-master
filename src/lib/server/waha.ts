// Adapter WAHA (WhatsApp HTTP API) — PRD §6.5.
// Mode mock (default, WAHA_MOCK=true): pesan dicatat ke wa_messages + console,
// bisa dilihat di Admin → WhatsApp → Log. Mode live: POST /api/sendText.
import { waChatId } from '$lib/format';
import type { WaAccount } from '$lib/types';

const MOCK = (process.env.WAHA_MOCK ?? 'true') !== 'false';

export function wahaMode(): 'mock' | 'live' {
	return MOCK ? 'mock' : 'live';
}

export async function sendText(
	account: WaAccount,
	toPhone62: string,
	text: string
): Promise<{ ok: boolean; error?: string }> {
	if (MOCK || !account.baseUrl) {
		return { ok: true };
	}
	try {
		const res = await fetch(`${account.baseUrl.replace(/\/$/, '')}/api/sendText`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Api-Key': account.apiKey },
			body: JSON.stringify({ session: account.session, chatId: waChatId(toPhone62), text }),
			signal: AbortSignal.timeout(15000)
		});
		if (!res.ok) return { ok: false, error: `WAHA ${res.status}: ${(await res.text()).slice(0, 200)}` };
		return { ok: true };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : 'fetch gagal' };
	}
}

export async function checkSession(account: WaAccount): Promise<{
	status: 'connected' | 'qr_needed' | 'disconnected';
	phone: string | null;
	profileName: string | null;
}> {
	if (MOCK || !account.baseUrl) {
		return {
			status: 'connected',
			phone: account.phone ?? '6281234567890',
			profileName: account.profileName ?? 'CS FundCore (mock)'
		};
	}
	try {
		const res = await fetch(
			`${account.baseUrl.replace(/\/$/, '')}/api/sessions/${encodeURIComponent(account.session)}`,
			{ headers: { 'X-Api-Key': account.apiKey }, signal: AbortSignal.timeout(10000) }
		);
		if (!res.ok) return { status: 'disconnected', phone: null, profileName: null };
		const j = (await res.json()) as { status?: string; me?: { id?: string; pushName?: string } };
		const st = (j.status ?? '').toUpperCase();
		if (st === 'WORKING') {
			const phone = (j.me?.id ?? '').split('@')[0] || null;
			return { status: 'connected', phone, profileName: j.me?.pushName ?? null };
		}
		if (st === 'SCAN_QR_CODE' || st === 'STARTING') return { status: 'qr_needed', phone: null, profileName: null };
		return { status: 'disconnected', phone: null, profileName: null };
	} catch {
		return { status: 'disconnected', phone: null, profileName: null };
	}
}
