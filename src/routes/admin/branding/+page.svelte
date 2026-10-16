<script lang="ts">
	import { THEME_PRESETS } from '$lib/presets';
	import { themeCss, checkThemeContrast } from '$lib/format';
	import type { PageData, ActionData } from './$types';
	export let data: PageData;
	export let form: ActionData;

	let bg = data.site.colorBg, brand = data.site.colorBrand, accent = data.site.colorAccent;
	let nama = data.site.siteName;
	$: warns = form?.warns ?? checkThemeContrast(bg, brand, accent);
	function preset(p: { bg: string; brand: string; accent: string }) { bg = p.bg; brand = p.brand; accent = p.accent; }
</script>

<svelte:head><title>Admin — Branding & Tema</title></svelte:head>
<h2 class="apage-h">Branding & Tema</h2>
<p class="apage-sub">Nama, logo, dan tiga warna (aturan 60/30/10) — berlaku instan tanpa deploy ulang.</p>
{#if form?.message}<div class="err">{form.message}</div>{/if}
{#if form?.ok}<div class="ok">Tema tersimpan — berlaku instan tanpa deploy ulang.</div>{/if}
{#each warns as w}<div class="err">⚠️ {w}</div>{/each}

<div class="row" style="align-items:flex-start">
	<form method="POST" style="flex:1;min-width:260px">
		<div class="field"><label>Nama situs<input name="siteName" class="inp" bind:value={nama} required /></label></div>
		<div class="field"><label>Tagline<input name="tagline" class="inp" value={data.site.tagline} /></label></div>
		<div class="field"><label>Logo (URL)<input name="logoUrl" class="inp" value={data.site.logoUrl} /></label></div>
		<div class="field"><label>🎨 Warna dasar 60% (background)<input type="color" name="colorBg" bind:value={bg} style="width:100%;height:48px" /></label></div>
		<div class="field"><label>🎨 Warna brand 30% (header, progress)<input type="color" name="colorBrand" bind:value={brand} style="width:100%;height:48px" /></label></div>
		<div class="field"><label>🎨 Aksen 10% (tombol donasi)<input type="color" name="colorAccent" bind:value={accent} style="width:100%;height:48px" /></label></div>
		<div class="field"><label>Nama yayasan<input name="orgName" class="inp" value={data.site.orgName} /></label></div>
		<div class="field"><label>Alamat<input name="orgAddress" class="inp" value={data.site.orgAddress} /></label></div>
		<div class="field"><label>Kontak<input name="orgContact" class="inp" value={data.site.orgContact} /></label></div>
		<div class="field"><label>SK Kemenkumham<input name="skKemenkumham" class="inp" value={data.site.skKemenkumham} /></label></div>
		<div class="field"><label>Instagram (URL, opsional)<input name="socInstagram" class="inp" value={data.site.socials?.instagram ?? ''} placeholder="https://instagram.com/..." /></label></div>
		<div class="field"><label>TikTok (URL, opsional)<input name="socTiktok" class="inp" value={data.site.socials?.tiktok ?? ''} placeholder="https://tiktok.com/@..." /></label></div>
		<div class="field"><label>Facebook (URL, opsional)<input name="socFacebook" class="inp" value={data.site.socials?.facebook ?? ''} placeholder="https://facebook.com/..." /></label></div>
		<div class="field"><label>YouTube (URL, opsional)<input name="socYoutube" class="inp" value={data.site.socials?.youtube ?? ''} placeholder="https://youtube.com/@..." /></label></div>
		<button class="btn btn-brand btn-block">Simpan Tema</button>
	</form>

	<div style="flex:1;min-width:260px">
		<h3>Pratinjau mobile</h3>
		<div style="border:1px solid #ccc;border-radius:16px;overflow:hidden;max-width:280px">
			{@html `<style>${themeCss(bg, brand, accent)}</style>`}
			<div style="background:var(--color-brand);color:var(--color-on-brand);padding:10px 12px;font-weight:800">{nama || data.site.siteName}</div>
			<div style="background:var(--color-bg);padding:12px">
				<div style="background:#fff;border:1px solid var(--color-border);border-radius:12px;padding:10px">
					<b>Bantu Anak Sekolah</b>
					<div style="height:8px;border-radius:99px;background:#eee;margin:8px 0"><div style="width:65%;height:100%;border-radius:99px;background:var(--color-brand)"></div></div>
					<button style="width:100%;min-height:44px;border:0;border-radius:12px;background:var(--color-accent);color:var(--color-on-accent);font-weight:700">Donasi Sekarang</button>
				</div>
			</div>
		</div>
		<h3 style="margin-top:12px">Preset siap pakai</h3>
		{#each THEME_PRESETS as p}<button class="chip" style="margin:0 6px 6px 0" on:click={() => preset(p)}>{p.name}</button>{/each}
	</div>
</div>
