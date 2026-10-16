<script lang="ts">
	import { formatRupiah, formatRingkas, progressPct, sisaHari } from '$lib/format';
	import type { Campaign } from '$lib/types';
	export let c: Campaign;
	export let ownerName = '';
	export let catName = '';
	/** ringkas = gaya kartu "Campaign Terbaru" niatbaik (nominal pendek). */
	export let ringkas = false;
</script>

<article class="card">
	<a href={`/c/${c.slug}`} aria-label={c.title} tabindex="-1">
		<img class="cover" src={c.coverUrl} alt={c.title} loading="lazy" width="640" height="360" />
	</a>
	<div class="card-body">
		{#if catName}<small class="muted">{catName}</small>{/if}
		{#if c.urgent}<span class="badge urgent">Mendesak</span>{/if}
		<p class="card-nom num">{ringkas ? `Rp${formatRingkas(c.collectedAmount)}` : formatRupiah(c.collectedAmount)}</p>
		<h3><a href={`/c/${c.slug}`}>{c.title}</a></h3>
		<div class="org">
			<span>{ownerName || c.ownerName}</span>
			{#if c.verified}<span class="badge">✓</span>{/if}
		</div>
		<div class="progress" role="progressbar" aria-valuenow={progressPct(c.collectedAmount, c.targetAmount)} aria-valuemin="0" aria-valuemax="100">
			<i style={`width:${progressPct(c.collectedAmount, c.targetAmount)}%`} />
		</div>
		<div class="meta"><span>{c.donorCount} donatur</span><span>{sisaHari(c.endAt)} hari lagi</span></div>
	</div>
</article>
