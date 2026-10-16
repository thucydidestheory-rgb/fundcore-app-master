<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';
	export let data: LayoutData;

	const links: [string, string, string][] = [
		['/admin', '📊 Overview', 'Capaian donasi'],
		['/admin/campaigns', '📢 Campaign', 'Manajemen & tayang'],
		['/admin/fundraisers', '✅ Fundraiser', 'Persetujuan pengajuan'],
		['/admin/donasi', '💰 Donasi', 'Daftar & export'],
		['/admin/whatsapp', '💬 WhatsApp', 'Nomor CS & template'],
		['/admin/pembayaran', '💳 Pembayaran', 'Winpay & rekonsiliasi'],
		['/admin/branding', '🎨 Branding', 'Nama, logo, tema'],
		['/admin/konten', '📰 Konten', 'Halaman & pencairan'],
		['/admin/pengguna', '👥 Pengguna', 'Role & audit log']
	];
</script>

<div class="wrap admin-wrap">
	<header class="admin-hdr">
		<div>
			<p class="eyebrow">Panel Admin</p>
			<h1 style="margin:0">{data.user.name}</h1>
		</div>
		<div class="row">
			<span class="badge">{data.user.role}</span>
			<form method="POST" action="/keluar"><button class="btn btn-ghost btn-sm">Keluar</button></form>
		</div>
	</header>

	<div class="admin-layout">
		<nav class="sidenav" aria-label="Admin">
			{#each links as [href, label, sub]}
				<a {href} class:on={$page.url.pathname === href}>
					<span>{label}</span>
					<small>{sub}</small>
				</a>
			{/each}
		</nav>
		<div class="admin-body"><slot /></div>
	</div>
</div>
