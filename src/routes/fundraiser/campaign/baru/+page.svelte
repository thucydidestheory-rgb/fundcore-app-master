<script lang="ts">
	import { formatRupiah } from '$lib/format';
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;
	const covers = ['/covers/c1.svg','/covers/c2.svg','/covers/c3.svg','/covers/c4.svg','/covers/c5.svg','/covers/c6.svg'];
	let cover = covers[0];
</script>

<svelte:head><title>Buat Campaign Baru</title></svelte:head>
<h1 style="font-size:22px">Buat Campaign Baru</h1>
{#if form?.message}<div class="err">{form.message}</div>{/if}
<form method="POST">
	<div class="field"><label for="title">Judul (min 10 huruf)</label><input id="title" name="title" class="inp" required minlength="10" maxlength="120" /></div>
	<div class="field"><label for="kat">Kategori</label>
		<select id="kat" name="categoryId" class="inp">{#each data.categories as k}<option value={k.id}>{k.icon} {k.name}</option>{/each}</select>
	</div>
	<div class="field"><label for="target">Target dana (Rp, min 100rb)</label><input id="target" name="targetAmount" class="inp" inputmode="numeric" value="10000000" required /></div>
	<div class="field"><label for="dur">Durasi (hari)</label><input id="dur" name="durationDays" class="inp" inputmode="numeric" value="30" required /></div>
	<div class="field"><label for="recv">Penerima manfaat</label><input id="recv" name="receiver" class="inp" placeholder="cth: Keluarga Pak Budi, Surabaya" required /></div>
	<div class="field"><span style="font-weight:700;font-size:14px" id="cover-label">Foto sampul (ringan, SVG)</span>
		<div class="row" role="radiogroup" aria-labelledby="cover-label">{#each covers as c}<label><input type="radio" name="cover" value={c} checked={cover===c} on:change={() => cover=c} /><img src={c} alt="" width="96" height="54" style="border-radius:8px" /></label>{/each}</div>
		<p class="hint">Produksi: gambar diunggah ke MinIO lalu dikompresi WebP/AVIF (F-26).</p>
	</div>
	<div class="field"><label for="story">Cerita (min 50 huruf)</label><textarea id="story" name="story" class="inp" rows="8" required minlength="50"></textarea></div>
	<button class="btn btn-accent btn-block">Tayangkan Campaign</button>
</form>
