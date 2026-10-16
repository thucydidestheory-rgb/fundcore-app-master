<script lang="ts">
	import { formatRupiah, parseRupiah } from '$lib/format';
	import { QUICK_AMOUNTS } from '$lib/presets';
	import type { PageData } from './$types';
	export let data: PageData;

	let nominal = 50000;
	let nominalText = '50.000';
	let nama = '';
	let wa = '';
	let email = '';
	let anonim = false;
	let doa = '';
	let setuju = false;
	let err = '';
	let loading = false;

	function pilih(n: number) { nominal = n; nominalText = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
	function ketik() { nominal = parseRupiah(nominalText); }

	async function bayar() {
		err = '';
		if (nominal < data.minDonation) { err = `Nominal minimum ${formatRupiah(data.minDonation)}.`; return; }
		if (!nama.trim()) { err = 'Nama wajib diisi.'; return; }
		let digits = wa.replace(/[^0-9]/g, '');
		if (digits.startsWith('62')) digits = '0' + digits.slice(2);
		if (!/^08[0-9]{8,12}$/.test(digits)) { err = 'Nomor WhatsApp tidak valid (contoh 08123456789).'; return; }
		wa = digits;
		if (!setuju) { err = 'Centang persetujuan notifikasi WhatsApp dulu.'; return; }
		loading = true;
		try {
			const r = await fetch('/api/donations', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ campaignId: data.c.id, amount: nominal, donorName: nama.trim(), donorPhone: wa.trim(), donorEmail: email.trim() || null, isAnonymous: anonim, prayer: doa.trim() || null, utmSource: data.utm || null })
			});
			const j = await r.json();
			if (!r.ok) { err = j.message ?? 'Gagal membuat donasi.'; loading = false; return; }
			location.href = j.redirectUrl; // ke halaman bayar Winpay (F-13)
		} catch { err = 'Koneksi bermasalah. Coba lagi.'; loading = false; }
	}
</script>

<svelte:head><title>Donasi — {data.c.title}</title></svelte:head>

<div class="wrap" style="max-width:560px">
	<h1 style="font-size:20px">Donasi untuk “{data.c.title}”</h1>
	<p class="small muted">Terkumpul {formatRupiah(data.c.collectedAmount)} dari {formatRupiah(data.c.targetAmount)}</p>

	{#if err}<div class="err" role="alert">{err}</div>{/if}

	<form on:submit|preventDefault={bayar}>
		<div class="field">
			<span class="flabel" id="nom-label">Nominal donasi</span>
			<div class="nom-grid" role="group" aria-labelledby="nom-label">
				{#each QUICK_AMOUNTS as n}<button type="button" class="nom" class:on={nominal===n} on:click={() => pilih(n)}>{formatRupiah(n)}</button>{/each}
			</div>
			<input class="inp" inputmode="numeric" bind:value={nominalText} on:input={ketik} aria-label="Nominal bebas" />
			<p class="hint">Anda membayar tepat {formatRupiah(nominal || 0)} — tanpa tambahan biaya.</p>
		</div>
		<div class="field"><label for="nama">Nama</label><input id="nama" class="inp" bind:value={nama} autocomplete="name" /></div>
		<div class="field"><label for="wa">Nomor WhatsApp (untuk link bayar & konfirmasi)</label><input id="wa" class="inp" inputmode="tel" placeholder="0812…" bind:value={wa} autocomplete="tel" /></div>
		<div class="field"><label for="email">Email (opsional)</label><input id="email" class="inp" inputmode="email" bind:value={email} autocomplete="email" /></div>
		<div class="field"><label for="doa">Doa/komentar (opsional)</label><textarea id="doa" class="inp" rows="2" bind:value={doa} /></div>
		<div class="field row">
			<label class="row" style="font-weight:400"><input type="checkbox" bind:checked={anonim} style="width:22px;height:22px" /> Sembunyikan namaku (tampil “Orang Baik”)</label>
		</div>
		<div class="field row">
			<label class="row small" style="font-weight:400"><input type="checkbox" bind:checked={setuju} style="width:22px;height:22px" /> Saya setuju menerima notifikasi WhatsApp tentang donasi ini.</label>
		</div>
		<button class="btn btn-accent btn-block" disabled={loading}>{loading ? 'Membuat pembayaran…' : `Bayar ${formatRupiah(nominal || 0)}`}</button>
		<p class="hint" style="text-align:center">Aman · QRIS / VA / e-Wallet · <a href="/biaya">Lihat transparansi biaya</a></p>
	</form>
</div>
