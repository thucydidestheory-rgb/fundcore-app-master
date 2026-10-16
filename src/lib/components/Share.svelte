<script lang="ts">
	export let title = '';
	export let url = '';
	let buka = false;
	let copied = false;
	const text = encodeURIComponent(`Yuk bantu "${title}" — donasi cepat tanpa daftar: `);
	const shareUrl = encodeURIComponent(url);
	const waHref = `https://wa.me/?text=${text}${shareUrl}`;
	async function copy() {
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch { /* clipboard tidak tersedia */ }
	}
	function tutup(e: KeyboardEvent) { if (e.key === 'Escape') buka = false; }
</script>

<svelte:window on:keydown={tutup} />

<button class="btn btn-ghost" on:click={() => (buka = true)}>🔗 Bagikan</button>

{#if buka}
	<div class="modal-ov">
		<div class="modal" role="dialog" aria-modal="true" aria-label="Bagikan campaign">
			<div class="row" style="justify-content:space-between">
				<b>Bagikan melalui</b>
				<button class="btn btn-ghost btn-sm" on:click={() => (buka = false)}>✕ Tutup</button>
			</div>
			<div class="share-grid">
				<button class="btn btn-ghost btn-sm" on:click={copy}>{copied ? '✓ Tersalin!' : '⧉ Salin link'}</button>
				<a class="btn btn-wa btn-sm" href={waHref} target="_blank" rel="noopener">WhatsApp</a>
				<a class="btn btn-ghost btn-sm" href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener">Facebook</a>
				<a class="btn btn-ghost btn-sm" href={`https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}`} target="_blank" rel="noopener">X</a>
				<a class="btn btn-ghost btn-sm" href={`https://telegram.me/share/url?text=${text}&url=${shareUrl}`} target="_blank" rel="noopener">Telegram</a>
			</div>
		</div>
	</div>
{/if}

<svelte:head>
	<meta property="og:type" content="article" />
</svelte:head>
