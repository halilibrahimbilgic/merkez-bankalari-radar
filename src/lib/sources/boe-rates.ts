import { excelSerialToDate, openWorkbook, readCells } from "./xlsx";

/**
 * BoE MPC oylama geçmişi — her toplantının Bank Rate kararı.
 *
 * "Bank Rate Decisions" sayfasında B sütunu karar *duyuru* tarihi (Excel
 * seri no), C sütunu kararlaştırılan oran (kesir: 0.0375 = %3,75). Diğer
 * sütunlar üye bazında oylardır. Duyuru tarihi takvimdeki tarihle aynı
 * olduğundan toplantılar doğrudan eşlenir (3 Ekim 2026'da son 12 kararla
 * doğrulandı; ör. 18.12.2025 → 4,00'ten 3,75'e).
 */
export const BOE_VOTING_URL =
  "https://www.bankofengland.co.uk/-/media/boe/files/monetary-policy-summary-and-minutes/mpcvoting.xlsx";

export interface BoeDecision {
  /** YYYY-MM-DD, duyuru günü */
  date: string;
  /** Yüzde, ör. 3.75 */
  rate: number;
}

export function parseBoeDecisions(xlsx: Uint8Array): BoeDecision[] {
  const wb = openWorkbook(xlsx);
  const out: BoeDecision[] = [];
  for (const row of readCells(wb.sheet("Bank Rate Decisions"), wb.strings)) {
    const serial = Number(row.B);
    const fraction = Number(row.C);
    // Başlık ve özet satırlarında B metin ya da boştur; seri no 1997 sonrası.
    if (!Number.isFinite(serial) || serial < 35_000 || !Number.isFinite(fraction)) continue;
    // Kayan nokta gürültüsünü at: 0.0375000001 → 3.75
    out.push({ date: excelSerialToDate(row.B), rate: Math.round(fraction * 10_000) / 100 });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchBoeDecisions(): Promise<BoeDecision[]> {
  const res = await fetch(BOE_VOTING_URL, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; MerkezBankalariRadar/0.1) Node",
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`BoE oylama geçmişi → HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("BoE oylama geçmişi → xlsx yerine başka içerik döndü; dosya taşınmış olabilir");
  }
  return parseBoeDecisions(bytes);
}
