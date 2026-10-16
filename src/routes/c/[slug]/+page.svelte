<script lang="ts">
	import CampaignCard from '$lib/components/CampaignCard.svelte';
	import Share from '$lib/components/Share.svelte';
	import { formatRupiah, formatRingkas, progressPct, sisaHari, timeAgo } from '$lib/format';
	import type { PageData } from './$types';
	export let data: PageData;
	const { c } = data;
	const catName = (id: string) => data.categories.find((k) => k.id === id)?.name ?? data.category?.name ?? '';

	let donorSort: 'terbaru' | 'terbesar' = data.sort === 'terbesar' ? 'terbesar' : 'terbaru';
	let donorCursor: string | null = null;
	let donorHabis = data.donors.length < 10;
	let donors = data.donors;
	let loadingDonor = false;
	let ceritaPenuh = false;

	async function muatDonor(reset = false) {
		if (loadingDonor || (donorHabis && !reset)) return;
		loadingDonor = true;
		if (reset) { donors = []; donorCursor = null; donorHabis = false; }
		const p = new URLSearchParams({ limit: '10', sort: donorSort });
		if (donorCursor) p.set('cursor', donorCursor);
		const r = await fetch(`/api/campaigns/${c.id}/donors?${p}`);
		const j = await r.json();
		donors = reset ? j.items : [...donors, ...j.items];
		donorCursor = j.nextCursor;
		if (!donorCursor) donorHabis = true;
		loadingDonor = false;
		history.replaceState(null, '', `/c/${c.slug}?tab=donatur&sort=${donorSort}`);
	}
	function gantiSort(s: 'terbaru' | 'terbesar') { donorSort = s; muatDonor(true); }
	async function aamiin(id: string, list: 'donors' | 'doas') {
		const r = await fetch(`/api/campaigns/${id}/aamiin`, { method: 'POST' });
		const j = await r.json();
		if (j.ok && list === 'donors') donors = donors.map((d) => (d.id === id ? { ...d, aamiin: j.aamiin } : d));
		if (j.ok && list === 'doas') data.doas = data.doas.map((d) => (d.id === id ? { ...d, aamiin: j.aamiin } : d));
	}
</script>

<svelte:head>
	<title>{c.title} — Donasi</title>
	<meta name="description" content={c.story.slice(0, 160)} />
	<meta property="og:title" content={c.title} />
	<meta property="og:description" content={`Terkumpul ${formatRupiah(c.collectedAmount)} dari ${formatRupiah(c.targetAmount)}. Yuk bantu!`} />
	<meta property="og:image" content={`${data.siteUrl}${c.coverUrl}`} />
	<script type="application/ld+json">{JSON.stringify({
		'@context': 'https://schema.org', '@type': 'DonateAction',
		name: c.title, target: { '@type': 'EntryPoint', urlTemplate: `${data.siteUrl}/donasi/${c.slug}` }
	})}</script>
</svelte:head>

