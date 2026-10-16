import { error } from '@sveltejs/kit';
import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { RequestHandler } from './$types';
import { getUserFromCookies, can } from '$lib/server/auth';
import { DATA_DIR } from '$lib/server/store';

const EXPORT_DIR = join(DATA_DIR, 'exports');

export const GET: RequestHandler = async ({ cookies, params }) => {
	const u = getUserFromCookies(cookies);
	if (!u || !can(u, 'finance')) throw error(403);
	const file = join(EXPORT_DIR, basename(params.file));
	if (!params.file.endsWith('.csv') || !existsSync(file)) throw error(404);
	return new Response(readFileSync(file), {
		headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${params.file}"` }
	});
};
