import { BANKS } from "../banks";
import type { BankCode } from "../types";
import { fetchBojStatementList, RATE_PATTERN as BOJ_RATE } from "./boj-rates";
import { decodeEntities, fetchText, stripTags, UA } from "./shared";

/**
 * Faiz kararı metinleri — kararın açıklandığı resmî duyuru. Her banka için:
 * metnin adresini bul, paragraflara çıkar, karar oranını metinden oku.
 * Bulunamazsa (karar henüz yayımlanmadı) null döner; biçim değiştiyse hata.
 *
 * Kaynaklar ve biçim 13 Ekim 2026'da 2026 kararlarının hepsinde doğrulandı.
 *
 * Yayımlanabilirlik (src/lib/text-license.ts'teki şartlar):
 *   Fed   kamu malı · ECB kaynak göstererek serbest · RBA CC BY 4.0
 *   TCMB  "Sitede yer alan bilgiler, kaynak gösterilmek suretiyle
 *         yayımlanabilir; ancak bu bilgilerin ticari amaçlarla kullanımı
 *         TCMB'nin yazılı iznine tabidir." (Kullanım Şartları)
 *   BoJ   kaynak göstererek; ama metin PDF'ten satır satır kırık ve dipnotlu
 *         geliyor — fark görünümü okunmaz olurdu, yalnızca özet gösterilir.
 *   BoE   yalnızca kişisel kullanım → yayımlanmaz, yalnızca özet ve bağlantı.
 */

export type StatementLang = "tr" | "en";

export interface FetchedStatement {
  urls: Partial<Record<StatementLang, string>>;
  /** Paragraflar boş satırla ayrılmış düz metin. */
  texts: Partial<Record<StatementLang, string>>;
  rate?: number;
  /** Yalnızca Fed: hedef aralığın alt sınırı. */
  rateLower?: number;
  /** Metin ve fark sitede gösterilebilir mi. */
  publishable: boolean;
  /** Karar cümlesi okunamadıysa nedeni — metin yine saklanır. */
  parseError?: string;
}

export async function fetchDecisionStatement(bankCode: BankCode, meetingAt: string): Promise<FetchedStatement | null> {
  const day = localDay(meetingAt, BANKS[bankCode].timezone);
  switch (bankCode) {
    case "fed":
      return fetchFed(day);
    case "ecb":
      return fetchEcb(day);
    case "tcmb":
      return fetchTcmb(day);
    case "boe":
      return fetchBoe(day);
    case "boj":
      return fetchBoj(day);
    case "rba":
      return fetchRba(day);
  }
}

/** Bankanın kendi saat dilimindeki takvim günü — adresler ve listeler yerel tarihle yazılır. */
export function localDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

/** 404 → null (henüz yayımlanmadı); diğer hatalar yukarı. */
export async function fetchOptional(url: string): Promise<string | null> {
  try {
    return await fetchText(url);
  } catch (err) {
    if (/HTTP 404/.test((err as Error).message)) return null;
    throw err;
  }
}

