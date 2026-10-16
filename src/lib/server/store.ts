// File-backed JSON store — dipakai saat Postgres belum tersedia (dev / demo).
// Antarmuka & nama kolom sama dengan skema Postgres di db/postgres.sql,
// sehingga migrasi ke Postgres hanya mengganti lapisan ini (PRD §9.2, §10).
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DbShape } from '$lib/types';

// DATA_DIR: direktori data aktif. Default ./data dari cwd — di Dokku mount volume ke sana.
export const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
const DB_FILE = join(DATA_DIR, 'db.json');
const SEED_CANDIDATES = [
	join(DATA_DIR, 'seed.json'),
	join(process.cwd(), 'data', 'seed.json'),
	join(process.cwd(), 'build', 'data', 'seed.json') // prod: hasil `npm run build`
];

function ensureDir() {
	mkdirSync(DATA_DIR, { recursive: true });
}

export function loadDb(): DbShape {
	ensureDir();
	if (!existsSync(DB_FILE)) {
		const seed = SEED_CANDIDATES.find((f) => existsSync(f));
		if (!seed) throw new Error('seed.json belum ada — jalankan: npm run seed');
		writeFileSync(DB_FILE, readFileSync(seed, 'utf8'));
	}
	return JSON.parse(readFileSync(DB_FILE, 'utf8')) as DbShape;
}

/** Tulis atomik (tmp + rename) agar aman dibaca process worker lain. */
export function saveDb(db: DbShape): void {
	ensureDir();
	const tmp = DB_FILE + '.tmp';
	writeFileSync(tmp, JSON.stringify(db, null, 1));
	renameSync(tmp, DB_FILE);
}

/** Baca-ubah-tulis dalam satu langkah. */
export function updateDb<T>(fn: (db: DbShape) => T): T {
	const db = loadDb();
	const out = fn(db);
	saveDb(db);
	return out;
}

export function nextId(db: DbShape, prefix: string): string {
	const n = (db.seq[prefix] ?? 0) + 1;
	db.seq[prefix] = n;
	return `${prefix}_${String(n).padStart(6, '0')}`;
}

export function isoNow(): string {
	return new Date().toISOString();
}

export function slugify(title: string): string {
	return (
		title
			.toLowerCase()
			.replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF ]/gi, '')
			.trim()
			.replace(/\s+/g, '-')
			.slice(0, 60) || 'campaign'
	);
}

/** Paginasi cursor (PRD §9.2): cursor = `${paidAt}|${id}` di-encode. */
export function encodeCursor(paidAt: string, id: string): string {
	return Buffer.from(`${paidAt}|${id}`).toString('base64url');
}

export function decodeCursor(cursor: string): { paidAt: string; id: string } | null {
	try {
		const raw = Buffer.from(cursor, 'base64url').toString('utf8');
		const i = raw.indexOf('|');
		if (i < 0) return null;
		return { paidAt: raw.slice(0, i), id: raw.slice(i + 1) };
	} catch {
		return null;
	}
}
