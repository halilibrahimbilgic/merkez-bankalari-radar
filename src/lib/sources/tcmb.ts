import { zonedWallTimeToUtc } from "../tz";
import type { ScrapedMeeting } from "./shared";
import { fetchText, stripTags } from "./shared";

const TCMB_URL =
  "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Takvim";

/** PPK kararı toplantı günü 14:00 Türkiye saatinde açıklanır. */
const ANNOUNCE_HOUR = 14;
const ANNOUNCE_MINUTE = 0;
const TZ = "Europe/Istanbul";

const TR_MONTHS: Record<string, number> = {
  ocak: 1, şubat: 2, subat: 2, mart: 3, nisan: 4, mayıs: 5, mayis: 5,
  haziran: 6, temmuz: 7, ağustos: 8, agustos: 8, eylül: 9, eylul: 9,
  ekim: 10, kasım: 11, kasim: 11, aralık: 12, aralik: 12,
};

/**
 * TCMB duyuru takvimi 4 sütunlu tek bir tablodur:
 *   [PPK Toplantı Kararı | PPK Toplantı Özeti | Enflasyon Raporu | Finansal İstikrar Raporu]
 * Faiz kararı yalnızca ilk sütundadır; diğer sütunlar rapor tarihleridir.
 */
export function parseTcmbCalendar(html: string): ScrapedMeeting[] {
  const start = html.indexOf("PARA POL");
  if (start === -1) return [];
  const tableEnd = html.indexOf("</table>", start);
  const table = html.slice(start, tableEnd === -1 ? html.length : tableEnd);

  const meetings: ScrapedMeeting[] = [];

  for (const row of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) =>
      stripTags(c[1]),
    );
    const decisionCell = cells[0];
    if (!decisionCell) continue;

    const parsed = parseTrDate(decisionCell);
    if (!parsed) continue; // başlık satırı ve boş hücreler burada elenir

    const at = zonedWallTimeToUtc(
      parsed.year,
      parsed.month,
      parsed.day,
      ANNOUNCE_HOUR,
      ANNOUNCE_MINUTE,
      TZ,
    );

    meetings.push({
      bankCode: "tcmb",
      meetingAt: at.toISOString(),
      timeTbd: false,
      type: "rate_decision",
      sourceUrl: TCMB_URL,
    });
  }

  return meetings;
}

/** "22 Ocak 2026" → {year, month, day} */
function parseTrDate(text: string): { year: number; month: number; day: number } | null {
  const m = text.match(/(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
  if (!m) return null;
  const month = TR_MONTHS[m[2].toLocaleLowerCase("tr-TR")];
  if (!month) return null;
  return { year: Number(m[3]), month, day: Number(m[1]) };
}

export async function fetchTcmbMeetings(): Promise<ScrapedMeeting[]> {
  return parseTcmbCalendar(await fetchText(TCMB_URL));
}
