<script lang="ts">
	import type { ActionData } from './$types';
	export let form: ActionData;
</script>

<svelte:head><title>Daftar — gratis</title></svelte:head>
<div class="wrap" style="max-width:440px">
	<h1 style="font-size:22px">Daftar — gratis</h1>
	<p class="small muted">Semua pendaftar otomatis berstatus <b>Donatur</b>. Untuk membuat campaign, ajukan jadi Fundraiser setelah masuk.</p>
	{#if form?.message}<div class="err">{form.message}</div>{/if}
	<form method="POST">
		<div class="field"><label for="name">Nama lengkap</label><input id="name" name="name" class="inp" required /></div>
		<div class="field"><label for="email">Email</label><input id="email" name="email" class="inp" inputmode="email" required /></div>
		<div class="field"><label for="phone">Nomor WhatsApp</label><input id="phone" name="phone" class="inp" inputmode="tel" placeholder="0812…" required /></div>
		<div class="field"><label for="pw">Password (min 6 karakter)</label><input id="pw" name="password" type="password" class="inp" required minlength="6" /></div>
		<button class="btn btn-accent btn-block">Daftar</button>
	</form>
	<p class="small">Sudah punya akun? <a href="/masuk">Masuk</a></p>
</div>
