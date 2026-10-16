<script lang="ts">
	import type { ActionData } from './$types';
	export let form: ActionData;
</script>

<svelte:head><title>Masuk</title></svelte:head>
<div class="wrap" style="max-width:440px">
	<h1 style="font-size:22px">Masuk</h1>
	{#if form?.message}<div class="err">{form.message}</div>{/if}
	<form method="POST">
		<div class="field"><label for="email">Email</label><input id="email" name="email" class="inp" inputmode="email" required /></div>
		<div class="field"><label for="pw">Password</label><input id="pw" name="password" type="password" class="inp" required /></div>
		<button class="btn btn-brand btn-block">Masuk</button>
	</form>
	<p class="small">Belum punya akun? <a href="/daftar">Daftar gratis</a> — otomatis jadi Donatur.</p>
</div>
