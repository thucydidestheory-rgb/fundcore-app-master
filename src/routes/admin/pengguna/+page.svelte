<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
	export let form: any;
</script>

<svelte:head><title>Admin — Pengguna & Audit</title></svelte:head>
<h2 class="apage-h">Pengguna, Role & Audit Log</h2>
<p class="apage-sub">Kelola peran pengguna; setiap perubahan tercatat di audit log.</p>
{#if form?.message}<div class="err">{form.message}</div>{/if}
{#if form?.ok}<div class="ok">Role diperbarui.</div>{/if}

<div class="tbl-wrap"><table class="tbl">
	<thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Fundraiser</th><th>Ubah role</th></tr></thead>
	<tbody>{#each data.users as u}
		<tr><td>{u.name}</td><td class="small">{u.email}</td><td>{u.role}</td><td>{u.fundraiserStatus}</td>
		<td><form method="POST" action="?/role" class="row">
			<input type="hidden" name="id" value={u.id} />
			<select name="role" class="inp" style="min-height:36px;width:auto">
				{#each ['super_admin','operator','finance','viewer','fundraiser','donor'] as r}<option value={r} selected={u.role===r}>{r}</option>{/each}
			</select>
			<button class="btn btn-ghost btn-sm">Simpan</button>
		</form></td></tr>
	{/each}</tbody>
</table></div>
<p class="hint">Hanya Super Admin yang dapat mengubah role. Setiap perubahan tercatat di audit log.</p>

<h2 style="font-size:18px;margin-top:20px">Audit log (80 terakhir)</h2>
<div class="tbl-wrap"><table class="tbl">
	<thead><tr><th>Waktu</th><th>Aktor</th><th>Aksi</th><th>Entitas</th><th>IP</th></tr></thead>
	<tbody>{#each data.logs as l}<tr><td class="small">{l.createdAt.slice(0,16)}</td><td>{l.actorName}</td><td>{l.action}</td><td class="small">{l.entity}</td><td class="small">{l.ip}</td></tr>{/each}</tbody>
</table></div>
