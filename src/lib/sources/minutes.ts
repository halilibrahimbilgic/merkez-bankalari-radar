import { BANKS } from "../banks";
import type { BankCode, Meeting } from "../types";
import {
  blocksToText,
  boeSummaryUrl,
  decodeCp1252Refs,
  EN_MONTH_NAMES,
  fetchOptional,
  localDay,
  pdfText,
  TCMB_LIST,
} from "./decision-statements";
import { decodeEntities, fetchText, stripTags } from "./shared";
import { parseTrDate } from "./tcmb";

/**
 * Toplantı tutanakları — kararın arkasındaki tartışma. Kararla aynı anda
 * değil, sonra yayımlanır (BoE hariç: tutanak karar özetiyle aynı sayfada).
 * Sitede yalnızca bizim özetimiz ve resmî bağlantı durur; metin saklanmaz
 * (.cache), yayımlama izni sorusu doğmaz.
 *
 * Kaynaklar 15 Ekim 2026'da 2026 toplantılarında doğrulandı:
 *   Fed   fomcminutes<karar günü>.htm — üç hafta sonra
 *   ECB   tutanak listesi, "Meeting of 9-10 September 2026" — dört hafta sonra
 *   TCMB  basın duyuruları, "Para Politikası Kurulu Toplantı Özeti" — bir hafta
 *         sonra; sayfadaki "Toplantı Tarihi" ile toplantı doğrulanır
 *   BoE   karar özetinin sayfası, "Minutes of the Monetary Policy Committee
 *         meeting…" bölümü — aynı gün
 *   BoJ   Summary of Opinions listesi, opi<YYAAGG>.pdf — yaklaşık altı iş günü
 *   RBA   rba-board-minutes/<yıl>/<karar günü>.html — iki hafta; gelecek
 *         toplantıların adresi listede var ama 404 döner
 */

export type MinutesLang = "tr" | "en";

export interface FetchedMinutes {
  urls: Partial<Record<MinutesLang, string>>;
  /** Özetlenecek metin: TCMB'de Türkçe, diğerlerinde İngilizce; paragraflar boş satırla ayrık. */
  text: string;
}

/** Tutanağın en erken çıkabileceği gün (karardan sonra) — öncesinde kaynağa gidilmez. */
export const MINUTES_LAG_DAYS: Record<BankCode, number> = { fed: 21, ecb: 26, tcmb: 5, boe: 0, boj: 5, rba: 13 };

/** Liste sayfaları koşu içinde birkaç toplantı için okunur; çağıran önbelleğe alabilir. 404 → null. */
export type ListFetcher = (url: string) => Promise<string | null>;

/** Tutanak henüz yayımlanmadıysa null; biçim değiştiyse hata. */
export async function fetchMinutes(m: Meeting, getList: ListFetcher = fetchOptional): Promise<FetchedMinutes | null> {
  const day = localDay(m.meetingAt, BANKS[m.bankCode].timezone);
  switch (m.bankCode) {
    case "fed":
      return fetchFed(day);
    case "ecb":
      return fetchEcb(day, getList);
    case "tcmb":
      return fetchTcmb(day, getList);
    case "boe":
      return fetchBoe(day);
    case "boj":
      return fetchBoj(day, getList);
    case "rba":
      return fetchRba(day);
  }
}

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const pad = (n: number) => String(n).padStart(2, "0");

// ── Fed ──────────────────────────────────────────────────────────────────

/** Makale gövdesi, katılımcı listesine ("Attendance") kadar. */
export function parseFedMinutes(html: string): string {
  const start = html.indexOf('id="article"');
  if (start === -1) throw new Error("Fed tutanağı: makale gövdesi bulunamadı — sayfa biçimi değişmiş olabilir");
  const blocks = blocksToText(html.slice(start));
  const end = blocks.findIndex((b) => /^Attendance\b/.test(b) || /^_{5,}/.test(b));
  if (end <= 0) throw new Error("Fed tutanağı: katılımcı listesi bulunamadı — sayfa biçimi değişmiş olabilir");
  return blocks.slice(0, end).join("\n\n");
}

async function fetchFed(day: string): Promise<FetchedMinutes | null> {
  const url = `https://www.federalreserve.gov/monetarypolicy/fomcminutes${day.replaceAll("-", "")}.htm`;
  const html = await fetchOptional(url);
  return html ? { urls: { en: url }, text: parseFedMinutes(html) } : null;
}

