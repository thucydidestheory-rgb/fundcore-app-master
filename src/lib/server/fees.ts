// Perhitungan dana bersih — PRD §6.7 (satu-satunya sumber kebenaran).
//   dana bersih = donasi kotor − biaya gateway − 5% × donasi kotor
// Donatur membayar tepat nominal yang dipilih (tidak ada markup di checkout).

export const PLATFORM_FEE_PCT = 0.05;

export interface FeeBreakdown {
	gross: number;
	gatewayFee: number;
	platformFee: number;
	net: number;
}

export function calcFees(gross: number, gatewayFee: number, platformFeePct = PLATFORM_FEE_PCT): FeeBreakdown {
	const g = Math.max(0, Math.round(gross));
	const gw = Math.max(0, Math.min(g, Math.round(gatewayFee)));
	const pf = Math.round(g * platformFeePct);
	return { gross: g, gatewayFee: gw, platformFee: pf, net: Math.max(0, g - gw - pf) };
}
