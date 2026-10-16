<script lang="ts">
	import type { DayStat } from '$lib/types';
	// Grafik tren SVG ringan (tanpa library chart) — dashboard admin.
	export let stats: DayStat[] = [];
	export let range = 30;
	$: max = Math.max(1, ...stats.map((s) => s.gross));
	$: pts = stats.map((s, i) => {
		const x = stats.length === 1 ? 150 : 10 + (i * 280) / (stats.length - 1);
		const y = 95 - (s.gross / max) * 85;
		return { x: +x.toFixed(1), y: +y.toFixed(1) };
	});
	$: mid = Math.floor((stats.length - 1) / 2);
</script>

<div class="kard" style="grid-column:1/-1">
	<small>Tren donasi kotor harian ({range} hari)</small>
	{#if !stats.length || max <= 1}
		<p class="muted">Belum ada data pada rentang ini.</p>
	{:else}
		<svg viewBox="0 0 300 110" width="100%" height="140" role="img" aria-label="Grafik tren donasi harian">
			<line x1="10" y1="95" x2="290" y2="95" stroke="var(--color-border)" stroke-width="1" />
			<polygon points={`10,95 ${pts.map((p) => `${p.x},${p.y}`).join(' ')} 290,95`} fill="var(--color-brand)" opacity=".08" />
			<polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--color-brand)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
			{#each pts as p}<circle cx={p.x} cy={p.y} r="3" fill="var(--color-accent)" />{/each}
		</svg>
		<div class="row small muted">
			<span>{stats[0]?.day.slice(5, 10)}</span>
			{#if stats.length > 2}<span style="margin-left:auto;margin-right:auto">{stats[mid]?.day.slice(5, 10)}</span>{/if}
			<span style="margin-left:auto">{stats[stats.length-1]?.day.slice(5, 10)}</span>
		</div>
	{/if}
</div>
