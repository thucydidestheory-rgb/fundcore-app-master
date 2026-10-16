<script lang="ts">
	import { onMount } from 'svelte';
	import CampaignCard from '$lib/components/CampaignCard.svelte';
	import type { PageData } from './$types';
	import type { Campaign } from '$lib/types';
	export let data: PageData;

	let kategori = data.kategori, urut = data.urut, q = data.q;
	let items: Campaign[] = data.initialItems;
	let cursor: string | null = data.initialCursor;
	let habis = data.initialCursor === null;
	let loading = false;

	const catName = (id: string) => data.categories.find((k) => k.id === id)?.name ?? '';

	async function muat(reset = false) {
		if (loading || (habis && !reset)) return;
		loading = true;
		if (reset) { items = []; cursor = null; habis = false; }
		const p = new URLSearchParams({ kategori, urut, q, limit: '9' });
		if (cursor) p.set('cursor', cursor);
		const r = await fetch(`/api/campaigns?${p}`);
		const j = await r.json();
		items = [...items, ...j.items];
		cursor = j.nextCursor;
		if (!cursor) habis = true;
		loading = false;
		history.replaceState(null, '', `/campaigns?${new URLSearchParams({ kategori, urut, q })}`);
	}

	let sentinel: HTMLDivElement;
	onMount(() => {
		if (!items.length) muat(true); // SSR sudah mengisi halaman pertama
		const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) muat(); }, { rootMargin: '400px' });
		io.observe(sentinel);
		return () => io.disconnect();
	});
</script>

<svelte:head><title>Semua Campaign — Donasi</title></svelte:head>

<div class="wrap">
	<p class="eyebrow">Waktunya menebar kebaikan</p>
	<h1 style="font-size:clamp(22px,5.5vw,30px);margin:0 0 4px">Salurkan Niat Baik Penuh Kebaikan Untuk Sesama</h1>
	<form class="row" on:submit|preventDefault={() => muat(true)} role="search" style="margin-top:12px">
		<input class="inp" style="flex:1" placeholder="Cari campaign…" bind:value={q} name="q" />
		<button class="btn btn-brand" type="submit">Cari</button>
	</form>
	<div class="cats" style="margin-top:10px">
		<button class="chip" class:on={!kategori} on:click={() => { kategori=''; muat(true); }}>Semua</button>
		{#each data.categories as k}
			<button class="chip" class:on={kategori===k.slug} on:click={() => { kategori=k.slug; muat(true); }}>{k.icon} {k.name}</button>
		{/each}
	</div>
	<div class="row" style="margin:8px 0">
		<label class="small muted" for="urut">Urutkan</label>
		<select id="urut" class="inp" style="width:auto" bind:value={urut} on:change={() => muat(true)}>
			<option value="terbaru">Terbaru</option>
			<option value="mendesak">Mendesak</option>
			<option value="hampir">Hampir tercapai</option>
			<option value="populer">Populer</option>
		</select>
	</div>

	<div class="grid">
		{#each items as c (c.id)}<CampaignCard {c} catName={catName(c.categoryId)} ringkas />{/each}
	</div>
	{#if loading}<div class="grid">{#each [1,2,3] as _}<div class="skel" style="height:280px" />{/each}</div>{/if}
	{#if !loading && !items.length}<p class="muted">Tidak ada campaign yang cocok. Coba kata kunci lain.</p>{/if}
	<div bind:this={sentinel} style="height:8px" />
	{#if !habis && items.length}<button class="btn btn-ghost btn-block" on:click={() => muat()} disabled={loading}>{loading ? 'Memuat…' : 'Lihat Lebih Banyak'}</button>{/if}
	{#if habis && items.length}<p class="muted small" style="text-align:center">— Semua campaign sudah tampil —</p>{/if}
</div>
