<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<svelte:head><title>Syarat & Ketentuan — {data.siteName}</title></svelte:head>
<div class="wrap" style="max-width:640px">
	<h1>Syarat & Ketentuan</h1>
	<ol>
		<li>Donasi bersifat sukarela dan tidak dapat ditarik kembali setelah dana disalurkan.</li>
		<li>100% campaign aktif berasal dari penggalang terverifikasi; {data.siteName} dapat membekukan campaign yang melanggar.</li>
		<li>Biaya platform 5% + biaya gateway dipotong dari dana tersalurkan; donatur membayar tepat nominal pilihan.</li>
		<li>Dengan berdonasi Anda setuju menerima notifikasi WhatsApp terkait donasi (dapat berhenti kapan saja dengan membalas STOP).</li>
		<li>Penggalangan dana tunduk pada ketentuan perizinan PUB dan peraturan perundang-undangan yang berlaku.</li>
	</ol>
</div>
