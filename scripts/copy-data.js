// Menyalin data/seed.json ke dalam hasil build agar `node build` tetap bisa boot
// dari seed saat volume DATA_DIR kosong ( Okt: first-boot seeding ).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(ROOT, 'data', 'seed.json');
const dest = join(ROOT, 'build', 'data', 'seed.json');
if (existsSync(src)) {
	mkdirSync(dirname(dest), { recursive: true });
	copyFileSync(src, dest);
	console.log('data seed disalin ke build/data/seed.json');
} else {
	console.log('seed.json belum ada — jalankan: npm run seed');
}