<div class="wrap" style="max-width:720px">
	<img class="cover-main" src={c.coverUrl} alt={c.title} width="1080" height="608" fetchpriority="high" />
	<h1 style="font-size:22px;margin:10px 0 4px">{c.title}</h1>
	<p class="detail-nom">{formatRupiah(c.collectedAmount)} <span class="muted">terkumpul dari <b>{formatRupiah(c.targetAmount)}</b></span></p>

	<div class="progress" role="progressbar" aria-valuenow={progressPct(c.collectedAmount, c.targetAmount)} aria-valuemin="0" aria-valuemax="100">
		<i style={`width:${progressPct(c.collectedAmount, c.targetAmount)}%`} />
	</div>
	<p class="small muted" style="margin:6px 0"><b>{c.donorCount}</b> Donasi · {sisaHari(c.endAt)} hari lagi
		{#if c.urgent} · <span class="badge urgent">Mendesak</span>{/if}
	</p>
	<div class="row" style="margin:10px 0">
		<a class="btn btn-accent" style="flex:1" href={`/donasi/${c.slug}`}>Donasi Sekarang</a>
		<Share title={c.title} url={`${data.siteUrl}/c/${c.slug}`} />
	</div>

	<div class="org-box">
		<div class="avatar">{c.ownerName.slice(0, 1).toUpperCase()}</div>
		<div>
			<small class="muted">Penggalang Dana</small><br />
			<b>{c.ownerName}</b>
			{#if c.verified}<span class="badge">✓ Verified Organization</span>{/if}
		</div>
	</div>

	<nav class="tabs" aria-label="Tab campaign">
		<a href={`/c/${c.slug}?tab=cerita`} class:on={data.tab==='cerita'}>Keterangan</a>
		<a href={`/c/${c.slug}?tab=kabar`} class:on={data.tab==='kabar'}>Kabar Terbaru ({data.updates.length})</a>
		<a href={`/c/${c.slug}?tab=donatur`} class:on={data.tab==='donatur'}>Donatur ({c.donorCount})</a>
	</nav>

	{#if data.tab === 'cerita'}
		<article class="story" class:collapsed={!ceritaPenuh}>
			{#each c.story.split('\n') as p}<p>{p}</p>{/each}
			<p class="small muted">Penerima manfaat: {c.receiver}</p>
		</article>
		<button class="btn btn-ghost btn-block" on:click={() => (ceritaPenuh = !ceritaPenuh)}>{ceritaPenuh ? 'Tutup ▴' : 'Baca selengkapnya ▾'}</button>
	{:else if data.tab === 'kabar'}
		{#if !data.updates.length}<p class="muted">Belum ada kabar terbaru dari penggalang.</p>{/if}
		{#each data.updates as u}
			<div class="kard" style="margin-bottom:10px"><small class="muted">{timeAgo(u.createdAt)}</small><h3 style="margin:4px 0">{u.title}</h3><p>{u.body}</p></div>
		{/each}
	{:else}
		<div class="row" style="margin-bottom:8px">
			<span class="small muted">Urutkan:</span>
			<button class="chip" class:on={donorSort==='terbaru'} on:click={() => gantiSort('terbaru')}>Terbaru</button>
			<button class="chip" class:on={donorSort==='terbesar'} on:click={() => gantiSort('terbesar')}>Terbesar</button>
		</div>
		{#each donors as d (d.id)}
			<div class="donor">
				<div class="avatar">{d.name.slice(0,1).toUpperCase()}</div>
				<div style="flex:1">
					<b>{d.name}</b> <span class="muted small">· {timeAgo(d.paidAt ?? '')}</span>
					<p style="margin:2px 0">Berdonasi sebesar <b>{d.amount >= 1000000 ? `Rp${formatRingkas(d.amount)}` : formatRupiah(d.amount)}</b></p>
					{#if d.prayer}<p class="small" style="margin:4px 0">“{d.prayer}”</p>
					<button class="btn btn-ghost btn-sm" on:click={() => aamiin(d.id, 'donors')}>🤲 Aamiin ({d.aamiin})</button>{/if}
				</div>
			</div>
		{/each}
		{#if !donorHabis}<button class="btn btn-ghost btn-block" style="margin:12px 0" on:click={() => muatDonor()} disabled={loadingDonor}>{loadingDonor ? 'Memuat…' : 'Muat lebih banyak'}</button>{/if}
		{#if !donors.length}<p class="muted">Jadilah donatur pertama campaign ini.</p>{/if}
	{/if}

	{#if data.doaTotal > 0}
		<h2 style="font-size:18px;margin-top:24px">Doa-doa orang baik ({data.doaTotal})</h2>
		{#each data.doas as d (d.id)}
			<div class="donor">
				<div class="avatar">🤲</div>
				<div style="flex:1">
					<b>{d.name}</b> <span class="muted small">· {timeAgo(d.paidAt ?? '')}</span>
					<p style="margin:4px 0">“{d.prayer}”</p>
					<button class="btn btn-ghost btn-sm" on:click={() => aamiin(d.id, 'doas')}>Aamiin-kan doa ini (+{d.aamiin})</button>
				</div>
			</div>
		{/each}
	{/if}

	{#if data.related.length}
		<h2 style="font-size:18px;margin-top:24px">Campaign terkait</h2>
		<div class="grid">{#each data.related as r}<CampaignCard c={r} catName={catName(r.categoryId)} />{/each}</div>
	{/if}

	<div class="org-box" style="margin-top:20px">
		<div class="avatar">🤝</div>
		<div style="flex:1">
			<b>Jadi Fundraiser</b>
			<p class="small muted" style="margin:2px 0 8px">Mari jadi fundraiser dan berikan manfaat bagi program ini.</p>
			<a class="btn btn-brand btn-sm" href="/jadi-fundraiser">Jadi Fundraiser</a>
		</div>
	</div>
</div>

<div class="sticky-donasi"><div class="sticky-in">
	<a class="btn btn-accent btn-block" href={`/donasi/${c.slug}`}>Donasi Sekarang</a>
</div></div>
