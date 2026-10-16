<script lang="ts">
	import { formatRupiah, timeAgo } from '$lib/format';
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<svelte:head><title>Riwayat Donasiku</title><meta name="robots" content="noindex" /></svelte:head>

<div class="wrap" style="max-width:640px">
	<h1 style="font-size:22px">Riwayat donasi {data.name}</h1>
	{#each data.items as d}
		<div class="kard" style="margin-bottom:10px">
			<b><a href={`/c/${d.campaignSlug}`}>{d.campaignTitle}</a></b>
			<p>{formatRupiah(d.amount)} · <span class="badge">{d.status}</span> <span class="muted small">· {timeAgo(d.createdAt)}</span></p>
			{#if d.status === 'pending' && d.invoiceUrl}<a class="btn btn-accent btn-sm" href={d.invoiceUrl}>Lanjut Bayar</a>{/if}
		</div>
	{/each}
</div>