/** <p>/<li>/<h2..h4> içeriğini paragraflara çevirir. */
export function blocksToText(html: string): string[] {
  return [...html.matchAll(/<(p|li|h[2-4])\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => stripTags(m[2].replace(/<br\s*\/?>/gi, " ")))
    .filter(Boolean);
}

// ── Fed ──────────────────────────────────────────────────────────────────

/** "3-3/4" → 3.75, "4" → 4 */
export function fedFraction(s: string): number {
  const m = s.match(/^(\d+)(?:-(\d)\/(\d))?$/);
  if (!m) return NaN;
  return Number(m[1]) + (m[2] ? Number(m[2]) / Number(m[3]) : 0);
}

const FED_RANGE =
  /target range for the federal funds rate(?: by [^.]*?)? (?:at|to) (\d+(?:-\d\/\d)?) to (\d+(?:-\d\/\d)?) percent/i;

export function parseFedStatement(html: string): { text: string; rate?: number; rateLower?: number } {
  const start = html.indexOf('id="article"');
  if (start === -1) throw new Error("FOMC: makale gövdesi bulunamadı — sayfa biçimi değişmiş olabilir");
  const article = html.slice(start);
  // Metin, sınıfsız <p>'lerdedir; tarih/saat satırları sınıflıdır. İletişim
  // satırı ve uygulama notu bağlantısı açıklamanın parçası değildir.
  const end = article.search(/For media inquiries|Implementation Note issued/i);
  const paras = [...article.slice(0, end === -1 ? 20_000 : end).matchAll(/<p>([\s\S]*?)<\/p>/g)]
    .map((m) => stripTags(m[1]))
    .filter(Boolean);
  if (paras.length === 0) throw new Error("FOMC: paragraf bulunamadı");
  const text = paras.join("\n\n");
  // Eski metinler kesirde bölünmez tire kullanıyor: "3‑1/2" (U+2011).
  const r = text.replace(/[\u2010-\u2013]/g, "-").match(FED_RANGE);
  if (!r) return { text };
  return { text, rateLower: fedFraction(r[1]), rate: fedFraction(r[2]) };
}

async function fetchFed(day: string): Promise<FetchedStatement | null> {
  const url = `https://www.federalreserve.gov/newsevents/pressreleases/monetary${day.replaceAll("-", "")}a.htm`;
  const html = await fetchOptional(url);
  if (!html) return null;
  const { text, rate, rateLower } = parseFedStatement(html);
  return {
    urls: { en: url },
    texts: { en: text },
    rate,
    rateLower,
    publishable: true,
    parseError: rate === undefined ? "hedef aralık cümlesi okunamadı" : undefined,
  };
}

// ── ECB ──────────────────────────────────────────────────────────────────

const ECB_RATES =
  /deposit facility, the main refinancing operations and the marginal lending facility will (?:be (?:increased|decreased|reduced|raised|lowered) to|remain unchanged at) ([\d.]+)%/i;

export function parseEcbStatement(html: string): { text: string; rate?: number } {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  const section = main?.match(/<div class="section">([\s\S]*?)<\/div>/i)?.[1];
  if (!section) throw new Error("ECB: karar metni bölümü bulunamadı — sayfa biçimi değişmiş olabilir");
  // İlk satır yalnızca tarih ("10 September 2026"): her kararda değişir, farkı kirletir.
  const text = blocksToText(section)
    .filter((p) => !/^\d{1,2} [A-Z][a-z]+ \d{4}$/.test(p))
    .join("\n\n");
  const r = text.match(ECB_RATES);
  return { text, rate: r ? Number(r[1]) : undefined };
}

async function fetchEcb(day: string): Promise<FetchedStatement | null> {
  const year = day.slice(0, 4);
  const list = await fetchText(`https://www.ecb.europa.eu/press/govcdec/mopo/${year}/html/index_include.en.html`);
  const stamp = day.slice(2).replaceAll("-", "");
  const href = list.match(new RegExp(`href="([^"]*ecb\\.mp${stamp}~[0-9a-f]+\\.en\\.html)"`))?.[1];
  if (!href) return null;
  const url = new URL(href, "https://www.ecb.europa.eu").toString();
  const { text, rate } = parseEcbStatement(await fetchText(url));
  return {
    urls: { en: url },
    texts: { en: text },
    rate,
    publishable: true,
    parseError: rate === undefined ? "faiz cümlesi okunamadı" : undefined,
  };
}

// ── TCMB ─────────────────────────────────────────────────────────────────

export const TCMB_LIST = {
  tr: (y: string) => `https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/${y}`,
  en: (y: string) => `https://www.tcmb.gov.tr/wps/wcm/connect/EN/TCMB+EN/Main+Menu/Announcements/Press+Releases/${y}`,
};
const TCMB_TITLE = { tr: /Faiz Oranlarına İlişkin Basın Duyurusu/i, en: /Press Release on Interest Rates/i };

/**
 * Duyuru listesinden o güne ait faiz kararı bağlantısı. İki dilin numaraları
 * ayrışabiliyor (Aralık 2025: TR DUY2025-63, EN ANO2025-61) — her dil kendi
 * listesinden bulunur.
 */
export function findTcmbRelease(listHtml: string, day: string, lang: StatementLang): string | undefined {
  const [y, m, d] = day.split("-");
  const tag = `${d}/${m}/${y}`;
  for (const item of listHtml.matchAll(
    /<a class="collection-title" href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?<div class="collection-tag">(\d{2}\/\d{2}\/\d{4})<\/div>/g,
  )) {
    if (item[3] === tag && TCMB_TITLE[lang].test(decodeEntities(item[2]))) {
      return new URL(item[1], "https://www.tcmb.gov.tr").toString();
    }
  }
  return undefined;
}

const TCMB_RATE_EN = /policy rate \(the one-week repo auction rate\) (?:from [\d.]+ percent )?(?:at|to) ([\d.]+) percent/i;
const TCMB_RATE_TR = /bir hafta vadeli repo ihale faiz oranının (?:yüzde [\d,]+['’]\S* )?yüzde ([\d,]+)['’]/i;

/** Gövde paragrafları; künye (sayı, tarih, başlık, katılan üyeler) kararla başlayan paragraftan önce kalır. */
export function parseTcmbStatement(html: string): string {
  const body = html.match(/<div class="tcmb-content[^"]*">([\s\S]*?)<\/div>/)?.[1];
  if (!body) throw new Error("TCMB: duyuru gövdesi bulunamadı — sayfa biçimi değişmiş olabilir");
  const paras = blocksToText(body);
  const start = paras.findIndex((p) => /^(Para Politikası Kurulu|The Monetary Policy Committee)/.test(p));
  if (start === -1) throw new Error("TCMB: karar paragrafı bulunamadı");
  return paras.slice(start).join("\n\n");
}

export function parseTcmbRate(text: string, lang: StatementLang): number | undefined {
  const m = text.match(lang === "en" ? TCMB_RATE_EN : TCMB_RATE_TR);
  return m ? Number(m[1].replace(",", ".")) : undefined;
}

async function fetchTcmb(day: string): Promise<FetchedStatement | null> {
  const y = day.slice(0, 4);
  const out: FetchedStatement = { urls: {}, texts: {}, publishable: true };
  for (const lang of ["tr", "en"] as const) {
    const url = findTcmbRelease(await fetchText(TCMB_LIST[lang](y)), day, lang);
    if (!url) continue;
    out.urls[lang] = url;
    out.texts[lang] = parseTcmbStatement(await fetchText(url));
  }
  // Türkçe metin esastır; İngilizcesi genelde aynı anda çıkar ama gecikebilir.
  if (!out.texts.tr) return null;
  out.rate = parseTcmbRate(out.texts.tr, "tr") ?? (out.texts.en ? parseTcmbRate(out.texts.en, "en") : undefined);
  if (out.rate === undefined) out.parseError = "politika faizi cümlesi okunamadı";
  return out;
}

// ── BoE ──────────────────────────────────────────────────────────────────

const BOE_VOTE =
  /voted (?:by a majority of \d+[–-]\d+|unanimously) to (?:maintain|reduce|increase|raise|cut|lower) Bank Rate(?: by [\d.]+ percentage points?)?,? (?:at|to) ([\d.]+)%/i;

/** "Monetary Policy Summary…" başlığından bir sonraki <h2>'ye (tutanak) kadar. */
export function parseBoeSummary(html: string): { text: string; rate?: number } {
  const h2 = html.match(/<h2[^>]*>\s*(Monetary Policy Summary[^<]*)<\/h2>/i);
  if (!h2 || h2.index === undefined) throw new Error("BoE: Monetary Policy Summary başlığı bulunamadı");
  const rest = html.slice(h2.index + h2[0].length);
  const end = rest.search(/<h2[\s>]/i);
  const text = blocksToText(end === -1 ? rest : rest.slice(0, end)).join("\n\n");
  const r = text.match(BOE_VOTE);
  return { text, rate: r ? Number(r[1]) : undefined };
}

export const EN_MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Karar özeti ve tutanak aynı sayfada (ayın kararı başına bir sayfa). */
export function boeSummaryUrl(day: string): string {
  const [y, m] = day.split("-");
  return `https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/${y}/${EN_MONTH_NAMES[Number(m) - 1]}-${y}`;
}

async function fetchBoe(day: string): Promise<FetchedStatement | null> {
  const url = boeSummaryUrl(day);
  const html = await fetchOptional(url);
  if (!html) return null;
  const { text, rate } = parseBoeSummary(html);
  return {
    urls: { en: url },
    texts: { en: text },
    rate,
    publishable: false,
    parseError: rate === undefined ? "oy/karar cümlesi okunamadı" : undefined,
  };
}

// ── BoJ ──────────────────────────────────────────────────────────────────

async function fetchBoj(day: string): Promise<FetchedStatement | null> {
  const s = (await fetchBojStatementList(Number(day.slice(0, 4)))).find((x) => x.date === day);
  if (!s) return null;
  const raw = s.url.toLowerCase().endsWith(".pdf") ? await pdfText(s.url) : stripTags(await fetchText(s.url));
  // PDF satırları cümle ortasında kırılıyor; model girdisi için tek akış yeterli.
  const text = raw.replace(/\s+/g, " ").trim();
  const r = text.match(BOJ_RATE);
  return {
    urls: { en: s.url },
    texts: { en: text },
    rate: r ? Number(r[1]) : undefined,
    publishable: false,
    parseError: r ? undefined : "hedef faiz cümlesi okunamadı",
  };
}

export async function pdfText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const { extractText, getDocumentProxy } = await import("unpdf");
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(await res.arrayBuffer())), {
    mergePages: true,
  });
  return text;
}

