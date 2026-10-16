<script lang="ts">
	import { formatRupiah } from '$lib/format';
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;
	const faqText = data.contents.faqs.map((f) => `${f.q}\n${f.a}`).join('\n---\n');
</script>

<svelte:head><title>Admin — Konten & Pencairan</title></svelte:head>
<h2 class="apage-h">Konten & Pencairan</h2>
<p class="apage-sub">Setujui pencairan dana fundraiser dan kelola halaman situs.</p>
{#if form?.ok}<div class="ok">Tersimpan.</div>{/if}

<h2 style="font-size:18px">Pencairan dana (manual)</h2>
{#each data.disbursements as p}
	<div class="kard" style="margin-bottom:10px">
		<b>{formatRupiah(p.amount)}</b> · {p.campaignId} · status: {p.status}
		{#if p.status !== 'transferred'}
			<div class="row" style="margin-top:8px">
				<form method="POST" action="?/pencairan"><input type="hidden" name="id" value={p.id} /><input type="hidden" name="decision" value="approve" /><button class="btn btn-brand btn-sm">Setujui</button></form>
				<form method="POST" action="?/pencairan" class="row"><input type="hidden" name="id" value={p.id} /><input type="hidden" name="decision" value="transfer" /><input name="proof" class="inp" placeholder="Link bukti transfer" style="min-height:36px;width:180px" /><button class="btn btn-accent btn-sm">Catat Transfer</button></form>
			</div>
		{:else}<p class="small muted">Bukti: {p.proofUrl}</p>{/if}
	</div>
{/each}
{#if !data.disbursements.length}<p class="muted">Belum ada pengajuan pencairan.</p>{/if}

<h2 style="font-size:18px;margin-top:20px">Konten situs</h2>
<form method="POST" action="?/konten">
	<div class="field"><label>Tentang kami<textarea name="aboutBody" class="inp" rows="4">{data.contents.aboutBody}</textarea></label></div>
	<div class="field"><label>Visi<textarea name="visi" class="inp" rows="2">{data.contents.visi}</textarea></label></div>
	<div class="field"><label>Misi (satu per baris)<textarea name="misi" class="inp" rows="5">{data.contents.misi}</textarea></label></div>
	<div class="field"><label>Nilai (satu per baris)<textarea name="nilai" class="inp" rows="5">{data.contents.nilai}</textarea></label></div>
	<div class="field"><label>FAQ (format: pertanyaan baris 1, jawaban baris berikut; pisahkan dengan baris “---”)<textarea name="faq" class="inp" rows="10">{faqText}</textarea></label></div>
	<button class="btn btn-brand">Simpan Konten</button>
</form>
