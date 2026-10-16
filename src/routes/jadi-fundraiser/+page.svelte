<script lang="ts">
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;
</script>

<svelte:head><title>Jadi Fundraiser</title></svelte:head>
<div class="wrap" style="max-width:560px">
	<h1 style="font-size:22px">Jadi Fundraiser</h1>
	<ol class="small">
		<li>Daftar akun (otomatis Donatur).</li>
		<li>Unggah dokumen identitas — disimpan privat & terenkripsi aksesnya.</li>
		<li>Admin verifikasi (maks 2 hari kerja). Campaign Anda langsung tayang setelah disetujui.</li>
	</ol>
	{#if !data.user}
		<p><a class="btn btn-brand" href="/masuk?next=/jadi-fundraiser">Masuk / Daftar dulu</a></p>
	{:else if data.user.fundraiserStatus === 'approved'}
		<div class="ok">Akun Anda sudah disetujui. <a href="/fundraiser">Buka dashboard fundraiser →</a></div>
	{:else if data.pending || data.user.fundraiserStatus === 'pending'}
		<div class="ok">Pengajuan Anda sedang diverifikasi admin. Kami kabari via WhatsApp/email.</div>
	{:else}
		{#if form?.ok}<div class="ok">Pengajuan terkirim! Menunggu verifikasi admin.</div>{/if}
		<form method="POST">
			<div class="field"><label for="docType">Jenis dokumen</label>
				<select id="docType" name="docType" class="inp"><option>KTP</option><option>SK Yayasan</option><option>Surat Tugas</option><option>Lainnya</option></select>
			</div>
			<div class="field"><label for="docUrl">Link / nama file dokumen</label>
				<input id="docUrl" name="docUrl" class="inp" placeholder="ktp-saya.jpg (unggah via admin pada MVP demo)" required />
				<p class="hint">MVP demo: tulis nama file; di produksi file diunggah ke MinIO privat (pre-signed URL).</p>
			</div>
			<button class="btn btn-accent btn-block">Kirim Pengajuan</button>
		</form>
	{/if}
</div>
