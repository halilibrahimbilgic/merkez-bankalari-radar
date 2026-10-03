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
 * Konuşmanın tam metnini çıkarır.
 *
 * BIS Eylül 2026'da Drupal'a geçti: `/review/r260813h.htm` adresleri
 * `/speeches/20260817-<slug>` adresine 301 ile yönleniyor ve HTML sayfası
 * artık yalnızca giriş paragraflarını (`text__component`) içeriyor; tam metin
 * yalnızca PDF'te. Bu yüzden önce PDF denenir, olmazsa HTML'deki kaba düşülür.
 * Eski şablon (`cmsContent`) da tanınır.
 */
export async function fetchSpeechText(url: string): Promise<string> {
  const html = await fetchText(url);

  // Yalnızca konuşmanın kendi PDF'i (sayfa adresi + ".pdf") kabul edilir.
  // Sayfadaki ilk .pdf bağlantısı dipnottaki başka bir yayın olabiliyor:
  // Lagarde'ın 30.09.2026 AP oturumu bir SUERF makalesiyle skorlanmıştı.
  const ownPdf = new URL(url).pathname.replace(/\/$/, "") + ".pdf";
  const pdfHref = [...html.matchAll(/href="([^"]+\.pdf)"/gi)]
    .map((m) => new URL(m[1].replace(/&amp;/g, "&"), url))
    .find((u) => u.hostname === new URL(url).hostname && u.pathname === ownPdf);
  if (pdfHref) {
    const pdfText = await fetchPdfText(pdfHref.toString());
    if (pdfText.length >= 500) return cutBoilerplate(normalizeWhitespace(pdfText));
  }

  const body = htmlBody(html);
  if (body === null) throw new Error(`${url}: metin kabı bulunamadı`);

  const text = body
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return cutBoilerplate(
    normalizeWhitespace(decodeXml(text)).replace(/^\s*cmsContent'?>?/, "").trim(),
  );
}

function htmlBody(html: string): string | null {
  // İçerikte iç içe div'ler (dipnot, tablo) olabildiği için ilk </div>'de
  // durulmaz; kap, BIS'in sabit sorumluluk notuna (alert kutusu) kadar alınır.
  const drupal = html.indexOf('<div class="text__component">');
  if (drupal !== -1) {
    const tail = html.slice(drupal);
    const end = tail.search(/<div class="alert|<div class="publication-body__buttons/);
    return end === -1 ? tail : tail.slice(0, end);
  }

  const start = html.indexOf("cmsContent");
  if (start === -1) return null;
  // Kabın sonunu bulmak için içerik alanının bittiği yeri arıyoruz.
  const tail = html.slice(start);
  const end = tail.search(/<div[^>]*class="[^"]*(footer|related|share)/i);
  return end === -1 ? tail : tail.slice(0, end);
}

async function fetchPdfText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; MerkezBankalariRadar/0.1) Node" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  // unpdf yalnızca ESM; dinamik içe aktarma CJS derlenen script'lerde de çalışır.
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

function normalizeWhitespace(s: string): string {
  return s
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * BIS her konuşmanın ardına sabit bir sorumluluk reddi ve site altbilgisi
 * ("About the author", "Stay connected", "Legal information" ...) ekler.
 * Bu metin skorlamaya girmemeli - ilk eslesen sinirdan itibaren atilir.
 */
const BOILERPLATE_MARKERS = [
  "The views expressed in this speech are those of the speaker",
  "About the author",
  "Stay connected",
  "Sign up to receive email alerts",
  // Bankaların kendi PDF'lerinin sonundaki "ilgili içerik" listesi (ör. ECB).
  "You may also be interested in",
];

function cutBoilerplate(text: string): string {
  let cut = text.length;
  for (const marker of BOILERPLATE_MARKERS) {
    const i = text.indexOf(marker);
    if (i !== -1 && i < cut) cut = i;
  }
  return text.slice(0, cut).trim();
}
