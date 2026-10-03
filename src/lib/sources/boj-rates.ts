import { fetchText, stripTags } from "./shared";

/**
 * BoJ politika faizi — toplantı sonrası karar metinlerinden.
 *
 * BoJ'nin istatistik API'sinde hedef faiz serisi yok: yalnızca piyasada
 * gerçekleşen çağrı faizi (FM01, hedef değil) ve temel iskonto oranı (IR01,
 * politika faizinden türetilen ayrı bir oran) var. Hedefin kendisi her karar
 * metninde aynı kalıpla yazıyor: "The Bank will encourage the uncollateralized
 * overnight call rate to remain at around 1.25 percent." (Ocak–Eylül 2026'nın
 * altı metninde, HTML ve PDF, doğrulandı.)
 *
 * Yıllık liste: /en/mopo/mpmdeci/state_YYYY/index.htm — satırlar
 * "Sept. 18, 2026 | Change in the Guideline for Money Market Operations".
 * Faiz değişince başlık "Change in the Guideline…", değişmeyince "Statement
 * on Monetary Policy" olur; "(Reference)" ekleri karar metni değildir.
 */
const BASE = "https://www.boj.or.jp";
export const BOJ_STATEMENTS_URL = (year: number) =>
  `${BASE}/en/mopo/mpmdeci/state_${year}/index.htm`;

const RATE_PATTERN =
  /encourage the uncollateralized overnight call rate to remain at around\s+([\d.]+)\s*percent/i;

const EN_MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, june: 6, jun: 6,
  july: 7, jul: 7, aug: 8, sept: 9, sep: 9, oct: 10, nov: 11, dec: 12,
};

export interface BojStatement {
  /** YYYY-MM-DD */
  date: string;
  url: string;
}

/** Yıllık listeden karar metni adayları (Reference ekleri hariç), tarihe göre. */
export function parseBojStatementList(html: string): BojStatement[] {
  const out: BojStatement[] = [];
  for (const row of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const text = stripTags(row[0]);
    const href = row[0].match(/href="([^"]+)"/i)?.[1];
    if (!href || /\(Reference\)/i.test(text)) continue;
    if (!/Statement on Monetary Policy|Change in the Guideline/i.test(text)) continue;

    const m = text.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),\s+(\d{4})/);
    const month = m && EN_MONTHS[m[1].toLowerCase()];
    if (!m || !month) continue;
    out.push({
      date: `${m[3]}-${String(month).padStart(2, "0")}-${m[2].padStart(2, "0")}`,
      url: new URL(href, BASE).toString(),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchBojStatementList(year: number): Promise<BojStatement[]> {
  return parseBojStatementList(await fetchText(BOJ_STATEMENTS_URL(year)));
}

/** Karar metninden hedef faiz (yüzde). Kalıp bulunamazsa hata — sessizce atlanmaz. */
export async function fetchBojStatementRate(url: string): Promise<number> {
  const text = url.toLowerCase().endsWith(".pdf") ? await pdfText(url) : stripTags(await fetchText(url));
  const m = text.replace(/\s+/g, " ").match(RATE_PATTERN);
  if (!m) throw new Error(`${url}: hedef faiz cümlesi bulunamadı — metin biçimi değişmiş olabilir`);
  return Number(m[1]);
}

async function pdfText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; MerkezBankalariRadar/0.1) Node" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const { extractText, getDocumentProxy } = await import("unpdf");
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(await res.arrayBuffer())), {
    mergePages: true,
  });
  return text;
}
