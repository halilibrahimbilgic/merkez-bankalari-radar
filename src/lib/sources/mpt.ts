import { UA } from "./shared";
import { excelSerialToDate, openWorkbook, readCells } from "./xlsx";

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

/**
 * Bilinen son dosya adresi. Atlanta Fed dosyayı bir kez taşıdı (cenfis/ →
 * research-and-data/data/) ve eski adres 200 + HTML 404 sayfası döndürdü;
 * bu yüzden önce sayfadaki bağlantıyı arıyoruz, bu sabit yalnızca yedek.
 */
export const MPT_URL =
  "https://www.atlantafed.org/-/media/Project/Atlanta/FRBA/Documents/research-and-data/data/market-probability-tracker/mpt_histdata.xlsx";

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

/**
 * İngilizce sayfa için. CME paragrafı Atlanta Fed MPT sayfasındaki metnin
 * ilk cümleleridir (12 Ekim 2026'da kaynaktan alındı); Atlanta Fed notu
 * yukarıdaki Türkçe notun karşılığıdır.
 */
export const LICENSE_NOTICE_EN = {
  atlantaFed:
    "The Atlanta Fed Market Probability Tracker is not an official forecast of the " +
    "Atlanta Fed, its president, the Federal Reserve System or the FOMC. The data may " +
    "be used for personal and educational purposes only. " +
    "Copyright © Federal Reserve Bank of Atlanta.",
  cme:
    "CME Group market data are used, with permission from CME, as a source of " +
    "information for this report. CME Group has no other connection to the Federal " +
    "Reserve Bank of Atlanta's products and services and does not sponsor, endorse, " +
    "recommend, or promote the report, its contents, or the authors. CME Group does " +
    "not guarantee the accuracy and/or the completeness of any market data.",
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


/** Sayfadaki mpt_histdata.xlsx bağlantısını bulur; bulamazsa sabite düşer. */
export async function resolveMptUrl(): Promise<string> {
  try {
    const res = await fetch(MPT_PAGE_URL, {
      headers: { "user-agent": UA },
      // Sayfa 3 MB ve yavaş: 13 Ekim 2026'da projenin kendi user-agent'ıyla
      // 7–50 sn sürdü (tarayıcı taklidi gerekmedi; ARCHITECTURE.md §4).
      signal: AbortSignal.timeout(60_000),
    });
    if (res.ok) {
      const m = (await res.text()).match(/href="([^"]*mpt_histdata\.xlsx[^"]*)"/i);
      if (m) return new URL(m[1].replace(/&amp;/g, "&"), MPT_PAGE_URL).toString();
    }
  } catch {
    // Sayfa erişilemezse sabit adresi denemek yine de anlamlı.
  }
  return MPT_URL;
}

export async function fetchMptWorkbook(): Promise<Uint8Array> {
  const url = await resolveMptUrl();
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Atlanta Fed MPT → HTTP ${res.status} (${url})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  // Site eksik dosya için 200 + HTML döndürüyor; "invalid zip data" yerine
  // nedeni söyleyen bir hata ver.
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error(
      `Atlanta Fed MPT → xlsx yerine ${res.headers.get("content-type") ?? "bilinmeyen içerik"} ` +
        `döndü; dosya taşınmış olabilir (${url})`,
    );
  }
  return bytes;
}

/** DATA sayfasının satırları — dosya ~65 MB XML; bir kez okunup iki hesapta kullanılır. */
export function readMptRows(xlsx: Uint8Array): string[][] {
  const wb = openWorkbook(xlsx);
  return readRows(wb.sheet("DATA"), wb.strings);
}

/** Günlük geçmişte gün başına ilk bu kadar pencere tutulur — uzak dönemler grafikte okunmuyor. */
const HISTORY_WINDOWS = 6;

/**
 * Pencerelerin gün gün seyri (olasılıkların zaman içindeki değişimi).
 * Dosya Atlanta Fed'in tüm geçmişini taşır; `since` gününden itibaren alınır.
 */
export function windowHistoryFromRows(
  rows: string[][],
  since: string,
): Record<string, { date: string; probCutPct?: number; probHikePct?: number; meanBps?: number }[]> {
  const byDay = new Map<string, Map<string, { probCutPct?: number; probHikePct?: number; meanBps?: number }>>();
  for (const [date, refStart, , field, value] of rows) {
    if (date < since) continue;
    if (field !== "Prob: cut" && field !== "Prob: hike" && field !== "Rate: mean") continue;
    const v = Number(value);
    if (!Number.isFinite(v)) continue;
    const start = excelSerialToDate(refStart);
    const day = byDay.get(date) ?? new Map();
    byDay.set(date, day);
    const w = day.get(start) ?? {};
    day.set(start, w);
    if (field === "Prob: cut") w.probCutPct = v;
    else if (field === "Prob: hike") w.probHikePct = v;
    else w.meanBps = v;
  }

  const out: Record<string, { date: string; probCutPct?: number; probHikePct?: number; meanBps?: number }[]> = {};
  for (const date of [...byDay.keys()].sort()) {
    const day = byDay.get(date)!;
    for (const start of [...day.keys()].sort().slice(0, HISTORY_WINDOWS)) {
      (out[start] ??= []).push({ date, ...day.get(start)! });
    }
  }
  return out;
}

/** En güncel gözlem gününe ait tüm pencereleri çıkarır. */
export function snapshotFromRows(rows: string[][]): ProbabilitySnapshot {
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

/** Her satırı [date, reference_start, target_range, field, value] olarak döndürür. */
function readRows(sheetXml: string, strings: string[]): string[][] {
  const rows: string[][] = [];

  for (const r of readCells(sheetXml, strings)) {
    const cells = ["A", "B", "C", "D", "E"].map((col) => r[col] ?? "");
    // Başlık satırını ve eksik satırları ele
    if (cells.length >= 5 && /^\d{4}-\d{2}-\d{2}$/.test(cells[0])) {
      rows.push(cells);
    }
  }

  return rows;
}
