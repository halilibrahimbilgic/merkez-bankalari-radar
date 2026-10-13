import { fetchText, UA } from "./shared";

/**
 * ECB Survey of Monetary Analysts (SMA) — analistlerin mevduat faizi (DFR)
 * beklentisi. Yılda 8 tur, her Yönetim Konseyi toplantısından önce; sonuçlar
 * toplantıdan sonra YALNIZCA PDF olarak yayımlanır. PDF'teki seri anahtarları
 * (SMA.SEP26.MEDIAN…) ECB Data Portal API'sinde yok (12 Ekim 2026'da
 * denendi: 404), bu yüzden PDF metni okunur.
 *
 * Okunan iki tablo (Eylül 2026 sonuçlarında doğrulandı):
 *   "Expectations for the DFR"  →  "Oct-2026 2.50 2.50 2.50 69"
 *     (ay, 25. yüzdelik, medyan, 75. yüzdelik, yanıt sayısı); aylık satırlar
 *     toplantı sonrası değerdir, çeyrek satırları ("2027Q3") atlanır.
 *   "Expected size of the first/second DFR change" → "Average probability"
 *     satırı, 11 bant: <-75 … >75 bp.
 * Biçim değişir de tablo bulunamazsa hata verilir; önceki kayıt korunur.
 *
 * Kullanım: ECB içeriği kaynak gösterilerek serbestçe kullanılabilir.
 */
export const SMA_PAGE_URL = "https://www.ecb.europa.eu/stats/ecb_surveys/sma/html/index.en.html";
const BASE = "https://www.ecb.europa.eu";

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};
/** Olasılık bantlarının merkezleri (bp), PDF'teki sırayla. */
export const SMA_BINS = [-100, -75, -50, -25, -10, 0, 10, 25, 50, 75, 100];

export interface SmaRound {
  /** Sonuçların yayım günü, PDF adından: "2026-09-11". */
  publishedOn: string;
  sourceUrl: string;
  /** Toplantı ayı ("2026-10") → toplantı sonrası DFR beklentisi. */
  path: { month: string; p25: number; median: number; p75: number }[];
  /** Sonraki iki toplantı için ortalama olasılık (%), SMA_BINS sırasıyla. */
  firstChange?: number[];
  secondChange?: number[];
}

/** Tüm sürümlerin listesi — sayfanın kendisi bunu içeri alır (include). */
export const SMA_LIST_URL = "https://www.ecb.europa.eu/stats/ecb_surveys/sma/html/index_include.en.html";

/**
 * Listedeki sonuç turları, en yeni önce. Yayım günü listedeki isoDate'tir:
 * dosya adındaki tarih bazen farklı (Temmuz 2026 turu: dosya 260727, yayım
 * 24 Temmuz) — dosyalar ambargo altında önceden konuyor.
 */
export function listSmaResults(html: string): { url: string; publishedOn: string }[] {
  const out: { url: string; publishedOn: string }[] = [];
  for (const m of html.matchAll(/<dt isoDate="(\d{4}-\d{2}-\d{2})">[\s\S]*?<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)) {
    const link = m[2].match(/href="([^"]*ecb\.smar\d{6}[^"]*?\.en\.pdf)/);
    if (link) out.push({ url: new URL(link[1], BASE).toString(), publishedOn: m[1] });
  }
  return out.sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
}

export function parseSmaText(text: string): Pick<SmaRound, "path" | "firstChange" | "secondChange"> {
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  const start = lines.findIndex((l) => /^Expectations for the DFR/i.test(l));
  if (start === -1) throw new Error('SMA: "Expectations for the DFR" tablosu yok — biçim değişmiş olabilir');
  const path: SmaRound["path"] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^(Note|Series key)/i.test(line)) break;
    const m = line.match(/^([A-Z][a-z]{2})-(\d{4})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+\d+$/);
    if (!m || !MONTHS[m[1]]) continue;
    path.push({
      month: `${m[2]}-${String(MONTHS[m[1]]).padStart(2, "0")}`,
      p25: Number(m[3]),
      median: Number(m[4]),
      p75: Number(m[5]),
    });
  }
  if (path.length === 0) throw new Error("SMA: DFR tablosunda toplantı satırı okunamadı");

  return { path, firstChange: probabilities(lines, "first"), secondChange: probabilities(lines, "second") };
}

function probabilities(lines: string[], which: "first" | "second"): number[] | undefined {
  const at = lines.findIndex((l) => new RegExp(`Expected size of the ${which} DFR change`, "i").test(l));
  if (at === -1) return undefined;
  const row = lines.slice(at, at + 8).find((l) => /^Average probability/i.test(l));
  const values = row?.replace(/^Average probability\s*/i, "").split(/\s+/).map(Number);
  if (!values || values.length !== SMA_BINS.length || values.some((v) => !Number.isFinite(v))) return undefined;
  return values;
}

/** Bant olasılıklarını yön özetine çevirir: indirim / sabit (0 ve ±10 bp) / artırım. */
export function summarizeChange(bins: number[]): { cut: number; hold: number; hike: number } {
  let cut = 0, hold = 0, hike = 0;
  SMA_BINS.forEach((b, i) => {
    if (b <= -25) cut += bins[i];
    else if (b >= 25) hike += bins[i];
    else hold += bins[i];
  });
  const r = (n: number) => Math.round(n * 10) / 10;
  return { cut: r(cut), hold: r(hold), hike: r(hike) };
}

export async function fetchEcbSma(): Promise<SmaRound> {
  const [latest] = listSmaResults(await fetchText(SMA_LIST_URL));
  if (!latest) throw new Error("SMA: listede sonuç PDF'i bulunamadı");
  return fetchSmaRound(latest.url, latest.publishedOn);
}

export async function fetchSmaRound(url: string, publishedOn: string): Promise<SmaRound> {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`SMA PDF → HTTP ${res.status}`);
  const { extractText, getDocumentProxy } = await import("unpdf");
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(await res.arrayBuffer())), {
    mergePages: true,
  });
  return { publishedOn, sourceUrl: url.replace(/\?.*$/, ""), ...parseSmaText(text) };
}
