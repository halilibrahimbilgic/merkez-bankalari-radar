import { zonedWallTimeToUtc } from "../tz";
import type { ScrapedMeeting } from "./shared";
import { fetchText } from "./shared";

const FOMC_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";

/** FOMC kararı toplantının ikinci günü 14:00 New York saatinde açıklanır. */
const ANNOUNCE_HOUR = 14;
const ANNOUNCE_MINUTE = 0;
const TZ = "America/New_York";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Sayfa ay adını yerine göre tam ("March") ya da kısaltılmış ("Apr") yazar. */
function monthNumber(name: string): number | null {
  const n = name.trim().toLowerCase().replace(/\.$/, "");
  if (n.length < 3) return null;
  const i = MONTHS.findIndex((m) => m.startsWith(n) || n.startsWith(m));
  return i === -1 ? null : i + 1;
}

/**
 * federalreserve.gov FOMC takvim sayfasını ayrıştırır.
 *
 * Sayfa yılı `<div class="panel ..."><h4>2026 FOMC Meetings</h4>` başlığıyla,
 * her toplantıyı `<div class="fomc-meeting__month">Eylül</div>` +
 * `<div class="fomc-meeting__date">15-16*</div>` çiftiyle verir.
 * `*` işareti ekonomik projeksiyon (SEP) yayımlanan toplantıyı gösterir.
 */
export function parseFomcCalendar(html: string): ScrapedMeeting[] {
  const meetings: ScrapedMeeting[] = [];

  // Yıl bloklarını başlıklarından ayır: "<yıl> FOMC Meetings"
  const yearBlocks = splitByYear(html);

  for (const { year, body } of yearBlocks) {
    const monthRe = /fomc-meeting__month[^>]*>\s*(?:<[^>]+>\s*)*([A-Za-z]+)/g;
    const dateRe = /fomc-meeting__date[^>]*>\s*(?:<[^>]+>\s*)*([^<]+)/g;

    const months = [...body.matchAll(monthRe)].map((m) => m[1].trim().toLowerCase());
    const dates = [...body.matchAll(dateRe)].map((m) => m[1].trim());

    for (let i = 0; i < Math.min(months.length, dates.length); i++) {
      const parsed = parseMeetingDate(year, months[i], dates[i]);
      if (!parsed) continue;
      meetings.push(parsed);
    }
  }

  return meetings;
}

/**
 * "27-28" → ayın 28'i; "29-1" gibi ay taşan aralıkta ikinci gün sonraki aydadır.
 * Sondaki "*" projeksiyon toplantısını işaretler.
 */
function parseMeetingDate(
  year: number,
  monthName: string,
  raw: string,
): ScrapedMeeting | null {
  const month = monthNumber(monthName);
  if (!month) return null;

  const hasProjections = raw.includes("*");
  const cleaned = raw.replace(/[*†‡\s]/g, "");

  // Yalnızca "28" veya "27-28" biçimini kabul et. "22 (notation vote)" gibi
  // faiz kararı olmayan satırlar buradan elenir.
  if (!/^\d{1,2}(-\d{1,2})?$/.test(cleaned)) return null;

  const nums = cleaned.split("-").map((n) => parseInt(n, 10));

  const first = nums[0];
  const last = nums[nums.length - 1];

  // Karar günü aralığın son günü. Aralık ay sınırını aşıyorsa (ör. 29-1)
  // son gün bir sonraki aya düşer.
  let decisionMonth = month;
  let decisionYear = year;
  if (last < first) {
    decisionMonth = month + 1;
    if (decisionMonth > 12) {
      decisionMonth = 1;
      decisionYear = year + 1;
    }
  }

  const at = zonedWallTimeToUtc(
    decisionYear,
    decisionMonth,
    last,
    ANNOUNCE_HOUR,
    ANNOUNCE_MINUTE,
    TZ,
  );

  return {
    bankCode: "fed",
    meetingAt: at.toISOString(),
    timeTbd: false,
    type: hasProjections ? "projections" : "rate_decision",
    sourceUrl: FOMC_URL,
  };
}

function splitByYear(html: string): { year: number; body: string }[] {
  const anchors = [...html.matchAll(/(\d{4})\s+FOMC\s+Meetings/g)];
  return anchors.map((m, i) => ({
    year: parseInt(m[1], 10),
    body: html.slice(m.index!, anchors[i + 1]?.index ?? html.length),
  }));
}

export async function fetchFomcMeetings(): Promise<ScrapedMeeting[]> {
  return parseFomcCalendar(await fetchText(FOMC_URL));
}
