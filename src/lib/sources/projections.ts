import { fetchSeries, type Observation } from "./fred";
import { pdfText } from "./decision-statements";
import { decodeEntities, fetchText } from "./shared";
import { parseTrDate } from "./tcmb";

/**
 * Bankaların kendi tahminleri — piyasa ve anket beklentisiyle yan yana.
 *
 *   Fed   Ekonomik Projeksiyonlar Özeti (SEP, "nokta grafiği"): FOMC
 *         katılımcılarının yıl sonu faiz tahminlerinin medyanı ve aralığı,
 *         yılda dört kez. FRED: FEDTARMD (medyan), FEDTARRL/RH (en düşük ve
 *         en yüksek), FEDTARMDLR (uzun dönem; gözlem günü SEP'in günüdür).
 *   TCMB  Enflasyon Raporu, yılda dört kez: yıl sonu enflasyon tahmini ve
 *         ara hedefler, "Genel Değerlendirme" bölümünün PDF'inden okunur.
 *         Cümleler kalıplı ("Enflasyonun, 2026 yıl sonunda yüzde 28; …
 *         gerçekleşeceği tahmin edilmektedir"); kalıp tutmazsa hata.
 *
 * Doğrulama (15 Ekim 2026): Eylül 2026 SEP medyanları 2026–2029 için
 * 4,1 / 4,1 / 3,9 / 3,6, uzun dönem 3,2; Enflasyon Raporu 2026-III'te tahmin
 * 28 / 15 / 9, ara hedefler 24 / 15 / 9 (2026, 2027, 2028).
 */

export interface FedProjections {
  /** SEP'in açıklandığı toplantı günü. */
  releasedOn: string;
  /** Yıl sonu faiz tahminleri (%), yıla göre. */
  years: { year: number; median: number; low?: number; high?: number }[];
  longerRun?: number;
}

export interface TcmbForecast {
  /** "2026-III" */
  report: string;
  publishedOn: string;
  url: string;
  /** Yıl sonu enflasyon tahmini (%), yıla göre. */
  forecasts: Record<string, number>;
  /** Ara hedefler (%), yıla göre. */
  targets: Record<string, number>;
}

/** FRED gözlemlerinden: yıllık seriler "YYYY-01-01" gözlem günüyle gelir. */
export function shapeFedProjections(series: {
  median: Observation[];
  low: Observation[];
  high: Observation[];
  longerRun: Observation[];
}): FedProjections {
  const lr = series.longerRun.at(-1);
  if (!lr) throw new Error("FRED: uzun dönem medyanı (FEDTARMDLR) boş");
  const byYear = (obs: Observation[]) => new Map(obs.map((o) => [Number(o.date.slice(0, 4)), o.value]));
  const low = byYear(series.low);
  const high = byYear(series.high);
  const years = series.median
    .map((o) => ({ year: Number(o.date.slice(0, 4)), median: o.value }))
    .map((y) => ({ ...y, low: low.get(y.year), high: high.get(y.year) }));
  if (years.length === 0) throw new Error("FRED: SEP medyanı (FEDTARMD) boş");
  return { releasedOn: lr.date, years, longerRun: lr.value };
}

export async function fetchFedProjections(): Promise<FedProjections> {
  // Yalnızca son SEP'in yılları: FRED yıllık serinin son sürümünü verir.
  const start = `${new Date().getUTCFullYear() - 1}-01-01`;
  const [median, low, high, longerRun] = await Promise.all([
    fetchSeries("FEDTARMD", { start }),
    fetchSeries("FEDTARRL", { start }),
    fetchSeries("FEDTARRH", { start }),
    fetchSeries("FEDTARMDLR", { start }),
  ]);
  return shapeFedProjections({ median, low, high, longerRun });
}

// ── TCMB ─────────────────────────────────────────────────────────────────

export const TCMB_ER_INDEX_URL =
  "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Yayinlar/Raporlar/Enflasyon+Raporu/";

