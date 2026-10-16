<script lang="ts">
	import { formatRupiah } from '$lib/format';
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;
</script>

<svelte:head><title>Admin — Donasi</title></svelte:head>
<h2 class="apage-h">Daftar Donasi</h2>
<p class="apage-sub">Menampilkan maksimal 100 dari {data.total} donasi (terbaru dulu). Filter dan export tersedia di bawah.</p>
{#if form?.ok}<div class="ok">Export selesai: {form.rows} baris → <a href={`/api/exports/${form.file}`}>{form.file}</a></div>{/if}
<form method="GET" class="row">
	<select name="status" class="inp" style="width:auto">
		<option value="" selected={!data.status}>Semua status</option>
		{#each ['created','pending','paid','expired','failed'] as s}<option value={s} selected={data.status===s}>{s}</option>{/each}
	</select>
	<input name="q" class="inp" placeholder="Cari nama/ref…" value={data.q} style="flex:1" />
	<button class="btn btn-brand btn-sm">Filter</button>
</form>
<form method="POST" action="?/export" style="margin:10px 0"><button class="btn btn-ghost btn-sm">⬇ Export CSV (job)</button></form>

{#if data.items.length}<div class="tbl-wrap"><table class="tbl">
	<thead><tr><th>ID</th><th>Campaign</th><th>Donatur</th><th>Nominal</th><th>Channel</th><th>Bersih</th><th>Status</th></tr></thead>
	<tbody>{#each data.items as d}
		<tr><td class="small">{d.id.slice(-8)}</td><td>{d.campaignTitle.slice(0,28)}</td><td>{d.isAnonymous ? 'Orang Baik' : d.donorName}</td>
		<td>{formatRupiah(d.amount)}</td><td>{d.channel ?? '—'}</td><td>{formatRupiah(d.netAmount)}</td><td>{d.status}</td></tr>
	{/each}</tbody>
</table></div>{:else}<p class="muted">Tidak ada donasi yang cocok dengan filter.</p>{/if}
