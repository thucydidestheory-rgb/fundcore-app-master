<script lang="ts">
	import { formatRupiah } from '$lib/format';
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;
</script>

<svelte:head><title>Kelola — {data.c.title}</title></svelte:head>
<h1 style="font-size:20px">{data.c.title}</h1>
<p class="small muted">Terkumpul {formatRupiah(data.c.collectedAmount)} · Dana bersih siap cair {formatRupiah(data.net)}</p>
{#if form?.ok}<div class="ok">Tersimpan.</div>{/if}
{#if form?.message}<div class="err">{form.message}</div>{/if}

<h2 style="font-size:18px">Posting kabar terbaru</h2>
<form method="POST" action="?/kabar">
	<div class="field"><label for="t">Judul</label><input id="t" name="title" class="inp" required /></div>
	<div class="field"><label for="b">Isi kabar</label><textarea id="b" name="body" class="inp" rows="4" required></textarea></div>
	<button class="btn btn-brand">Posting Kabar</button>
</form>

<h2 style="font-size:18px;margin-top:20px">Ajukan pencairan</h2>
<form method="POST" action="?/cairkan" class="row">
	<input name="amount" class="inp" inputmode="numeric" placeholder="Nominal (Rp)" style="flex:1" />
	<button class="btn btn-accent">Ajukan</button>
</form>
<p class="hint">Pencairan manual — admin menyetujui & mencatat bukti transfer (D-05).</p>
