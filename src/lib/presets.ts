export const CATEGORIES = [
	{ id: 'cat-kesehatan', name: 'Kesehatan', slug: 'kesehatan', icon: '❤️' },
	{ id: 'cat-pendidikan', name: 'Pendidikan', slug: 'pendidikan', icon: '🎓' },
	{ id: 'cat-bencana', name: 'Bencana', slug: 'bencana', icon: '🆘' },
	{ id: 'cat-sosial', name: 'Sosial', slug: 'sosial', icon: '🤝' },
	{ id: 'cat-ibadah', name: 'Ibadah', slug: 'ibadah', icon: '🕌' },
	{ id: 'cat-lingkungan', name: 'Lingkungan', slug: 'lingkungan', icon: '🌱' }
] as const;

export const QUICK_AMOUNTS = [10000, 25000, 50000, 100000, 250000];

export const THEME_PRESETS = [
	{ name: 'Niat Baik (hangat)', bg: '#ffffff', brand: '#0e7c5b', accent: '#f97316' },
	{ name: 'Samudra (biru)', bg: '#ffffff', brand: '#0b5cad', accent: '#f59e0b' },
	{ name: 'Sakura (rose)', bg: '#fff7f7', brand: '#9d174d', accent: '#e11d48' },
	{ name: 'Malam (gelap)', bg: '#101827', brand: '#22c55e', accent: '#fbbf24' },
	{ name: 'Gurun (krem)', bg: '#faf6ef', brand: '#7c4a12', accent: '#ea580c' }
];
