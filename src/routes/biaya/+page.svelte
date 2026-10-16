<script lang="ts">
	import { formatRupiah } from '$lib/format';
	import type { PageData } from './$types';
	export let data: PageData;
	const contoh = data.contoh;
</script>

<svelte:head><title>Biaya & Transparansi — {data.siteName}</title></svelte:head>
<div class="wrap" style="max-width:640px">
	<h1>Biaya & Transparansi</h1>
	<p>Anda membayar <b>tepat nominal yang dipilih</b> — tidak ada markup di checkout. Biaya dipotong dari dana yang disalurkan:</p>
	<ul>
		<li>Biaya platform: <b>{Math.round(data.fee * 100)}%</b> dari donasi kotor.</li>
		<li>Biaya gateway: sesuai channel (ditanggung merchant dulu, dipotong sebelum disalurkan).</li>
	</ul>
	<p class="small muted">{data.note}</p>
	<h2>Contoh: donasi {formatRupiah(100000)}</h2>
	<div class="tbl-wrap"><table class="tbl"><tbody>
		<tr><td>Donasi kotor</td><td>{formatRupiah(contoh.gross)}</td></tr>
		<tr><td>Biaya gateway (ilustrasi)</td><td>− {formatRupiah(contoh.gatewayFee)}</td></tr>
		<tr><td>Biaya platform {Math.round(data.fee*100)}%</td><td>− {formatRupiah(contoh.platformFee)}</td></tr>
		<tr><td><b>Dana bersih disalurkan</b></td><td><b>{formatRupiah(contoh.net)}</b></td></tr>
	</tbody></table></div>
	<p class="small muted">Progress bar campaign memakai donasi kotor. Pencairan hanya dari donasi berstatus paid.</p>
</div>