// ── RBA ──────────────────────────────────────────────────────────────────

/** RBA bazı tırnakları Windows-1252 kod numarasıyla yazıyor (&#146; = ’). */
const CP1252: Record<number, string> = { 133: "…", 145: "‘", 146: "’", 147: "“", 148: "”", 150: "–", 151: "—" };
export const decodeCp1252Refs = (html: string) => html.replace(/&#(1[2-5]\d);/g, (m, d) => CP1252[Number(d)] ?? m);

const RBA_DECISION =
  /the Board decided to (?:leave|keep|maintain|hold|increase|raise|lower|reduce|cut) the cash rate(?: target)?(?: unchanged)?(?: by \d+\s*basis points)?(?: (?:at|to) ([\d.]+)\s*per\s*cent)/i;

export function findRbaRelease(listHtml: string, day: string): string | undefined {
  // Sınıf adları maddeden maddeye değişiyor; başlık ve tarih tutarlı.
  for (const a of listHtml.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)) {
    if (!/Monetary Policy Decision/i.test(a[1])) continue;
    if (a[1].match(/<time datetime="(\d{4}-\d{2}-\d{2})/)?.[1] !== day) continue;
    const href = a[1].match(/href="([^"]+\.html)"/)?.[1];
    if (href) return new URL(href, "https://www.rba.gov.au").toString();
  }
  return undefined;
}

export function parseRbaStatement(html: string): { text: string; rate?: number } {
  const start = html.indexOf('<div class="rss-mr-content"');
  if (start === -1) throw new Error("RBA: duyuru gövdesi bulunamadı — sayfa biçimi değişmiş olabilir");
  const body = decodeCp1252Refs(html.slice(start, html.indexOf("</div>", start)));
  const text = blocksToText(body).join("\n\n");
  const r = text.match(RBA_DECISION);
  return { text, rate: r ? Number(r[1]) : undefined };
}

async function fetchRba(day: string): Promise<FetchedStatement | null> {
  const url = findRbaRelease(await fetchText(`https://www.rba.gov.au/media-releases/${day.slice(0, 4)}/`), day);
  if (!url) return null;
  const { text, rate } = parseRbaStatement(await fetchText(url));
  return {
    urls: { en: url },
    texts: { en: text },
    rate,
    publishable: true,
    parseError: rate === undefined ? "nakit faiz cümlesi okunamadı" : undefined,
  };
}
