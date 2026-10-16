<script lang="ts">
	import Trend from '$lib/components/Trend.svelte';
	import { formatRupiah } from '$lib/format';
	import type { PageData } from './$types';
	export let data: PageData;
	const k = data.kards;
	function gantiRentang(e: Event) {
		(e.currentTarget as HTMLSelectElement).form?.submit();
	}
	const funnelPct = (n: number) => (data.funnel.views ? Math.min(100, Math.round((n / data.funnel.views) * 100)) : 0);
</script>

<svelte:head><title>Admin Overview</title></svelte:head>

<form method="GET" class="row small" style="justify-content:flex-end">
	<label>Rentang
		<select name="range" on:change={gantiRentang}>
			<option value="7" selected={data.range===7}>7 hari</option>
			<option value="30" selected={data.range===30}>30 hari</option>
			<option value="90" selected={data.range===90}>90 hari</option>
		</select>
	</label>
</form>

<h2 class="apage-h">Overview Capaian Donasi</h2>
<p class="apage-sub">Statistik donasi dalam {data.range} hari terakhir.</p>

<div class="kards">
	<div class="kard"><small>Total terkumpul (kotor)</small><b>{formatRupiah(k.totalGross)}</b></div>
	<div class="kard"><small>Masuk {data.range} hari</small><b>{formatRupiah(k.grossRange)}</b></div>
	<div class="kard"><small>Hari ini</small><b>{formatRupiah(k.todayGross)}</b></div>
	<div class="kard"><small>Donatur unik</small><b>{k.donors}</b></div>
	<div class="kard"><small>Donasi sukses</small><b>{k.paidCount}</b></div>
	<div class="kard"><small>Rata-rata nominal</small><b>{formatRupiah(k.rata)}</b></div>
	<div class="kard"><small>Campaign aktif</small><b>{k.aktif}</b></div>
	<div class="kard"><small>Dana bersih siap cair</small><b>{formatRupiah(k.siapCair)}</b></div>
</div>

<Trend stats={data.stats} range={data.range} />

<div class="kards">
	<div class="kard" style="grid-column:span 2">
		<small>Funnel konversi ({data.range} hari)</small>
		<div class="funnel">
			<div class="funnel-step">
				<span class="small muted">👁️ Kunjungan</span><b class="num">{data.funnel.views}</b>
				<div class="funnel-bar"><i style={`width:${funnelPct(data.funnel.views)}%`} /></div>
			</div>
			<div class="funnel-step">
				<span class="small muted">🛒 Checkout</span><b class="num">{data.funnel.checkouts}</b>
				<div class="funnel-bar"><i style={`width:${funnelPct(data.funnel.checkouts)}%`} /></div>
			</div>
			<div class="funnel-step">
				<span class="small muted">🧾 Donasi dibuat</span><b class="num">{data.funnel.created}</b>
				<div class="funnel-bar"><i style={`width:${funnelPct(data.funnel.created)}%`} /></div>
			</div>
			<div class="funnel-step">
				<span class="small muted">✅ Donasi dibayar</span><b class="num">{data.funnel.paid}</b>
				<div class="funnel-bar"><i style={`width:${funnelPct(data.funnel.paid)}%`} /></div>
			</div>
		</div>
	</div>
	<div class="kard" style="grid-column:span 2">
		<small>Status operasional</small>
		<ul class="list-plain">
			<li><span>Pesan WA antre</span><b>{data.ops.waQueued}</b></li>
			<li><span>Pesan WA gagal</span><b>{data.ops.waFailed}</b></li>
			<li><span>Donasi pending &gt;3 jam</span><b>{data.ops.pendingLama}</b></li>
			{#each data.ops.waAccounts as a}
				<li><span>{a.label}{a.isActive ? '' : ' (nonaktif)'}</span><span class="badge">{a.status}</span></li>
			{/each}
		</ul>
	</div>
</div>

<div class="kards">
	<div class="kard">
		<small>Per channel</small>
		{#if data.byChannel.length}
			<ul class="list-plain">{#each data.byChannel as [ch, v]}<li><span>{ch}</span><b class="num">{formatRupiah(v)}</b></li>{/each}</ul>
		{:else}<p class="small muted">Belum ada data.</p>{/if}
	</div>
	<div class="kard">
		<small>Per kategori</small>
		{#if data.byCategory.length}
			<ul class="list-plain">{#each data.byCategory as [ct, v]}<li><span>{ct}</span><b class="num">{formatRupiah(v)}</b></li>{/each}</ul>
		{:else}<p class="small muted">Belum ada data.</p>{/if}
	</div>
	<div class="kard">
		<small>Sumber trafik (UTM)</small>
		{#if data.byUtm.length}
			<ul class="list-plain">{#each data.byUtm as [u, v]}<li><span>{u}</span><b class="num">{formatRupiah(v)}</b></li>{/each}</ul>
		{:else}<p class="small muted">Belum ada data.</p>{/if}
	</div>
	<div class="kard">
		<small>Top campaign</small>
		<ul class="list-plain">
			{#each data.top as t}
				<li><span><a href={`/c/${t.slug}`}>{t.title}</a></span><b class="num">{formatRupiah(t.collected)}</b></li>
			{/each}
		</ul>
	</div>
</div>

<div class="kards">
	<div class="kard">
		<small>🔥 Hampir tercapai (≥70%)</small>
		{#if data.hampir.length}
			<ul class="list-plain">{#each data.hampir as h}<li><span><a href={`/c/${h.slug}`}>{h.title}</a></span><b>{h.pct}%</b></li>{/each}</ul>
		{:else}<p class="small muted">Semua campaign masih di bawah 70%.</p>{/if}
	</div>
	<div class="kard">
		<small>💤 Perlu dorongan</small>
		{#if data.sepi.length}
			<ul class="list-plain">{#each data.sepi as s}<li><span><a href={`/c/${s.slug}`}>{s.title}</a></span><b>{s.donors} donatur</b></li>{/each}</ul>
		{:else}<p class="small muted">Tidak ada campaign sepi.</p>{/if}
	</div>
</div>
