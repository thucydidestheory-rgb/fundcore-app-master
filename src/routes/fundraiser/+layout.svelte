<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="wrap">
	<div class="admin-layout">
		<nav class="sidenav" aria-label="Fundraiser">
			<a href="/fundraiser" class:on={$page.url.pathname==='/fundraiser'}>📊 Dashboard</a>
			<a href="/fundraiser/campaign/baru" class:on={$page.url.pathname.includes('/baru')}>➕ Campaign Baru</a>
			<a href="/jadi-fundraiser">📝 Status Verifikasi</a>
			<form method="POST" action="/keluar" style="display:contents"><button class="btn btn-ghost btn-sm">Keluar</button></form>
		</nav>
		<div><slot /></div>
	</div>
</div>
