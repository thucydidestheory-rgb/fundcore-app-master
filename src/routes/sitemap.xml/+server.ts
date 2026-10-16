import type { RequestHandler } from './$types';
import { loadDb } from '$lib/server/store';

// Sitemap otomatis — penting untuk traffic organik campaign (PRD §7).
export const GET: RequestHandler = async ({ url }) => {
	const db = loadDb();
	const urls = [
		{ loc: `${url.origin}/`, changefreq: 'daily', priority: '1.0' },
		{ loc: `${url.origin}/campaigns`, changefreq: 'hourly', priority: '0.9' },
		...db.campaigns
			.filter((c) => c.status === 'active')
			.map((c) => ({ loc: `${url.origin}/c/${c.slug}`, changefreq: 'hourly', priority: '0.8' }))
	];
	const xml =
		`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
		urls.map((u) => `<url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('') +
		`</urlset>`;
	return new Response(xml, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' } });
};
