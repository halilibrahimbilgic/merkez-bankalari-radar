import type { InflationReading } from "./sources/inflation";
import type { BankCode } from "./types";

/**
 * Reel faiz: politika faizi − son yıllık TÜFE (geçmişe dönük, basit fark).
 * Fed için hedef aralığın orta noktası alınır. Yüksek enflasyonda basit fark
 * gerçek getiriyi abartır; kesin (Fisher) değer ayrıca verilir:
 * (1 + i) / (1 + π) − 1.
 */
export interface RealRate {
  bankCode: BankCode;
  policy: number;
  inflation: InflationReading;
  real: number;
  fisher: number;
}

export function realRate(
  rate: { bankCode: BankCode; rate: number; rateLower?: number },
  inflation: InflationReading,
): RealRate {
  const policy = rate.rateLower === undefined ? rate.rate : (rate.rate + rate.rateLower) / 2;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    bankCode: rate.bankCode,
    policy,
    inflation,
    real: r2(policy - inflation.yoy),
    fisher: r2(((1 + policy / 100) / (1 + inflation.yoy / 100) - 1) * 100),
  };
}

/**
 * İleriye dönük reel faiz: bugünkü politika faizi − önümüzdeki 12 ay için
 * beklenen enflasyon. Merkez bankaları duruşu çoğunlukla buna göre okur;
 * yalnızca TCMB için yayımlanabilir bir beklenti serisi kullanıyoruz
 * (Piyasa Katılımcıları Anketi).
 */
export function forwardRealRate(policy: number, expectedInflation: number): { real: number; fisher: number } {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    real: r2(policy - expectedInflation),
    fisher: r2(((1 + policy / 100) / (1 + expectedInflation / 100) - 1) * 100),
  };
}
