import { UA } from "./shared";
import { openWorkbook, readCells } from "./xlsx";

/**
 * New York Fed — Survey of Market Expectations (SME). Piyasa katılımcılarına
 * (primary dealer'lar ve diğer kurumlar) her FOMC toplantısından önce sorulan
 * anket; Fed için TOPLANTI BAZLI beklentinin yeniden yayımlanabilir tek
 * kaynağı (Atlanta Fed MPT üç aylık ortalamalar verir).
 *
 * Zamanlama (13 Ekim 2026'da 2025–2026 turlarında doğrulandı): yanıtlar
 * toplantıdan ~1 hafta önce toplanır, sonuçlar toplantıdan 2–3 hafta SONRA
 * yayımlanır. Bu yüzden bir kararın anketi karar gününde henüz yoktur;
 * karar kartı onu yayımlanınca gösterir (bkz. preDecisionPoint).
 *
 * Veri dosyası: /medialibrary/media/markets/survey/2026/sep-2026-data.xlsx —
 * tek sayfa, metin hücre içinde (inlineStr). Kullanılan satırlar (panel
 * "Combined"):
 *   fftr_pathofmodes        toplantı başına modal beklentilerin 25./50./75.
 *                           yüzdeliği (ondalık: 0.0363 = hedef aralık orta
 *                           noktası %3,625)
 *   fftr_probdist_YYYYMMDD  o toplantı için olasılık dağılımı (bant başına
 *                           ortalama olasılık)
 *
 * Kullanım şartı (newyorkfed.org/privacy/termsofuse): içerik kişisel ya da
 * ticari amaçla kullanılabilir, kopyalanabilir, dağıtılabilir; New York
 * Fed'in onayı ima edilemez.
 */
export const SME_PAGE_URL =
  "https://www.newyorkfed.org/markets/market-intelligence/survey-of-market-expectations";
const BASE = "https://www.newyorkfed.org";

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export interface SmeMeeting {
  /** Toplantının (kararın) günü, YYYY-MM-DD. */
  date: string;
  /** Modal beklentilerin yüzdelikleri — hedef aralığın ÜST sınırı (%). */
  p25: number;
  median: number;
  p75: number;
  /** Bant üst sınırı (%; en üst açık bant için null) → ortalama olasılık (%). */
  dist?: { upper: number | null; pct: number }[];
}

export interface SmeRound {
  /** "2026-09" */
  round: string;
  url: string;
  releaseDate: string;
  /** Yanıtların son günü — beklentinin oluştuğu gün. */
  dueDate: string;
  meetings: SmeMeeting[];
}

/** Sayfadaki veri dosyaları, en yeni önce. */
export function listSmeDataFiles(html: string): { url: string; round: string }[] {
  const seen = new Map<string, string>();
  for (const m of html.matchAll(/href="(\/medialibrary\/media\/markets\/survey\/\d{4}\/([a-z]{3})-(\d{4})-data\.xlsx)"/gi)) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) seen.set(`${m[3]}-${month}`, new URL(m[1], BASE).toString());
  }
  return [...seen].map(([round, url]) => ({ round, url })).sort((a, b) => b.round.localeCompare(a.round));
}

export async function fetchSmeRound(url: string, round: string): Promise<SmeRound> {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`NY Fed SME → HTTP ${res.status} (${url})`);
  return { ...parseSmeData(new Uint8Array(await res.arrayBuffer())), round, url };
}

/** Orta nokta (ondalık) → hedef aralığın üst sınırı (%). Çeyrek puan ızgarasına oturur; arada kalan medyan olduğu gibi kalır. */
export function midToUpper(mid: number): number {
  const upper = mid * 100 + 0.125;
  // Hedef aralıkların üst sınırı çeyrek puan ızgarasında (%3,75, %4,00…).
  const snapped = Math.round(upper * 4) / 4;
  return Math.abs(upper - snapped) < 0.01 ? snapped : Math.round(upper * 100) / 100;
}

export function parseSmeData(xlsx: Uint8Array): Omit<SmeRound, "round" | "url"> {
  const wb = openWorkbook(xlsx);
  const rows = readCells(wb.sheet("Sheet1"), wb.strings);
  const header = rows[0];
  const col = (name: string) => {
    const c = Object.keys(header).find((k) => header[k] === name);
    if (!c) throw new Error(`SME: "${name}" sütunu yok — biçim değişmiş olabilir`);
    return c;
  };
  const C = {
    release: col("survey_release_date"),
    due: col("survey_due_date"),
    panel: col("panel_type"),
    tag: col("question_tag"),
    horizonDate: col("horizon_date"),
    high: col("bucket_high"),
    agg: col("aggregation"),
    value: col("aggregation_value"),
  };

  const path = new Map<string, Partial<Record<"pctl25" | "pctl50" | "pctl75", number>>>();
  const dists = new Map<string, { upper: number | null; pct: number }[]>();
  let releaseDate = "";
  let dueDate = "";
  for (const r of rows.slice(1)) {
    if (r[C.panel] !== "Combined") continue;
    releaseDate ||= r[C.release] ?? "";
    dueDate ||= r[C.due] ?? "";
    const tag = r[C.tag];
    const value = Number(r[C.value]);
    if (!Number.isFinite(value)) continue;
    if (tag === "fftr_pathofmodes" && /^\d{4}-\d{2}-\d{2}$/.test(r[C.horizonDate] ?? "")) {
      const agg = r[C.agg] as "pctl25" | "pctl50" | "pctl75";
      if (agg !== "pctl25" && agg !== "pctl50" && agg !== "pctl75") continue;
      const p = path.get(r[C.horizonDate]) ?? {};
      p[agg] = value;
      path.set(r[C.horizonDate], p);
    }
    const dm = tag?.match(/^fftr_probdist_(\d{4})(\d{2})(\d{2})$/);
    if (dm && r[C.agg] === "avg") {
      const day = `${dm[1]}-${dm[2]}-${dm[3]}`;
      const high = r[C.high] ? Math.round(Number(r[C.high]) * 10000) / 100 : null;
      const list = dists.get(day) ?? [];
      list.push({ upper: high, pct: Math.round(value * 1000) / 10 });
      dists.set(day, list);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error("SME: yanıt son günü okunamadı");

  // Yalnızca toplantı günleri: yol uzak dönemler için çeyrek ve yıl sonlarını
  // da içerir (horizon "2027 Q3" → 2027-09-30).
  const meetings: SmeMeeting[] = [];
  for (const [date, p] of [...path].sort(([a], [b]) => a.localeCompare(b))) {
    if (p.pctl25 === undefined || p.pctl50 === undefined || p.pctl75 === undefined) continue;
    if (isQuarterOrYearEnd(date)) continue;
    meetings.push({
      date,
      p25: midToUpper(p.pctl25),
      median: midToUpper(p.pctl50),
      p75: midToUpper(p.pctl75),
      dist: dists.get(date)?.sort((a, b) => (a.upper ?? Infinity) - (b.upper ?? Infinity)),
    });
  }
  if (meetings.length === 0) throw new Error("SME: toplantı bazlı beklenti satırı bulunamadı");
  return { releaseDate, dueDate, meetings };
}

function isQuarterOrYearEnd(date: string): boolean {
  return /-(03-31|06-30|09-30|12-31)$/.test(date);
}
