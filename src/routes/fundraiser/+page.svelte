<script lang="ts">
	import { formatRupiah, progressPct } from '$lib/format';
	import type { PageData } from './$types';
	export let data: PageData;
	const terkumpul = data.campaigns.reduce((s, c) => s + c.collectedAmount, 0);
</script>

<svelte:head><title>Dashboard Fundraiser</title></svelte:head>
<h1 style="font-size:22px">Halo, {data.user.name} 👋</h1>

{#if !data.canCreate}
	<div class="err">Akun Anda berstatus <b>{data.user.fundraiserStatus}</b>. <a href="/jadi-fundraiser">Ajukan verifikasi fundraiser</a> untuk membuat campaign.</div>
{:else}
	<p><a class="btn btn-accent" href="/fundraiser/campaign/baru">➕ Buat Campaign Baru</a></p>
{/if}

<div class="kards">
	<div class="kard"><small>Total terkumpul</small><b>{formatRupiah(terkumpul)}</b></div>
	<div class="kard"><small>Campaign</small><b>{data.campaigns.length}</b></div>
</div>

<h2 style="font-size:18px">Campaign saya</h2>
{#each data.campaigns as c}
	<div class="kard" style="margin-bottom:10px">
		<b><a href={`/c/${c.slug}`}>{c.title}</a></b>
		<div class="progress" style="margin:8px 0"><i style={`width:${progressPct(c.collectedAmount, c.targetAmount)}%`} /></div>
		<p class="small muted">{formatRupiah(c.collectedAmount)} / {formatRupiah(c.targetAmount)} · {c.donorCount} donatur · status: {c.status}</p>
		<p><a class="btn btn-ghost btn-sm" href={`/fundraiser/campaign/${c.id}`}>Kelola →</a></p>
	</div>
{/each}
{#if !data.campaigns.length}<p class="muted">Belum ada campaign.</p>{/if}

<h2 style="font-size:18px">Donatur terbaru</h2>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Nominal</th><th>Campaign</th></tr></thead>
<tbody>{#each data.donations as d}<tr><td>{d.donorName}</td><td>{formatRupiah(d.amount)}</td><td>{d.campaignTitle}</td></tr>{/each}</tbody></table></div>

{#if data.disbursements.length}
	<h2 style="font-size:18px">Pencairan</h2>
	{#each data.disbursements as p}<div class="kard small" style="margin-bottom:8px">{formatRupiah(p.amount)} · {p.status}</div>{/each}
{/if}
