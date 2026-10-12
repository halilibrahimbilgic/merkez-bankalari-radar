import { unzipSync } from "fflate";
import { UA } from "./shared";
import { excelSerialToDate, openWorkbook, readCells } from "./xlsx";

/**
 * İngiltere Merkez Bankası'nın günlük tahmin ettiği OIS (SONIA) eğrisi.
 *
 * "latest-yield-curve-data.zip" içinde "OIS daily data current month.xlsx";
 * "1. fwds, short end" sayfası 1 aydan ~5 yıla aylık vadelerde anlık forward
 * faizleri verir (satır = gün, A = Excel tarih seri no). Ayın ilk iş
 * gününden önce dosya boş olabilir — o zaman hata verilir ve önceki kayıt
 * korunur (fetch-expectations).
 *
 * Lisans: BoE web sitesi kaynakları ticari olmayan kullanım içindir; site
 * eğitim amaçlı ve ticari değildir (ARCHITECTURE.md §6). Kaynak gösterilir.
 */
export const BOE_YIELD_CURVES_URL = "https://www.bankofengland.co.uk/statistics/yield-curves";
const ZIP_URL =
  "https://www.bankofengland.co.uk/-/media/boe/files/statistics/yield-curves/latest-yield-curve-data.zip";

export interface OisForwards {
  /** Eğrinin ait olduğu gün, YYYY-MM-DD. */
  date: string;
  /** Vade (ay) → anlık forward faiz (%). Artan vade sırasında. */
  months: number[];
  forwards: number[];
}

export async function fetchBoeOisForwards(): Promise<OisForwards> {
  const res = await fetch(ZIP_URL, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`BoE OIS → HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("BoE OIS: zip değil (sayfa taşınmış olabilir)");

  const files = unzipSync(bytes);
  const name = Object.keys(files).find((f) => /OIS daily data/i.test(f));
  if (!name) throw new Error(`BoE OIS: zip içinde OIS dosyası yok (${Object.keys(files).join(", ")})`);
  return parseOisWorkbook(files[name]);
}

export function parseOisWorkbook(xlsx: Uint8Array): OisForwards {
  const wb = openWorkbook(xlsx);
  const rows = readCells(wb.sheet("1. fwds, short end"), wb.strings);

  const header = rows.find((r) => r.A === "months:");
  if (!header) throw new Error('BoE OIS: "months:" satırı yok — biçim değişmiş olabilir');
  const cols = Object.keys(header).filter((c) => c !== "A");

  // En son dolu gün. A sütunu Excel tarih seri numarası (ör. 46296).
  const day = [...rows].reverse().find((r) => /^\d{5}$/.test(r.A ?? "") && r[cols[0]] !== undefined);
  if (!day) throw new Error("BoE OIS: dosyada henüz günlük veri yok");

  const months: number[] = [];
  const forwards: number[] = [];
  for (const c of cols) {
    const m = Number(header[c]);
    const f = Number(day[c]);
    if (Number.isFinite(m) && Number.isFinite(f)) {
      months.push(Math.round(m * 1000) / 1000);
      forwards.push(f);
    }
  }
  if (months.length < 12) throw new Error(`BoE OIS: beklenenden az vade (${months.length})`);
  return { date: excelSerialToDate(day.A), months, forwards };
}
