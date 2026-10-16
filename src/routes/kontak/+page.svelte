<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<svelte:head><title>Kontak — {data.siteName}</title></svelte:head>
<div class="wrap" style="max-width:640px">
	<h1>Kontak</h1>
	<p>Ada kendala donasi atau pertanyaan campaign? Hubungi kami:</p>
	<ul><li>WhatsApp/Telepon: {data.contact}</li><li>Alamat: {data.address}</li></ul>
	<p><a class="btn btn-wa" href={`https://wa.me/${data.contact.replace(/[^0-9]/g, '')}`}>Chat WhatsApp</a></p>
</div>
