import { zonedWallTimeToUtc } from "../tz";
import type { ScrapedMeeting } from "./shared";
import { fetchText, stripTags } from "./shared";

export const BOE_URL = "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates";

/**
 * Bank Rate kararı duyuru günü 12:00 Londra saatinde yayımlanır. Sayfa saati
 * yazmıyor; BoE haber RSS'indeki yayın damgalarıyla doğrulandı (3 Ekim 2026:
 * 18.06, 30.07, 17.09 kararlarının üçü de "12:00:00 +0100").
 */
const ANNOUNCE_HOUR = 12;
const TZ = "Europe/London";

const EN_MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/**
 * Sayfa yıl başına bir bölümdür: `<h2>2026 confirmed dates</h2>` ardından
 * ilk hücresi "Thursday 5 February" olan bir tablo. Yıl yalnızca başlıkta
 * geçer. Tarih, MPC'nin karar *duyuru* günüdür (toplantı bir gün önce biter).
 */
export function parseBoeCalendar(html: string): ScrapedMeeting[] {
  const meetings: ScrapedMeeting[] = [];
  const sections = html.split(/<h2[^>]*>\s*(?=\d{4}\s+(?:confirmed|provisional)\s+dates)/i);

  for (const section of sections.slice(1)) {
    const year = Number(section.slice(0, 4));
    const table = section.slice(0, section.search(/<\/table>/i));

    for (const row of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const first = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
      if (!first) continue;
      const m = stripTags(first[1]).match(/(\d{1,2})\s+([A-Za-z]+)/);
      const month = m && EN_MONTHS[m[2].toLowerCase()];
      if (!m || !month) continue;

      const at = zonedWallTimeToUtc(year, month, Number(m[1]), ANNOUNCE_HOUR, 0, TZ);
      meetings.push({
        bankCode: "boe",
        meetingAt: at.toISOString(),
        timeTbd: false,
        type: "rate_decision",
        sourceUrl: BOE_URL,
      });
    }
  }

  return meetings;
}

/** Aynı sayfadaki "Current Bank Rate 3.75%" kutusu. */
export function parseBoeCurrentRate(html: string): number | undefined {
  const m = stripTags(html).match(/Current Bank Rate\s*([\d.]+)\s*%/i);
  return m ? Number(m[1]) : undefined;
}

export async function fetchBoePage(): Promise<string> {
  return fetchText(BOE_URL);
}

export async function fetchBoeMeetings(): Promise<ScrapedMeeting[]> {
  return parseBoeCalendar(await fetchBoePage());
}
