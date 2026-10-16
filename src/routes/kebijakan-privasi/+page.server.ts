import type { PageServerLoad } from './$types';
import { loadDb } from '$lib/server/store';

export const load: PageServerLoad = async () => ({ siteName: loadDb().site.siteName });
