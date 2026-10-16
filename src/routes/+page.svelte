<script lang="ts">
	import CampaignCard from '$lib/components/CampaignCard.svelte';
	import { formatRupiah, formatRingkas, sisaHari, timeAgo } from '$lib/format';
	import type { PageData } from './$types';
	export let data: PageData;
	const f = data.featured;
	const catName = (id: string) => data.categories.find((k) => k.id === id)?.name ?? '';
</script>

<svelte:head>
	<title>{data.siteName ?? 'FundCore'} — Donasi cepat, transparan, tanpa ribet</title>
	<meta name="description" content={data.siteTagline} />
</svelte:head>

{#if data.ticker.length}
	<div class="ticker" aria-hidden="true">
		<span>{data.ticker.map((t) => `🎉 ${t.name} baru saja berdonasi ${formatRupiah(t.amount)}`).join('   •   ')}   •   </span><span>{data.ticker.map((t) => `🎉 ${t.name} baru saja berdonasi ${formatRupiah(t.amount)}`).join('   •   ')}   •   </span>
	</div>
{/if}

{#if f}
	<section class="hero-feat">
		<img src={f.coverUrl} alt="" width="1080" height="608" fetchpriority="high" />
		<div class="hero-feat-ov" />
		<div class="hero-feat-in">
			<p class="hero-eyebrow">{data.featuredCat?.name ?? 'Campaign'}</p>
			<h1>{f.title}</h1>
			<p class="hero-desc">{f.story.split('\n')[0].slice(0, 140)}…</p>
			<div class="row">
				<a class="btn btn-accent" href={`/c/${f.slug}`}>Bantu Sekarang</a>
				<a class="btn btn-ghost" style="color:#fff;border-color:#ffffff88" href="/campaigns">Donasi Sekarang</a>
			</div>
		</div>
	</section>
{:else}
	<section class="hero">
		<div class="hero-in">
			<h1>Donasi 60 detik, tanpa daftar.</h1>
			<p>{data.siteTagline}</p>
			<div class="row"><a class="btn btn-accent" href="/campaigns">Donasi Sekarang</a></div>
		</div>
	</section>
{/if}

<div class="wrap">
	<section class="sec" aria-label="Pilihan kategori kebaikan">
		<div class="sec-head"><h2>Pilihan Kategori Kebaikan</h2></div>
		<div class="kat-grid">
			{#each data.categories as k}
				<a class="kat-card" href={`/campaigns?kategori=${k.slug}`}>
					<span class="kat-icon" class:bounce={k.slug === 'kesehatan'}>{k.icon}</span>
					<span><b>{k.name}</b></span>
				</a>
			{/each}
		</div>
	</section>

	{#if data.pilihan.length}
		<section class="sec">
			<p class="eyebrow">Pilihan redaksi</p>
			<div class="sec-head"><h2>Campaign Pilihan</h2><a href="/campaigns?urut=populer">Lihat semua</a></div>
			<div class="rail">{#each data.pilihan as c}<CampaignCard {c} catName={catName(c.categoryId)} />{/each}</div>
		</section>
	{/if}

	{#if data.mendesak.length}
		<section class="sec">
			<p class="eyebrow">Butuh segera</p>
			<div class="sec-head"><h2>Mendesak</h2><a href="/campaigns?urut=mendesak">Lihat semua</a></div>
			<div class="rail">{#each data.mendesak as c}<CampaignCard {c} catName={catName(c.categoryId)} />{/each}</div>
		</section>
	{/if}

	<section class="sec cinta">
		<div class="cinta-in">
			<div>
				<p class="hero-eyebrow">Patungan Kebaikan</p>
				<h2>Kebaikan Kecil, Dampak Tanpa Batas</h2>
				<p>Tidak perlu menunggu terkumpul besar untuk berbagi. {data.siteTagline}</p>
				<a class="btn btn-accent" href="/campaigns">Mulai Berdonasi</a>
			</div>
		</div>
	</section>

	<section class="sec">
		<p class="eyebrow">Terbaru</p>
		<div class="sec-head"><h2>Campaign Terbaru</h2></div>
		<div class="terkini">
			{#each data.terbaru as c}
				<a class="terkini-row" href={`/c/${c.slug}`}>
					<img src={c.coverUrl} alt="" loading="lazy" width="192" height="144" />
					<span class="terkini-body">
						<small class="muted">{catName(c.categoryId)}</small>
						<b>{c.title}</b>
						<small class="muted">{c.ownerName}{#if c.verified} ✓{/if}</small>
						<span class="row" style="justify-content:space-between"><b class="num">Rp{formatRingkas(c.collectedAmount)}</b><small class="muted">{sisaHari(c.endAt)} hari lagi</small></span>
					</span>
				</a>
			{/each}
		</div>
		<a class="btn btn-ghost btn-block" style="margin-top:12px" href="/campaigns?urut=terbaru">Lihat Lebih Banyak</a>
	</section>

	{#if data.laporan.length}
		<section class="sec">
			<p class="eyebrow">Kabar penyaluran</p>
			<div class="sec-head"><h2>Laporan Penyaluran</h2></div>
			<div class="rail lap-kecil">
				{#each data.laporan as l}
					<article class="card">
						<a href={`/c/${l.campaignSlug}?tab=kabar`} tabindex="-1"><img class="cover" src={l.coverUrl} alt="" loading="lazy" width="640" height="360" /></a>
						<div class="card-body">
							<small class="muted num">{timeAgo(l.createdAt)} · {l.campaignTitle}</small>
							<h3><a href={`/c/${l.campaignSlug}?tab=kabar`}>{l.title}</a></h3>
							<p class="small muted">{l.body.slice(0, 120)}…</p>
							<span class="pin-bawah"><a class="btn btn-ghost btn-sm" href={`/c/${l.campaignSlug}?tab=kabar`}>Lihat Laporan</a></span>
						</div>
					</article>
				{/each}
			</div>
		</section>
	{/if}

</div>