/** Dizinde bağlantısı olan ilk sayı en son yayımlanandır; çıkacak sayının bağlantısı yok. */
export function parseErIndex(html: string): { report: string; publishedOn: string; url: string } | undefined {
  const m = html.match(
    /<a class="collection-title"[^>]*href="([^"]+)"[^>]*title="Enflasyon Raporu (\d{4}) - ([IV]+) \(([^)]+)\)"/,
  );
  const date = m && parseTrDate(decodeEntities(m[4]));
  if (!m || !date) return undefined;
  return {
    report: `${m[2]}-${m[3]}`,
    publishedOn: `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`,
    url: new URL(m[1], "https://www.tcmb.gov.tr").toString(),
  };
}

/** Sayının sayfasında "Genel Değerlendirme" bölümünün PDF'i (1b26_iii.pdf). */
export function findErSummaryPdf(html: string): string | undefined {
  const m = html.match(/href="([^"]*\/1b\d{2}_[ivx]+\.pdf[^"]*)"/i);
  return m ? new URL(decodeEntities(m[1]), "https://www.tcmb.gov.tr").toString() : undefined;
}

const num = (s: string) => Number(s.replace(",", "."));

/** Genel Değerlendirme metninden tahminler ve ara hedefler. */
export function parseTcmbForecast(text: string): { forecasts: Record<string, number>; targets: Record<string, number> } {
  const t = text.replace(/\s+/g, " ");

  const anchor = t.search(/gerçekleşeceği tahmin edilmektedir/);
  if (anchor === -1) throw new Error("Enflasyon Raporu: tahmin cümlesi bulunamadı — kalıp değişmiş olabilir");
  const forecasts: Record<string, number> = {};
  // Ondalık virgül yalnızca ardından rakam gelirse: "yüzde 24, yüzde 15" listesinde virgül ayraçtır.
  for (const m of t.slice(Math.max(0, anchor - 250), anchor + 200).matchAll(/(\d{4}) yıl sonunda(?: ise)? yüzde (\d+(?:,\d+)?)/g)) {
    forecasts[m[1]] = num(m[2]);
  }

  const tm = t.match(/ara hedefleri,?\s*([\d\s,ve]+?)\s*yılları için sırasıyla\s*((?:yüzde \d+(?:,\d+)?(?:,\s*|\s+ve\s+)?)+)/);
  if (!tm) throw new Error("Enflasyon Raporu: ara hedef cümlesi bulunamadı — kalıp değişmiş olabilir");
  const years = tm[1].match(/\d{4}/g) ?? [];
  const values = [...tm[2].matchAll(/yüzde (\d+(?:,\d+)?)/g)].map((m) => num(m[1]));
  if (years.length === 0 || years.length !== values.length) throw new Error("Enflasyon Raporu: ara hedef yılları ve oranları eşleşmedi");
  const targets = Object.fromEntries(years.map((y, i) => [y, values[i]]));

  const all = [...Object.values(forecasts), ...Object.values(targets)];
  if (Object.keys(forecasts).length === 0 || all.some((v) => !(v > 0 && v < 100))) {
    throw new Error("Enflasyon Raporu: tahminler okunamadı ya da olağan dışı");
  }
  return { forecasts, targets };
}

/**
 * Son sayı önceki kayıtla aynıysa PDF indirilmez (yılda dört kez değişir).
 * Dizinde sayı yoksa hata: sayfa biçimi değişmiş olabilir.
 */
export async function fetchTcmbForecast(previous?: TcmbForecast): Promise<TcmbForecast> {
  const latest = parseErIndex(await fetchText(TCMB_ER_INDEX_URL));
  if (!latest) throw new Error("Enflasyon Raporu: dizinde yayımlanmış sayı bulunamadı — sayfa biçimi değişmiş olabilir");
  if (previous?.report === latest.report) return previous;
  const pdf = findErSummaryPdf(await fetchText(latest.url));
  if (!pdf) throw new Error(`Enflasyon Raporu ${latest.report}: Genel Değerlendirme PDF'i bulunamadı`);
  return { ...latest, ...parseTcmbForecast(await pdfText(pdf)) };
}
