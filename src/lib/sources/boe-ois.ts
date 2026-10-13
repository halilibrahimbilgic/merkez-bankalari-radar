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
const ARCHIVE_URL =
  "https://www.bankofengland.co.uk/-/media/boe/files/statistics/yield-curves/oisddata.zip";

export interface OisForwards {
  /** Eğrinin ait olduğu gün, YYYY-MM-DD. */
  date: string;
  /** Vade (ay) → anlık forward faiz (%). Artan vade sırasında. */
  months: number[];
  forwards: number[];
}

export async function fetchBoeOisForwards(): Promise<OisForwards> {
  const curves = await fetchBoeOisCurves();
  return curves[curves.length - 1];
}

/**
 * Bu ayın her günü — dosya ayın tüm iş günlerini taşır; günlük iş bir gün
 * kaçsa bile geçmiş (data/history) eksiksiz birikir.
 */
export async function fetchBoeOisCurves(): Promise<OisForwards[]> {
  return parseOisCurves(await zipEntry(ZIP_URL, /OIS daily data/i));
}

/** Arşiv (2025'ten bugüne) — yalnızca geçmişi bir kez doldurmak için; ~12 MB. */
export async function fetchBoeOisArchive(): Promise<OisForwards[]> {
  return parseOisCurves(await zipEntry(ARCHIVE_URL, /OIS daily data_2025 to present/i));
}

async function zipEntry(url: string, name: RegExp): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`BoE OIS → HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("BoE OIS: zip değil (sayfa taşınmış olabilir)");

  const files = unzipSync(bytes);
  const file = Object.keys(files).find((f) => name.test(f));
  if (!file) throw new Error(`BoE OIS: zip içinde OIS dosyası yok (${Object.keys(files).join(", ")})`);
  return files[file];
}

/** En son dolu gün. */
export function parseOisWorkbook(xlsx: Uint8Array): OisForwards {
  const curves = parseOisCurves(xlsx);
  return curves[curves.length - 1];
}

/** Dosyadaki her dolu gün, tarih sırasında. */
export function parseOisCurves(xlsx: Uint8Array): OisForwards[] {
  const wb = openWorkbook(xlsx);
  const rows = readCells(wb.sheet("1. fwds, short end"), wb.strings);

  const header = rows.find((r) => r.A === "months:");
  if (!header) throw new Error('BoE OIS: "months:" satırı yok — biçim değişmiş olabilir');
  const cols = Object.keys(header).filter((c) => c !== "A");

  // A sütunu Excel tarih seri numarası (ör. 46296).
  const out: OisForwards[] = [];
  for (const day of rows) {
    if (!/^\d{5}$/.test(day.A ?? "") || day[cols[0]] === undefined) continue;
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
    out.push({ date: excelSerialToDate(day.A), months, forwards });
  }
  if (out.length === 0) throw new Error("BoE OIS: dosyada henüz günlük veri yok");
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * SONIA (gecelik faiz) — beklenti hesabının tabanı (src/lib/implied-path.ts).
 * BoE istatistik veritabanının CSV ucu; IUDSOIA sütunu. Bir günün değeri
 * ertesi iş günü yayımlanır, son satır bu yüzden boş olabilir.
 */
export async function fetchSonia(from: string): Promise<Map<string, number>> {
  const [y, m, d] = from.split("-");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1];
  const url =
    "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes" +
    `&Datefrom=${d}/${mon}/${y}&Dateto=now&SeriesCodes=IUDSOIA&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`;
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`BoE SONIA → HTTP ${res.status}`);
  return parseSoniaCsv(await res.text());
}

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

/** "DATE,IUDSOIA" / "02 Jan 2026,3.7263" → gün → oran. Boş değerler atlanır. */
export function parseSoniaCsv(csv: string): Map<string, number> {
  const lines = csv.trim().split(/\r?\n/);
  if (!/^DATE,IUDSOIA/i.test(lines[0] ?? "")) throw new Error("BoE SONIA: beklenmeyen CSV başlığı");
  const out = new Map<string, number>();
  for (const line of lines.slice(1)) {
    const [date, value] = line.split(",");
    const m = date?.match(/^(\d{2}) (\w{3}) (\d{4})$/);
    const v = Number(value);
    if (m && MONTHS[m[2]] && value?.trim() && Number.isFinite(v)) out.set(`${m[3]}-${MONTHS[m[2]]}-${m[1]}`, v);
  }
  return out;
}

/** Verilen gün ya da öncesindeki en yakın SONIA (yayım gecikmesi ve tatiller için). */
export function soniaOn(sonia: Map<string, number>, day: string): number | undefined {
  let best: string | undefined;
  for (const d of sonia.keys()) if (d <= day && (!best || d > best)) best = d;
  return best ? sonia.get(best) : undefined;
}
