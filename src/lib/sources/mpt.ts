import { unzipSync } from "fflate";

/**
 * Atlanta Fed "Market Probability Tracker" veri dosyası okuyucusu.
 *
 * Veri, CME 3 aylık SOFR opsiyonlarının fiyatlarından türetilen olasılık
 * dağılımlarıdır. Dikkat: bunlar tek bir FOMC toplantısına ait olasılıklar
 * DEĞİL, üçer aylık referans pencerelerinde ortalama SOFR'un hangi bantta
 * kalacağına dair olasılıklardır. Arayüzde bu ayrım açıkça belirtilmelidir.
 *
 * Lisans: veri yalnızca kişisel ve eğitim amaçlı kullanıma izinlidir.
 * Bkz. LICENSE_NOTICE.
 */

export const MPT_URL =
  "https://www.atlantafed.org/-/media/Project/Atlanta/FRBA/Documents/cenfis/market-probability-tracker/mpt_histdata.xlsx";

export const MPT_PAGE_URL =
  "https://www.atlantafed.org/research-and-data/data/market-probability-tracker";

/** Kaynak dosyanın LICENSE sayfasındaki koşullar — sitede aynen gösterilir. */
export const LICENSE_NOTICE = {
  atlantaFed:
    "Atlanta Fed Market Probability Tracker, Atlanta Fed'in, başkanının, " +
    "Federal Rezerv Sistemi'nin veya FOMC'nin resmî tahmini değildir. " +
    "Verinin kullanımına yalnızca kişisel ve eğitim amaçlı izin verilmiştir. " +
    "Copyright © Federal Reserve Bank of Atlanta.",
  cme:
    "CME Group piyasa verisi, bu rapor için bir bilgi kaynağı olarak CME'nin " +
    "izniyle kullanılmaktadır. CME Group'un Atlanta Fed ürün ve hizmetleriyle " +
    "başka bir bağlantısı yoktur; raporu, içeriğini veya yazarlarını " +
    "desteklemez, önermez ya da tanıtmaz. CME Group verinin doğruluğunu ve " +
    "eksiksizliğini garanti etmez.",
} as const;

export interface ProbabilityBucket {
  lowerBps: number;
  upperBps: number;
  probabilityPct: number;
}

export interface ProbabilityWindow {
  /** Referans penceresinin başlangıcı (IMM tarihi), YYYY-MM-DD. */
  startDate: string;
  probCutPct?: number;
  probHikePct?: number;
  meanBps?: number;
  modeBps?: number;
  p25Bps?: number;
  p75Bps?: number;
  buckets: ProbabilityBucket[];
}

export interface ProbabilitySnapshot {
  /** Gözlem tarihi (verinin ait olduğu piyasa günü). */
  asOf: string;
  targetRange?: { lowerBps: number; upperBps: number };
  windows: ProbabilityWindow[];
}

export async function fetchMptWorkbook(): Promise<Uint8Array> {
  const res = await fetch(MPT_URL, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Atlanta Fed MPT → HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** En güncel gözlem gününe ait tüm pencereleri çıkarır. */
export function parseLatestSnapshot(xlsx: Uint8Array): ProbabilitySnapshot {
  const files = unzipSync(xlsx);
  const dec = new TextDecoder("utf-8");

  const strings = parseSharedStrings(dec.decode(files["xl/sharedStrings.xml"]));
  const sheetPath = findDataSheetPath(
    dec.decode(files["xl/workbook.xml"]),
    dec.decode(files["xl/_rels/workbook.xml.rels"]),
  );
  const sheet = dec.decode(files[sheetPath]);

  const rows = readRows(sheet, strings);

  let asOf = "";
  for (const r of rows) if (r[0] > asOf) asOf = r[0];
  if (!asOf) throw new Error("MPT: gözlem tarihi bulunamadı");

  const windows = new Map<string, ProbabilityWindow>();
  let targetRange: ProbabilitySnapshot["targetRange"];

  for (const [date, refStart, target, field, value] of rows) {
    if (date !== asOf) continue;

    if (!targetRange) targetRange = parseRange(target) ?? undefined;

    const startDate = excelSerialToDate(refStart);
    let w = windows.get(startDate);
    if (!w) {
      w = { startDate, buckets: [] };
      windows.set(startDate, w);
    }

    const v = Number(value);
    if (!Number.isFinite(v)) continue;

    switch (field) {
      case "Prob: cut": w.probCutPct = v; break;
      case "Prob: hike": w.probHikePct = v; break;
      case "Rate: mean": w.meanBps = v; break;
      case "Rate: mode": w.modeBps = v; break;
      case "Rate: 25th percentile": w.p25Bps = v; break;
      case "Rate: 75th percentile": w.p75Bps = v; break;
      default: {
        if (!field.startsWith("Prob: ")) break;
        const range = parseRange(field.slice("Prob: ".length));
        if (range) w.buckets.push({ ...range, probabilityPct: v });
      }
    }
  }

  for (const w of windows.values()) w.buckets.sort((a, b) => a.lowerBps - b.lowerBps);

  return {
    asOf,
    targetRange,
    windows: [...windows.values()].sort((a, b) => a.startDate.localeCompare(b.startDate)),
  };
}

/** "350bps - 375bps" → { lowerBps: 350, upperBps: 375 } */
function parseRange(text: string): { lowerBps: number; upperBps: number } | null {
  const m = text.match(/(-?\d+)\s*bps\s*-\s*(-?\d+)\s*bps/);
  return m ? { lowerBps: Number(m[1]), upperBps: Number(m[2]) } : null;
}

/** Excel seri numarası → ISO tarih. Excel'in 1900 artık yıl hatası nedeniyle taban 1899-12-30. */
function excelSerialToDate(serial: string): string {
  const days = Math.round(Number(serial));
  if (!Number.isFinite(days)) return serial;
  return new Date(Date.UTC(1899, 11, 30) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    // Bir <si> birden çok <t> parçasına bölünmüş olabilir.
    let text = "";
    for (const t of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += t[1];
    out.push(decodeXml(text));
  }
  return out;
}

function findDataSheetPath(workbookXml: string, relsXml: string): string {
  const sheet = workbookXml.match(/<sheet name="DATA"[^>]*r:id="([^"]+)"/);
  if (!sheet) throw new Error("MPT: DATA sayfası bulunamadı");
  const target = relsXml.match(
    new RegExp(`Id="${sheet[1]}"[^>]*Target="([^"]+)"`),
  );
  if (!target) throw new Error("MPT: DATA sayfasının yolu çözülemedi");
  return "xl/" + target[1].replace(/^\/?(xl\/)?/, "");
}

/** Her satırı [date, reference_start, target_range, field, value] olarak döndürür. */
function readRows(sheetXml: string, strings: string[]): string[][] {
  const rows: string[][] = [];

  for (const row of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const c of row[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = c[1];
      const v = c[2].match(/<v>([\s\S]*?)<\/v>/);
      if (!v) {
        cells.push("");
        continue;
      }
      cells.push(
        /\bt="s"/.test(attrs) ? (strings[Number(v[1])] ?? "") : decodeXml(v[1]),
      );
    }
    // Başlık satırını ve eksik satırları ele
    if (cells.length >= 5 && /^\d{4}-\d{2}-\d{2}$/.test(cells[0])) {
      rows.push(cells);
    }
  }

  return rows;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}
