<script lang="ts">
	import { formatRupiah } from '$lib/format';
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;
</script>

<svelte:head><title>Admin — Campaign</title></svelte:head>
<h2 class="apage-h">Manajemen Campaign</h2>
<p class="apage-sub">Pantau, bekukan, atau selesaikan campaign; buat campaign atas nama yayasan.</p>
{#if form?.message}<div class="err">{form.message}</div>{/if}
{#if form?.ok}<div class="ok">Tersimpan.</div>{/if}

<h3>Daftar campaign</h3>
<div class="tbl-wrap"><table class="tbl">
	<thead><tr><th>Judul</th><th>Terkumpul</th><th>Donatur</th><th>Status</th><th>Aksi</th></tr></thead>
	<tbody>{#each data.campaigns as c}
		<tr>
			<td><a href={`/c/${c.slug}`}>{c.title}</a></td>
			<td>{formatRupiah(c.collectedAmount)}</td>
			<td>{c.donorCount}</td>
			<td><span class="badge">{c.status}</span></td>
			<td><div class="row">
				<form method="POST" action="?/freeze"><input type="hidden" name="id" value={c.id} /><button class="btn btn-ghost btn-sm">{c.status === 'frozen' ? 'Aktifkan' : 'Bekukan'}</button></form>
				{#if c.status !== 'finished'}
					<form method="POST" action="?/finish"><input type="hidden" name="id" value={c.id} /><button class="btn btn-ghost btn-sm">Selesai</button></form>
				{/if}
			</div></td>
		</tr>
	{/each}</tbody>
</table></div>
{#if !data.campaigns.length}<p class="muted">Belum ada campaign.</p>{/if}

<div class="kard" style="margin-top:20px">
	<h3>Buat campaign langsung (atas nama yayasan)</h3>
	<form method="POST" action="?/buat">
		<div class="field"><label>Judul<input name="title" class="inp" required minlength="10" /></label></div>
		<div class="field"><label>Kategori<select name="categoryId" class="inp">{#each data.categories as k}<option value={k.id}>{k.name}</option>{/each}</select></label></div>
		<div class="field"><label>Target (Rp)<input name="targetAmount" class="inp" inputmode="numeric" value="50000000" /></label></div>
		<div class="field"><label>Durasi (hari)<input name="durationDays" class="inp" inputmode="numeric" value="60" /></label></div>
		<div class="field"><label>Penerima<input name="receiver" class="inp" required /></label></div>
		<div class="field"><label>Cerita<textarea name="story" class="inp" rows="4" required></textarea></label></div>
		<button class="btn btn-brand">Tayangkan</button>
	</form>
</div>
