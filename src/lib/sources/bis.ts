import type { BankCode } from "../types";
import { fetchText } from "./shared";

/**
 * BIS "Central Bankers' Speeches" beslemesi.
 *
 * Kaynak RSS 1.0 (RDF) biçimindedir ve cbwiki şemasıyla konuşmacı adını,
 * tarihi ve PDF bağlantısını yapılandırılmış olarak verir.
 *
 * Önemli kısıt: besleme yalnızca **en son 25 konuşmayı** döndürür ve
 * sayfalama parametresi kabul etmez. Bu yüzden arşiv, günlük çalışan iş
 * tarafından zaman içinde biriktirilir; tek seferde geçmişe gidilemez.
 */
export const BIS_RSS_URL = "https://www.bis.org/doclist/cbspeeches.rss";
export const BIS_PAGE_URL = "https://www.bis.org/cbspeeches/index.htm";

export interface ScrapedSpeech {
  bankCode: BankCode;
  speakerName: string;
  title: string;
  /** YYYY-MM-DD */
  speechDate: string;
  sourceUrl: string;
  /** Beslemedeki tek cümlelik İngilizce tanıtım. */
  blurb: string;
}

/**
 * Konuşmacının kurumu yalnızca serbest metinde geçtiği için kalıp eşleşmesi
 * kullanılır. Sırayla denenir; ilk eşleşen kazanır.
 *
 * "Federal Reserve Bank of New York" gibi bölgesel şubeler de Fed sayılır —
 * konuşmacıları FOMC söylemini temsil eder.
 */
const BANK_PATTERNS: [BankCode, RegExp][] = [
  ["fed", /Federal Reserve/i],
  ["ecb", /European Central Bank/i],
  ["tcmb", /Central Bank of the Republic of T[üu]rkiye|Central Bank of Turkey/i],
  ["boe", /Bank of England/i],
  ["boj", /Bank of Japan/i],
  ["rba", /Reserve Bank of Australia/i],
];

export function detectBank(text: string): BankCode | null {
  for (const [code, pattern] of BANK_PATTERNS) {
    if (pattern.test(text)) return code;
  }
  return null;
}

export function parseBisRss(xml: string): ScrapedSpeech[] {
  const out: ScrapedSpeech[] = [];

  for (const match of xml.matchAll(/<item\b[\s\S]*?<\/item>/g)) {
    const item = match[0];

    const link = tag(item, "link");
    const title = tag(item, "title");
    const blurb = tag(item, "description");
    const speaker = tag(item, "dc:creator");
    const date = tag(item, "dc:date");
    if (!link || !title || !date) continue;

    // Banka, konuşmacının kurumundan belirlenir; tanınmayan bankalar atlanır.
    const bankCode = detectBank(`${blurb ?? ""} ${title}`);
    if (!bankCode) continue;

    out.push({
      bankCode,
      speakerName: speaker ?? splitSpeakerFromTitle(title),
      title: stripSpeakerPrefix(title),
      speechDate: date.slice(0, 10),
      sourceUrl: link,
      blurb: blurb ?? "",
    });
  }

  return out;
}

/** BIS başlıkları "Ad Soyad: Konu" biçimindedir. */
function stripSpeakerPrefix(title: string): string {
  const idx = title.indexOf(": ");
  return idx === -1 ? title : title.slice(idx + 2);
}

function splitSpeakerFromTitle(title: string): string {
  const idx = title.indexOf(": ");
  return idx === -1 ? "" : title.slice(0, idx);
}

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  if (!m) return undefined;
  return decodeXml(m[1].replace(/<!\[CDATA\[|\]\]>/g, "")).trim();
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}

export async function fetchBisSpeeches(): Promise<ScrapedSpeech[]> {
  return parseBisRss(await fetchText(BIS_RSS_URL));
}

/**
 * Konuşmanın tam metnini BIS sayfasından çıkarır.
 * Metin `cmsContent` kabındadır; script/style ve dipnot bağlantıları atılır.
 */
export async function fetchSpeechText(url: string): Promise<string> {
  const html = await fetchText(url);

  const start = html.indexOf("cmsContent");
  if (start === -1) throw new Error(`${url}: metin kabı bulunamadı`);

  // Kabın sonunu bulmak için içerik alanının bittiği yeri arıyoruz.
  const tail = html.slice(start);
  const end = tail.search(/<div[^>]*class="[^"]*(footer|related|share)/i);
  const body = end === -1 ? tail : tail.slice(0, end);

  const text = body
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeXml(text)
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*cmsContent'?>?/, "")
    .trim();
}
