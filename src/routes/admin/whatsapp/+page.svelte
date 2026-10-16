<script lang="ts">
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;
	const tpl = (t: string) => data.settings.find((s) => s.type === t)!;
</script>

<svelte:head><title>Admin — WhatsApp</title></svelte:head>
<h2 class="apage-h">Pengaturan WhatsApp</h2>
<p class="apage-sub">Nomor CS (WAHA), saklar & template notifikasi, dan log pengiriman.</p>
{#if form?.message}<div class="err">{form.message}</div>{/if}
{#if form?.ok}<div class="ok">Tersimpan. {form.hasil ?? ''}</div>{/if}

<h2 style="font-size:18px">Nomor CS (WAHA)</h2>
{#each data.accounts as a}
	<div class="kard" style="margin-bottom:10px">
		<b>{a.label}</b> <span class="badge">{a.status}</span> {#if !a.isActive}<span class="badge urgent">nonaktif</span>{/if}
		<p class="small muted">{a.profileName ?? '—'} · {a.phone ?? '—'} · session `{a.session}` · dicek {a.lastCheckedAt?.slice(0,16) ?? 'belum'}</p>
		<form method="POST" action="?/simpanAkun" class="row">
			<input type="hidden" name="id" value={a.id} />
			<input name="label" class="inp" value={a.label} style="flex:1;min-width:120px" />
			<input name="baseUrl" class="inp" value={a.baseUrl} placeholder="https://waha.domain.com" style="flex:2;min-width:160px" />
			<input name="session" class="inp" value={a.session} style="width:110px" />
			<input name="apiKey" class="inp" type="password" placeholder="API key (kosong = tetap)" style="flex:1;min-width:130px" />
			<button class="btn btn-brand btn-sm">Simpan</button>
		</form>
		<div class="row" style="margin-top:8px">
			<form method="POST" action="?/tesKoneksi"><input type="hidden" name="id" value={a.id} /><button class="btn btn-ghost btn-sm">Tes Koneksi</button></form>
			<form method="POST" action="?/toggleAkun"><input type="hidden" name="id" value={a.id} /><button class="btn btn-ghost btn-sm">{a.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button></form>
			<form method="POST" action="?/tesKirim" class="row"><input type="hidden" name="id" value={a.id} /><input name="to" class="inp" placeholder="628…" style="width:130px;min-height:36px" /><button class="btn btn-ghost btn-sm">Kirim tes</button></form>
		</div>
	</div>
{/each}

<h3>Tambah nomor CS</h3>
<form method="POST" action="?/simpanAkun" class="row">
	<input name="label" class="inp" placeholder="Label, cth CS 1" required style="flex:1" />
	<input name="baseUrl" class="inp" placeholder="https://waha.domain.com" style="flex:2" />
	<input name="session" class="inp" placeholder="session (cth default)" value="default" style="width:130px" />
	<input name="apiKey" class="inp" placeholder="API key" type="password" style="flex:1" />
	<button class="btn btn-brand btn-sm">Tambah</button>
</form>

<h2 style="font-size:18px;margin-top:20px">Saklar & template notifikasi</h2>
<p class="hint">Variabel: {'{nama} {nominal} {campaign} {link_bayar} {batas_bayar} {link_campaign} {link_riwayat} {nama_cs} {nama_situs}'}</p>
<form method="POST" action="?/simpanTemplate">
	{#each ['created','success','followup'] as t}
		<div class="field">
			<label class="row"><input type="checkbox" name={`on_${t}`} checked={tpl(t).isActive} style="width:22px;height:22px" />
				{t === 'created' ? 'Donasi dibuat' : t === 'success' ? 'Donasi sukses' : 'Follow-up pending'} — aktif</label>
			<textarea name={`tpl_${t}`} class="inp" rows="3">{tpl(t).template}</textarea>
		</div>
	{/each}
	<div class="field"><label>Jeda follow-up (menit, 15–1440; harus &lt; masa invoice {data.site.invoiceHours * 60} mnt)
		<input name="followupDelay" class="inp" inputmode="numeric" value={data.site.followupMin} /></label></div>
	<button class="btn btn-brand">Simpan Template</button>
</form>

<h2 style="font-size:18px;margin-top:20px">Log pengiriman (60 terakhir)</h2>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Tipe</th><th>Tujuan</th><th>Status</th><th>Pesan</th><th></th></tr></thead>
<tbody>{#each data.logs as m}
	<tr><td class="small">{m.scheduledAt.slice(5,16)}</td><td>{m.type}</td><td>{m.toPhone}</td><td>{m.status}{m.attempts ? ` (${m.attempts}x)` : ''}{m.error ? ` — ${m.error}` : ''}</td><td class="small">{m.payload}</td>
	<td>{#if m.status==='failed'||m.status==='cancelled'}<form method="POST" action="?/kirimUlang"><input type="hidden" name="id" value={m.id} /><button class="btn btn-ghost btn-sm">Ulang</button></form>{/if}</td></tr>
{/each}</tbody></table></div>
