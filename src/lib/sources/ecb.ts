import { zonedWallTimeToUtc } from "../tz";
import type { ScrapedMeeting } from "./shared";
import { fetchText, stripTags } from "./shared";

const ECB_URL =
  "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html";

/** ECB faiz kararı Day 2'de 14:15 Frankfurt saatinde yayımlanır (basın toplantısı 14:45). */
const ANNOUNCE_HOUR = 14;
const ANNOUNCE_MINUTE = 15;
const TZ = "Europe/Berlin";

/**
 * ECB takvim sayfası bir tanım listesidir:
 *   <dt>10/09/2026</dt>
 *   <dd>Governing Council ...: monetary policy meeting ... (Day 2), followed by press conference</dd>
 *
 * Yalnızca para politikası toplantısının ikinci günü faiz kararı taşır;
 * "non-monetary policy" ve "General Council" satırları elenir.
 */
export function parseEcbCalendar(html: string): ScrapedMeeting[] {
  const meetings: ScrapedMeeting[] = [];
  const entryRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g;

  for (const m of html.matchAll(entryRe)) {
    const dateText = stripTags(m[1]);
    const desc = stripTags(m[2]);

    if (!/monetary policy meeting/i.test(desc)) continue;
    if (/non-monetary/i.test(desc)) continue;
    if (!/\(Day 2\)/i.test(desc)) continue;

    const d = dateText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!d) continue;

    const at = zonedWallTimeToUtc(
      Number(d[3]),
      Number(d[2]),
      Number(d[1]),
      ANNOUNCE_HOUR,
      ANNOUNCE_MINUTE,
      TZ,
    );

    meetings.push({
      bankCode: "ecb",
      meetingAt: at.toISOString(),
      timeTbd: false,
      type: "rate_decision",
      sourceUrl: ECB_URL,
    });
  }

  return meetings;
}

export async function fetchEcbMeetings(): Promise<ScrapedMeeting[]> {
  return parseEcbCalendar(await fetchText(ECB_URL));
}