// ── ECB ──────────────────────────────────────────────────────────────────

/** Listede toplantının son günü: "Meeting of 9-10 September 2026", "Meeting of 30 September-1 October 2026". */
export function findEcbAccount(listHtml: string, day: string): string | undefined {
  for (const m of listHtml.matchAll(/<a href="([^"]*\/press\/accounts\/[^"]+\.en\.html)"[^>]*>\s*Meeting of ([^<]+?)\s*<\/a>/g)) {
    const last = m[2].match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    const month = last ? EN_MONTH_NAMES.indexOf(last[2].toLowerCase()) + 1 : 0;
    if (last && month > 0 && `${last[3]}-${pad(month)}-${pad(Number(last[1]))}` === day) {
      return new URL(m[1], "https://www.ecb.europa.eu").toString();
    }
  }
  return undefined;
}

/** <main> gövdesi, üye listesine ("Members") kadar. */
export function parseEcbAccount(html: string): string {
  const start = html.indexOf("<main");
  const end = html.indexOf("</main>");
  if (start === -1 || end === -1) throw new Error("ECB tutanağı: gövde bulunamadı — sayfa biçimi değişmiş olabilir");
  const blocks = blocksToText(html.slice(start, end));
  const stop = blocks.findIndex((b) => b === "Members");
  if (stop <= 0) throw new Error("ECB tutanağı: üye listesi bulunamadı — sayfa biçimi değişmiş olabilir");
  return blocks.slice(0, stop).join("\n\n");
}

async function fetchEcb(day: string, getList: ListFetcher): Promise<FetchedMinutes | null> {
  const year = Number(day.slice(0, 4));
  // Aralık toplantısının tutanağı ertesi yılın listesinde çıkar.
  for (const y of [year, year + 1]) {
    const list = await getList(`https://www.ecb.europa.eu/press/accounts/${y}/html/index_include.en.html`);
    const url = list ? findEcbAccount(list, day) : undefined;
    if (url) return { urls: { en: url }, text: parseEcbAccount(await fetchText(url)) };
  }
  return null;
}

// ── TCMB ─────────────────────────────────────────────────────────────────

const TCMB_SUMMARY = { tr: /Para Politikası Kurulu Toplantı Özeti/i, en: /Summary of the Monetary Policy Committee Meeting/i };

/** Karardan sonraki üç hafta içindeki ilk "Toplantı Özeti" duyurusu. */
export function findTcmbSummary(listHtml: string, day: string, lang: MinutesLang): string | undefined {
  let best: { date: string; url: string } | undefined;
  for (const item of listHtml.matchAll(
    /<a class="collection-title" href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?<div class="collection-tag">(\d{2})\/(\d{2})\/(\d{4})<\/div>/g,
  )) {
    if (!TCMB_SUMMARY[lang].test(decodeEntities(item[2]))) continue;
    const date = `${item[5]}-${item[4]}-${item[3]}`;
    if (date <= day || date > addDays(day, 21)) continue;
    if (!best || date < best.date) best = { date, url: new URL(item[1], "https://www.tcmb.gov.tr").toString() };
  }
  return best?.url;
}

/** Numaralı paragraflar; künyedeki "Toplantı Tarihi" kararın günü değilse hata. */
export function parseTcmbSummary(html: string, day: string): string {
  const body = html.match(/<div class="tcmb-content[^"]*">([\s\S]*?)<\/div>/)?.[1];
  if (!body) throw new Error("TCMB özeti: duyuru gövdesi bulunamadı — sayfa biçimi değişmiş olabilir");
  const blocks = blocksToText(body);
  const meta = blocks.find((b) => /^Toplantı Tarihi\s*:/i.test(b));
  const date = meta ? parseTrDate(meta) : null;
  if (!date) throw new Error("TCMB özeti: toplantı tarihi bulunamadı — sayfa biçimi değişmiş olabilir");
  const meeting = `${date.year}-${pad(date.month)}-${pad(date.day)}`;
  if (meeting !== day) throw new Error(`TCMB özeti başka bir toplantıya ait (${meeting}, beklenen ${day})`);
  const start = blocks.findIndex((b) => /^1\.\s/.test(b));
  if (start === -1) throw new Error("TCMB özeti: numaralı paragraflar bulunamadı");
  return blocks.slice(start).join("\n\n");
}

