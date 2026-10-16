<script lang="ts">
	import { onMount } from 'svelte';
	import Share from '$lib/components/Share.svelte';
	import { formatRupiah } from '$lib/format';
	import type { PageData } from './$types';
	export let data: PageData;

	let status = data.d.status;
	let waits = [5000, 10000, 20000, 30000];
	let i = 0;
	let stopped = false;

	onMount(() => {
		if (status === 'paid' || status === 'expired') return;
		document.addEventListener('visibilitychange', () => {
			stopped = document.hidden;
			// Tab dibuka lagi dan masih pending → lanjutkan polling.
			if (!stopped && (status === 'pending' || status === 'created')) poll();
		});
		poll();
		async function poll() {
			while (i < waits.length && !stopped) {
				await new Promise((r) => setTimeout(r, waits[i++]));
				if (stopped) break;
				try {
					const r = await fetch(`/api/donations/${data.d.id}/status`);
					const j = await r.json();
					status = j.status;
					if (status === 'paid' || status === 'expired' || status === 'failed') break;
				} catch { /* retry */ }
			}
		}
	});
</script>

<svelte:head><title>Terima kasih atas donasinya</title></svelte:head>

<div class="wrap" style="max-width:560px;text-align:center">
	{#if status === 'paid'}
		<div style="font-size:56px">🎉</div>
		<h1>Alhamdulillah, donasi diterima!</h1>
		<p>{formatRupiah(data.d.amount)} untuk “{data.campaignTitle}”. Konfirmasi dikirim ke WhatsApp Anda.</p>
		<div class="row" style="justify-content:center"><Share title={data.campaignTitle} url={`${data.siteUrl}/c/${data.campaignSlug}`} /></div>
		<p style="margin-top:16px"><a class="btn btn-brand" href={`/c/${data.campaignSlug}`}>Kembali ke campaign</a></p>
	{:else if status === 'expired'}
		<div style="font-size:56px">⏰</div>
		<h1>Batas pembayaran lewat</h1>
		<p>Yuk ulangi donasinya — hanya butuh 60 detik.</p>
		<p><a class="btn btn-accent" href={`/donasi/${data.campaignSlug}`}>Donasi Lagi</a></p>
	{:else}
		<div style="font-size:56px">⏳</div>
		<h1>Menunggu konfirmasi pembayaran…</h1>
		<p>Halaman ini memeriksa otomatis. Bila sudah bayar, konfirmasi WhatsApp segera menyusul.</p>
		{#if data.d.invoiceUrl}<p><a class="btn btn-accent" href={data.d.invoiceUrl}>Lanjut Bayar {formatRupiah(data.d.amount)}</a></p>{/if}
	{/if}
</div>
