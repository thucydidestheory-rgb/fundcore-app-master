<script lang="ts">
	import { formatRupiah } from '$lib/format';
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;
</script>

<svelte:head><title>Admin — Pembayaran</title></svelte:head>
<h2 class="apage-h">Pengaturan Pembayaran (Winpay)</h2>
<p class="apage-sub">Mode payment gateway, rekonsiliasi, dan catatan biaya channel.</p>
{#if form?.message}<div class="err">{form.message}</div>{/if}
{#if form?.ok}<div class="ok">{form.message}</div>{/if}

<div class="kard">
	<p>Mode: <b>{data.mode}</b> · Environment: <b>{data.env}</b></p>
	<p class="small">API key: {data.maskedKey} · Secret: {data.hasSecret ? 'tersimpan ✅' : 'belum ❌'}</p>
	<p class="small muted">Kredensial disimpan sebagai config Dokku, bukan di repo. Sandbox: sandbox-checkout.winpay.id · Produksi: checkout.winpay.id. Daftar channel aktif & biaya diverifikasi di dashboard Winpay.</p>
</div>

<h2 style="font-size:18px">Rekonsiliasi hari ini</h2>
<div class="kards">
	<div class="kard"><small>Pending</small><b>{data.recon.pendingCount} ({formatRupiah(data.recon.pendingAmount)})</b></div>
	<div class="kard"><small>Paid hari ini</small><b>{formatRupiah(data.recon.paidToday)}</b></div>
</div>

<h2 style="font-size:18px">Catatan channel & biaya (estimasi)</h2>
<form method="POST" action="?/simpan">
	<div class="field"><label for="note">Diisi manual dari kontrak Winpay — dipakai untuk estimasi sebelum callback datang</label>
	<textarea id="note" name="channelNote" class="inp" rows="5">{data.channelNote}</textarea></div>
	<button class="btn btn-brand">Simpan</button>
</form>
