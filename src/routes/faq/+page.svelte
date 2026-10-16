<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<svelte:head><title>FAQ — {data.siteName}</title></svelte:head>
<div class="wrap" style="max-width:640px">
	<h1>Pertanyaan Umum</h1>
	{#each data.faqs as f}<div class="kard" style="margin-bottom:10px"><b>{f.q}</b><p>{f.a}</p></div>{/each}
</div>
