// Auth sesi cookie + RBAC + audit log. Password demo: SHA-256(salt:pw).
// Produksi: ganti dengan bcrypt/argon2 + 2FA admin (PRD §9.3).
import { createHash, randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import type { DbShape, User, UserRole } from '$lib/types';
import { loadDb, saveDb, nextId, isoNow } from './store';

const COOKIE = 'fc_session';
const SALT = process.env.PASSWORD_SALT || 'fundcore-dev-salt';

export function hashPassword(pw: string): string {
	return createHash('sha256').update(`${SALT}:${pw}`).digest('hex');
}

export function verifyPassword(pw: string, hash: string): boolean {
	return hashPassword(pw) === hash;
}

export function getUserFromCookies(cookies: Cookies): User | null {
	const token = cookies.get(COOKIE);
	if (!token) return null;
	const db = loadDb();
	const s = db.sessions.find((x) => x.token === token);
	if (!s) return null;
	return db.users.find((u) => u.id === s.userId) ?? null;
}

export function createSession(cookies: Cookies, userId: string): void {
	const db = loadDb();
	const token = randomBytes(24).toString('hex');
	db.sessions.push({ token, userId, createdAt: isoNow() });
	saveDb(db);
	cookies.set(COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
}

export function destroySession(cookies: Cookies): void {
	const token = cookies.get(COOKIE);
	if (token) {
		const db = loadDb();
		db.sessions = db.sessions.filter((s) => s.token !== token);
		saveDb(db);
	}
	cookies.delete(COOKIE, { path: '/' });
}

const ADMIN_ROLES: UserRole[] = ['super_admin', 'operator', 'finance', 'viewer'];

export function isAdmin(u: User | null): boolean {
	return !!u && ADMIN_ROLES.includes(u.role);
}

export function can(u: User | null, action: 'manage' | 'finance' | 'view'): boolean {
	if (!u) return false;
	if (u.role === 'super_admin') return true;
	if (action === 'view') return ADMIN_ROLES.includes(u.role);
	if (action === 'finance') return u.role === 'finance' || u.role === 'operator';
	if (action === 'manage') return u.role === 'operator';
	return false;
}

export function audit(
	db: DbShape,
	actor: User | null,
	action: string,
	entity: string,
	before: unknown,
	after: unknown,
	ip: string
): void {
	db.auditLogs.unshift({
		id: nextId(db, 'log'),
		actorId: actor?.id ?? 'anon',
		actorName: actor?.name ?? 'anonim',
		action,
		entity,
		before: before ? JSON.stringify(before).slice(0, 2000) : null,
		after: after ? JSON.stringify(after).slice(0, 2000) : null,
		ip,
		createdAt: isoNow()
	});
	db.auditLogs = db.auditLogs.slice(0, 500);
}
