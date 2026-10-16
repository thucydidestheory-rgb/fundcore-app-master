<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';
	export let data: LayoutData;
	$: inAdmin = $page.url.pathname.startsWith('/admin') || $page.url.pathname.startsWith('/fundraiser');
	$: isCampaign = $page.url.pathname.startsWith('/c/');
	$: isPublic = !inAdmin;
	let cari = '';
	// Ruang bawah untuk bar bawah: sticky donasi di detail, tab bar di public lain.
	$: if (browser) {
		document.body.classList.toggle('has-sticky', isPublic && isCampaign);
		document.body.classList.toggle('has-bnav', isPublic && !isCampaign);
	}
</script>

<svelte:head>
	{@html `<style>${data.themeCss}</style>`}
	<link rel="icon" href="/favicon.svg" />
</svelte:head>

<a class="skip" href="#konten">Lewati ke konten</a>

<!-- Area public = kolom aplikasi mobile 480px (tengah, berbingkai di desktop).
     Header atas statis; satu-satunya navbar sticky ada di bawah (tab bar).
     Area admin/fundraiser tetap full-width responsif. -->
<div class:pub={isPublic}>
<header class="hdr">
	<div class="hdr-in">
		<a class="brand" href="/">
			{#if data.site.logoUrl}<img src={data.site.logoUrl} alt="" width="32" height="32" />{/if}
			<span>{data.site.siteName}</span>
		</a>
		<nav class="nav" aria-label="Utama">
			{#if isPublic}
				<form class="hdr-search" action="/campaigns" method="GET" role="search">
					<input class="inp" name="q" placeholder="Cari campaign…" bind:value={cari} aria-label="Cari campaign" />
					<button class="btn btn-donasi-nav btn-sm" type="submit" aria-label="Cari">🔍</button>
				</form>
			{:else}
				<a href="/campaigns" aria-current={$page.url.pathname.startsWith('/campaign') || $page.url.pathname.startsWith('/c/') ? 'page' : undefined}>Campaign</a>
				<a href="/biaya" aria-current={$page.url.pathname === '/biaya' ? 'page' : undefined}>Biaya</a>
				<a href="/faq" aria-current={$page.url.pathname === '/faq' ? 'page' : undefined}>FAQ</a>
				<a class="btn-donasi-nav" href="/campaigns">Donasi</a>
			{/if}
		</nav>
	</div>
</header>

<main id="konten">
	<slot />
</main>

<footer class="footer">
	{#if !inAdmin}
		<div class="wrap footer-top">
			{#if data.site.logoUrl}<img class="footer-logo" src={data.site.logoUrl} alt={data.site.siteName} width="72" height="72" />{/if}
			<h2>Mulai Kebaikan Kecil Setiap Hari</h2>
			<p>Kebaikan tidak harus menunggu momentum besar. Sisihkan sedikit rezeki setiap hari untuk merawat kepedulian dan memberi arti bagi mereka yang membutuhkan.</p>
			<div class="socials">
				{#if data.site.socials?.instagram}<a href={data.site.socials.instagram} target="_blank" rel="noopener" aria-label="Instagram">📸</a>{/if}
				{#if data.site.socials?.tiktok}<a href={data.site.socials.tiktok} target="_blank" rel="noopener" aria-label="TikTok">🎵</a>{/if}
				{#if data.site.socials?.facebook}<a href={data.site.socials.facebook} target="_blank" rel="noopener" aria-label="Facebook">📘</a>{/if}
				{#if data.site.socials?.youtube}<a href={data.site.socials.youtube} target="_blank" rel="noopener" aria-label="YouTube">▶️</a>{/if}
				{#if data.site.orgContact}<a href={`https://wa.me/${data.site.orgContact.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener" aria-label="WhatsApp">💬</a>{/if}
			</div>
		</div>
	{/if}
</footer>
</div>

{#if isPublic && !isCampaign}
	<nav class="bnav" aria-label="Navigasi bawah">
		<div class="bnav-in">
			<a href="/" class:active={$page.url.pathname === '/'}><i>🏠</i>Beranda</a>
			<a href="/campaigns" class:active={$page.url.pathname.startsWith('/campaign')}><i>❤️</i>Campaign</a>
			<a href="/tentang" class:active={$page.url.pathname.startsWith('/tentang')}><i>✨</i>Tentang</a>
			<a href="/masuk" class:active={$page.url.pathname.startsWith('/masuk') || $page.url.pathname.startsWith('/daftar')}><i>👤</i>Akun</a>
		</div>
	</nav>
{/if}
