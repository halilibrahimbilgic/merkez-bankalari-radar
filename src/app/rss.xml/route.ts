import { BANKS } from "@/lib/banks";
import { getAllMeetings } from "@/lib/data/meetings";
import { SITE_URL } from "@/lib/site";
import { formatDateTr, formatTimeTrt } from "@/lib/time";
import type { Meeting } from "@/lib/types";

export const revalidate = 3600;

/** Kararın bu kadar öncesinde "yaklaşıyor" öğesi yayımlanır. */
const LEAD_DAYS = 7;
/** Karar sonuçları bu kadar geriye kadar akışta kalır. */
const RESULT_WINDOW_DAYS = 60;
const DAY = 86_400_000;

interface Item {
  guid: string;
  title: string;
  description: string;
  link: string;
  pubDate: Date;
}

/**
 * Toplantı hatırlatma ve karar akışı (RSS 2.0).
 *
 * Her toplantı en fazla iki öğe üretir: karardan LEAD_DAYS gün önce
 * "yaklaşıyor", karar oranı arşive düşünce "karar açıklandı". GUID ve
 * pubDate toplantıdan türer, şimdiki zamandan değil — okuyucu aynı öğeyi her
 * yenilemede yeni sanmaz. Başlıklarda "X gün kaldı" yok: okuyucuda bayatlar.
 *
 * E-posta isteyen, akışı bir RSS→e-posta köprüsüne (ör. Blogtrottr, Feedly)
 * bağlayabilir; sitenin kendisi e-posta adresi toplamaz.
 */
export async function GET() {
  const now = Date.now();
  const meetings = await getAllMeetings();
  const items: Item[] = [];

  for (const m of meetings) {
    const at = new Date(m.meetingAt).getTime();
    const bank = BANKS[m.bankCode];
    const link = `${SITE_URL}/banka/${m.bankCode}`;

    const announceAt = at - LEAD_DAYS * DAY;
    if (announceAt <= now && at > now) {
      items.push({
        guid: `${m.id}-yaklasan`,
        title: `Yaklaşan karar: ${bank.nameTr} — ${whenTr(m)}`,
        description:
          `${bank.nameEn} (${bank.countryTr}), ${bank.rateNameTr} kararını ` +
          `${whenTr(m)} açıklayacak.`,
        link,
        pubDate: new Date(announceAt),
      });
    }

    if (
      m.decisionRate !== undefined &&
      m.previousRate !== undefined &&
      at <= now &&
      now - at <= RESULT_WINDOW_DAYS * DAY
    ) {
      items.push({
        guid: `${m.id}-karar`,
        title: resultTitle(m),
        description:
          `${bank.nameEn}, ${formatDateTr(m.meetingAt)} tarihli toplantısında ` +
          `${bank.rateNameTr} için kararını açıkladı: ` +
          `${rateTr(m)} (önceki: %${num(m.previousRate)}).`,
        link,
        pubDate: new Date(at),
      });
    }
  }

  items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return new Response(buildRss(items), {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

function whenTr(m: Meeting): string {
  return m.timeTbd
    ? `${formatDateTr(m.meetingAt)} (saat açıklanmadı)`
    : `${formatDateTr(m.meetingAt)}, ${formatTimeTrt(m.meetingAt)} TRT`;
}

function resultTitle(m: Meeting): string {
  const bank = BANKS[m.bankCode];
  const bps = Math.round((m.decisionRate! - m.previousRate!) * 100);
  if (bps === 0) return `${bank.nameTr} faizi değiştirmedi: ${rateTr(m)}`;
  const verb = bps > 0 ? "artırdı" : "indirdi";
  return `${bank.nameTr} faizi ${Math.abs(bps)} baz puan ${verb}: ${rateTr(m)}`;
}

/** Fed aralık ilan eder ("%3,75–4,00"); diğerleri tek oran. */
function rateTr(m: Meeting): string {
  const upper = num(m.decisionRate!);
  return m.decisionRateLower === undefined ? `%${upper}` : `%${num(m.decisionRateLower)}–${upper}`;
}

function num(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function buildRss(items: Item[]): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Merkez Bankaları Radar — faiz kararları</title>
<link>${SITE_URL}/takvim</link>
<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
<description>Fed, ECB, TCMB, BoE, BoJ ve RBA faiz kararları: bir hafta önceden hatırlatma ve açıklanan karar. Yatırım tavsiyesi değildir.</description>
<language>tr</language>
${items
  .map(
    (i) => `<item>
<title>${esc(i.title)}</title>
<link>${esc(i.link)}</link>
<guid isPermaLink="false">${esc(i.guid)}</guid>
<pubDate>${i.pubDate.toUTCString()}</pubDate>
<description>${esc(i.description)}</description>
</item>`,
  )
  .join("\n")}
</channel>
</rss>
`;
}