async function fetchTcmb(day: string, getList: ListFetcher): Promise<FetchedMinutes | null> {
  const y = day.slice(0, 4);
  const trList = await getList(TCMB_LIST.tr(y));
  const tr = trList ? findTcmbSummary(trList, day, "tr") : undefined;
  if (!tr) return null;
  const enList = await getList(TCMB_LIST.en(y));
  const en = enList ? findTcmbSummary(enList, day, "en") : undefined;
  return { urls: { tr, ...(en ? { en } : {}) }, text: parseTcmbSummary(await fetchText(tr), day) };
}

// ── BoE ──────────────────────────────────────────────────────────────────

/** Karar özetinin sayfasında tutanak bölümü: başlığından bir sonraki <h2>'ye kadar. */
export function parseBoeMinutes(html: string): string {
  const h2 = html.match(/<h2[^>]*>\s*Minutes of the Monetary Policy Committee meeting[^<]*<\/h2>/i);
  if (!h2 || h2.index === undefined) throw new Error("BoE tutanağı: bölüm başlığı bulunamadı — sayfa biçimi değişmiş olabilir");
  const rest = html.slice(h2.index + h2[0].length);
  const end = rest.search(/<h2[\s>]/i);
  return blocksToText(end === -1 ? rest : rest.slice(0, end)).join("\n\n");
}

async function fetchBoe(day: string): Promise<FetchedMinutes | null> {
  const url = boeSummaryUrl(day);
  const html = await fetchOptional(url);
  return html ? { urls: { en: url }, text: parseBoeMinutes(html) } : null;
}

// ── BoJ ──────────────────────────────────────────────────────────────────

/** Dosya adı kararın günü: 18 Eylül 2026 → opi260918.pdf (Ocak 2026'daki gibi .htm de olabilir). */
export function findBojOpinions(listHtml: string, day: string): string | undefined {
  const code = day.slice(2).replaceAll("-", "");
  const m = listHtml.match(new RegExp(`href="([^"]*opi${code}\\.(?:pdf|htm))"`));
  return m ? new URL(m[1], "https://www.boj.or.jp").toString() : undefined;
}

async function fetchBoj(day: string, getList: ListFetcher): Promise<FetchedMinutes | null> {
  const list = await getList(`https://www.boj.or.jp/en/mopo/mpmsche_minu/opinion_${day.slice(0, 4)}/index.htm`);
  const url = list ? findBojOpinions(list, day) : undefined;
  if (!url) return null;
  // PDF satırları cümle ortasında kırılıyor: tek akışa indirip cümle sınırından
  // yeniden bölünür — tek satırlık 13 bin karakteri okuma aracı kırpabilir.
  const raw = url.endsWith(".pdf") ? await pdfText(url) : stripTags(await fetchText(url));
  return { urls: { en: url }, text: wrapSentences(raw.replace(/\s+/g, " ").trim()) };
}

/** Uzun akışı cümle sonlarından en fazla `max` karakterlik satırlara böler. */
export function wrapSentences(text: string, max = 600): string {
  const lines: string[] = [];
  let line = "";
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (line && line.length + sentence.length + 1 > max) {
      lines.push(line);
      line = sentence;
    } else {
      line = line ? `${line} ${sentence}` : sentence;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

// ── RBA ──────────────────────────────────────────────────────────────────

/** İçerik, "More on the … monetary policy decision" bağlantılarına kadar. */
export function parseRbaMinutes(html: string): string {
  const start = html.indexOf('id="content"');
  if (start === -1) throw new Error("RBA tutanağı: içerik bulunamadı — sayfa biçimi değişmiş olabilir");
  const blocks = blocksToText(decodeCp1252Refs(html.slice(start)));
  const end = blocks.findIndex((b) => /^More on the .*monetary policy decision/i.test(b));
  if (end <= 0) throw new Error("RBA tutanağı: bölüm sonu bulunamadı — sayfa biçimi değişmiş olabilir");
  return blocks.slice(0, end).join("\n\n");
}

async function fetchRba(day: string): Promise<FetchedMinutes | null> {
  const url = `https://www.rba.gov.au/monetary-policy/rba-board-minutes/${day.slice(0, 4)}/${day}.html`;
  const html = await fetchOptional(url);
  return html ? { urls: { en: url }, text: parseRbaMinutes(html) } : null;
}
