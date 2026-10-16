// Util bersama worker Dokku (plain Node, tanpa dependensi build SvelteKit).
// Semua process membaca/menulis DATA_DIR/db.json yang sama (volume persisten).
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
const DB = join(DATA_DIR, 'db.json');

export function loadDb() {
	mkdirSync(DATA_DIR, { recursive: true });
	if (!existsSync(DB)) {
		for (const c of [join(DATA_DIR, 'seed.json'), join(process.cwd(), 'data', 'seed.json'), join(process.cwd(), 'build', 'data', 'seed.json')]) {
			if (existsSync(c)) {
				writeFileSync(DB, readFileSync(c, 'utf8'));
				break;
			}
		}
	}
	return JSON.parse(readFileSync(DB, 'utf8'));
}

export function saveDb(db) {
	const tmp = DB + '.tmp';
	writeFileSync(tmp, JSON.stringify(db, null, 1));
	renameSync(tmp, DB);
}

export const now = () => new Date().toISOString();
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function calcFees(gross, gw, pct = 0.05) {
	gross = Math.max(0, Math.round(gross));
	gw = Math.max(0, Math.min(gross, Math.round(gw)));
	const pf = Math.round(gross * pct);
	return { gross, gatewayFee: gw, platformFee: pf, net: Math.max(0, gross - gw - pf) };
}

export function log(name, ...args) {
	console.log(`[${new Date().toISOString().slice(11, 19)} ${name}]`, ...args);
}
