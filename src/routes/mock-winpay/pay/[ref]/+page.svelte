<script lang="ts">
	import { formatRupiah } from '$lib/format';
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;
	const kadaluarsa = data.d.status === 'expired' || data.d.status === 'failed';
	const lunas = data.d.status === 'paid';
</script>

<svelte:head><title>Simulasi Pembayaran Winpay</title><meta name="robots" content="noindex" /></svelte:head>

<div class="wrap" style="max-width:480px">
	<div class="kard" style="margin-top:24px">
		<small class="muted">SIMULASI CHECKOUT WINPAY (mode mock)</small>
		<h1 style="font-size:20px">Bayar {formatRupiah(data.d.amount)}</h1>
		<p class="small muted">{data.campaignTitle} · Ref {data.d.invoiceRef}</p>
		{#if form?.message}<div class="err">{form.message}</div>{/if}
		{#if form?.ok}
			<div class="ok">Pembayaran berhasil disimulasikan.</div>
			<p><a class="btn btn-brand btn-block" href={`/terima-kasih/${form.donationId}`}>Lihat Status Donasi</a></p>
		{:else if lunas}
			<div class="ok">Invoice ini sudah dibayar.</div>
			<p><a class="btn btn-brand btn-block" href={`/terima-kasih/${data.d.id}`}>Lihat Status</a></p>
		{:else if kadaluarsa}
			<div class="err">Invoice sudah kedaluwarsa dan tidak bisa dibayar lagi.</div>
			<p><a class="btn btn-accent btn-block" href="/">Kembali Berdonasi</a></p>
		{:else}
			<form method="POST" action="?/bayar">
				<div class="field"><label for="ch">Pilih channel</label>
					<select id="ch" name="channel" class="inp">
						<option>QRIS</option><option>BCA VA</option><option>BRI VA</option>
						<option>DANA</option><option>OVO</option><option>GoPay</option>
					</select>
				</div>
				<button class="btn btn-accent btn-block">Saya Sudah Bayar (simulasi)</button>
			</form>
		{/if}
		<p class="hint">Produksi: halaman ini digantikan checkout.winpay.id resmi.</p>
	</div>
</div>
