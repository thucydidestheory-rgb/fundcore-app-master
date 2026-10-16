import { loadDb } from '$lib/server/store';
import { startSweeper } from '$lib/server/sweeper';
import { themeCss } from '$lib/format';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	startSweeper();
	const db = loadDb();
	const s = db.site;
	return {
		site: {
			siteName: s.siteName,
			tagline: s.tagline,
			logoUrl: s.logoUrl,
			orgName: s.orgName,
			orgContact: s.orgContact,
			socials: s.socials ?? { instagram: '', tiktok: '', facebook: '', youtube: '' }
		},
		themeCss: themeCss(s.colorBg, s.colorBrand, s.colorAccent)
	};
};
