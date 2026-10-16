<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<svelte:head><title>Kebijakan Privasi — {data.siteName}</title></svelte:head>
<div class="wrap" style="max-width:640px">
	<h1>Kebijakan Privasi (UU PDP)</h1>
	<ol>
		<li>Kami menyimpan nama, nomor WhatsApp, dan email (opsional) hanya untuk memproses donasi & notifikasi.</li>
		<li>Dokumen identitas fundraiser disimpan privat dengan akses terbatas dan tidak dibagikan.</li>
		<li>Data tidak dijual. Anda dapat meminta hapus/ralat data via halaman Kontak.</li>
		<li>Notifikasi WhatsApp dikirim atas persetujuan (opt-in) saat checkout.</li>
	</ol>
</div>
