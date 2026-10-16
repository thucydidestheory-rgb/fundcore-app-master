<script lang="ts">
	import { formatRupiah } from '$lib/format';
	import type { PageData } from './$types';
	export let data: PageData;
	const lines = (t: string) => t.split('\n').map((s) => s.trim()).filter(Boolean);
</script>

<svelte:head><title>Tentang — {data.site.siteName}</title></svelte:head>

<div class="wrap" style="max-width:640px;text-align:center">
	{#if data.site.logoUrl}<img src={data.site.logoUrl} alt={data.site.siteName} width="72" height="72" style="border-radius:18px" />{/if}
	<h1 style="font-size:24px;margin:8px 0 4px">{data.site.orgName}</h1>
	<p class="muted">{data.visi}</p>
	<div class="row" style="justify-content:center;margin:12px 0">
		<div class="kard num" style="flex:1"><b>{data.stats.campaign}</b><small>campaign</small></div>
		<div class="kard num" style="flex:1"><b>{data.stats.donatur.toLocaleString('id-ID')}</b><small>donatur</small></div>
		<div class="kard num" style="flex:1"><b>{formatRupiah(data.stats.terkumpul)}</b><small>terkumpul</small></div>
	</div>
	<p><a class="btn btn-brand" href="/kontak">Hubungi Kami</a></p>
</div>

<div class="wrap" style="max-width:640px">
	<div class="cats" style="justify-content:center">
		<a class="chip" href="#tentang">Tentang</a>
		<a class="chip" href="#visi">Visi & Nilai</a>
		<a class="chip" href="#transparansi">Transparansi</a>
	</div>

	<section id="tentang" class="sec">
		<div class="sec-head"><h2>Tentang {data.site.siteName}</h2></div>
		{#each lines(data.about) as p}<p>{p}</p>{/each}
	</section>

	<section id="visi" class="sec">
		<div class="sec-head"><h2>Visi</h2></div>
		<p>{data.visi}</p>
		<h3 style="font-size:17px">Misi</h3>
		<ul>{#each data.misi as m}<li>{m}</li>{/each}</ul>
		<h3 style="font-size:17px">Nilai Kami</h3>
		<ul>{#each data.nilai as n}<li>{n}</li>{/each}</ul>
	</section>

	<section id="transparansi" class="sec">
		<div class="sec-head"><h2>Transparansi & Legalitas</h2></div>
		<p class="small muted">Kepercayaan Anda adalah prioritas kami.</p>
		<ul class="small">
			<li>Nama: {data.site.orgName}</li>
			<li>Alamat: {data.site.orgAddress}</li>
			<li>SK Kemenkumham: {data.site.skKemenkumham}</li>
			<li>Akta: {data.site.akta} · NIB: {data.site.nib}</li>
		</ul>
		<details class="kard" style="margin-bottom:8px"><summary><b>Syarat & Ketentuan</b></summary><p><a href="/syarat-ketentuan">Baca selengkapnya →</a></p></details>
		<details class="kard" style="margin-bottom:8px"><summary><b>Kebijakan Privasi</b></summary><p><a href="/kebijakan-privasi">Baca selengkapnya →</a></p></details>
		<details class="kard" style="margin-bottom:8px"><summary><b>Kebijakan Donasi & Biaya</b></summary><p><a href="/biaya">Baca selengkapnya →</a></p></details>
	</section>

	<section class="sec cinta">
		<div class="cinta-in">
			<h2>Siap mengambil langkah?</h2>
			<p>Lihat campaign yang sedang berjalan dan salurkan kebaikan hari ini.</p>
			<a class="btn btn-accent" href="/campaigns">Lihat Campaign</a>
		</div>
	</section>
</div>
