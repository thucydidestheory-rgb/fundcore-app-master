<script lang="ts">
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;
</script>

<svelte:head><title>Admin — Fundraiser</title></svelte:head>
<h2 class="apage-h">Persetujuan Fundraiser</h2>
<p class="apage-sub">Pendaftar tetap berstatus Donatur sampai pengajuan disetujui.</p>
{#if form?.message}<div class="err">{form.message}</div>{/if}
{#if form?.ok}<div class="ok">Keputusan tersimpan.</div>{/if}
<div class="tbl-wrap"><table class="tbl">
	<thead><tr><th>Nama</th><th>Dokumen</th><th>Status</th><th>Aksi</th></tr></thead>
	<tbody>{#each data.applications as a}
		<tr>
			<td>{a.userName}<br /><span class="small muted">{a.createdAt.slice(0,10)}</span></td>
			<td>{a.docType}: {a.docUrl}</td>
			<td>{a.status}</td>
			<td>{#if a.status === 'pending'}
				<div class="row">
					<form method="POST" action="?/review"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="approve" /><button class="btn btn-brand btn-sm">Setujui</button></form>
					<form method="POST" action="?/review"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="reject" /><input name="note" class="inp" placeholder="Alasan (opsional)" style="width:140px;min-height:36px" /><button class="btn btn-ghost btn-sm">Tolak</button></form>
				</div>
			{:else}<span class="small muted">oleh {a.reviewedBy} · {a.reviewedAt?.slice(0,10)}</span>{/if}</td>
		</tr>
	{/each}</tbody>
</table></div>
{#if !data.applications.length}<p class="muted">Belum ada pengajuan.</p>{/if}
