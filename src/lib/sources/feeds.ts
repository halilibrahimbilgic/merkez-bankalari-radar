import { decodeEntities, fetchText, stripTags } from "./shared";

/**
 * RSS 2.0, RSS 1.0 (RDF — RBA) ve Atom (TCMB) için asgari okuyucu.
 * Yalnızca haber akışının ihtiyaç duyduğu alanlar: başlık, bağlantı,
 * açıklama, yayım zamanı.
 */
export interface FeedEntry {
  title: string;
  link: string;
  description: string;
  /** UTC ISO; okunamazsa undefined (öğe atlanır). */
  publishedAt?: string;
}

export async function fetchFeed(url: string): Promise<FeedEntry[]> {
  return parseFeed(await fetchText(url));
}

export function parseFeed(xml: string): FeedEntry[] {
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2]);
  const out: FeedEntry[] = [];
  for (const b of blocks) {
    const title = clean(tag(b, "title"));
    const link =
      clean(tag(b, "link")) ||
      b.match(/<link\b[^>]*rel="alternate"[^>]*href="([^"]+)"/)?.[1] ||
      b.match(/<link\b[^>]*href="([^"]+)"/)?.[1] ||
      "";
    const description = clean(tag(b, "description") ?? tag(b, "summary") ?? tag(b, "content")).slice(0, 700);
    // Fed tarihleri CDATA içinde veriyor.
    const date = clean(tag(b, "pubDate") ?? tag(b, "dc:date") ?? tag(b, "published") ?? tag(b, "updated"));
    if (!title || !link) continue;
    out.push({ title, link: link.trim().replace(/^http:\/\//, "https://"), description, publishedAt: parseDate(date) });
  }
  return out;
}

function tag(xml: string, name: string): string | undefined {
  return xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`))?.[1];
}

function clean(s: string | undefined): string {
  if (!s) return "";
  const raw = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  // Açıklamalar kodlanmış HTML içerebilir (&lt;p&gt;): önce çöz, sonra sök.
  return stripTags(decodeEntities(raw).replace(/&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"'));
}

const TR_MONTHS: Record<string, number> = {
  oca: 1, şub: 2, sub: 2, mar: 3, nis: 4, may: 5, haz: 6, tem: 7, ağu: 8, agu: 8, eyl: 9, eki: 10, kas: 11, ara: 12,
};

/**
 * RFC 822 ("Mon, 12 Oct 2026 14:00:00 GMT"), ISO 8601 ve TCMB'nin Türkçe
 * biçimi ("9 Eki 2026 21:35:12", saat dilimi yazılmıyor — TRT kabul edilir).
 */
export function parseDate(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const v = s.trim();
  const tr = v.match(/^(\d{1,2}) (\S+) (\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (tr) {
    const month = TR_MONTHS[tr[2].toLocaleLowerCase("tr").slice(0, 3)];
    if (!month) return undefined;
    // TRT = UTC+3 (2016'dan beri yaz saati yok).
    return new Date(Date.UTC(+tr[3], month - 1, +tr[1], +tr[4] - 3, +tr[5], +tr[6])).toISOString();
  }
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
}
