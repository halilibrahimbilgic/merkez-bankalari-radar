import { zonedWallTimeToUtc } from "../tz";
import type { ScrapedMeeting } from "./shared";
import { fetchText, stripTags } from "./shared";

export const BOJ_URL = "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm";

const TZ = "Asia/Tokyo";

/**
 * BoJ kararı sabit bir saatte değil, toplantı biter bitmez açıklanır (sayfa:
 * "released immediately after relevant MPMs"); pratikte toplantının son günü
 * öğlene doğru. Saat bilinmediği için timeTbd: true — arayüz "saat
 * açıklanmadı" yazar. 12:00 JST yalnızca sıralama ve geri sayım için yer
 * tutucudur, sunulmaz.
 */
const PLACEHOLDER_HOUR = 12;

const EN_MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, june: 6, jun: 6,
  july: 7, jul: 7, aug: 8, sept: 9, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Sayfada yıl başına bir tablo var; yıl `<caption>Table : 2026</caption>`
 * içinde. İlk sütun toplantı günleri: "Jan. 22 (Thurs.), 23 (Fri.)". Karar
 * son gün açıklanır. Ay, gün listesinin başında bir kez yazılır; "Apr. 30
 * (Thurs.), May 1 (Fri.)" gibi ay geçişleri için her parçada ay aranır.
 */
export function parseBojCalendar(html: string): ScrapedMeeting[] {
  const meetings: ScrapedMeeting[] = [];

  for (const table of html.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const caption = table[0].match(/<caption[^>]*>([\s\S]*?)<\/caption>/i);
    const year = Number(caption && stripTags(caption[1]).match(/(\d{4})/)?.[1]);
    if (!year) continue;

    for (const row of table[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const first = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
      if (!first) continue; // başlık satırları <th>

      const last = lastDay(stripTags(first[1]));
      if (!last) continue;

      const at = zonedWallTimeToUtc(year, last.month, last.day, PLACEHOLDER_HOUR, 0, TZ);
      meetings.push({
        bankCode: "boj",
        meetingAt: at.toISOString(),
        timeTbd: true,
        type: "rate_decision",
        sourceUrl: BOJ_URL,
      });
    }
  }

  return meetings;
}

/** "Jan. 22 (Thurs.), 23 (Fri.)" → { month: 1, day: 23 } */
function lastDay(text: string): { month: number; day: number } | null {
  let month: number | undefined;
  let result: { month: number; day: number } | null = null;

  // Parantez içindeki gün adlarını at, kalan "Jan. 22, 23" parçalarını tara.
  const cleaned = text.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "");
  for (const part of cleaned.split(",")) {
    const m = part.trim().match(/^(?:([A-Za-z]+)\.?\s+)?(\d{1,2})$/);
    if (!m) continue;
    if (m[1]) month = EN_MONTHS[m[1].toLowerCase()];
    if (!month) continue;
    result = { month, day: Number(m[2]) };
  }
  return result;
}

export async function fetchBojMeetings(): Promise<ScrapedMeeting[]> {
  return parseBojCalendar(await fetchText(BOJ_URL));
}
