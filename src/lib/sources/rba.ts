import { zonedWallTimeToUtc } from "../tz";
import type { RateObservation } from "./ecb-rates";
import type { ScrapedMeeting } from "./shared";
import { fetchText, stripTags } from "./shared";

/**
 * Reserve Bank of Australia — Monetary Policy Board takvimi ve nakit faiz.
 *
 * Erişim notu (3 Ekim 2026): rba.gov.au önünde Akamai var. curl ile
 * tarayıcı user-agent'ı taklit eden istekler 403 alıyor (TLS parmak izi ile
 * UA uyuşmuyor); projenin kendi dürüst UA'sıyla (shared.ts) Node fetch'i ve
 * GitHub Actions'tan gelen istekler 200 dönüyor. Tarayıcı taklidi yapmayın.
 */
export const RBA_SCHEDULE_URL =
  "https://www.rba.gov.au/schedules-events/board-meeting-schedules.html";
export const RBA_F1_URL = "https://www.rba.gov.au/statistics/tables/csv/f1-data.csv";
export const RBA_RATE_PAGE_URL = "https://www.rba.gov.au/statistics/cash-rate/";

/**
 * Karar toplantının ikinci günü 14:30 Sidney saatinde açıklanır. Kaynak,
 * RBA'nın kendi cash-rate sayfası: "A media release is issued at 2.30 pm
 * after each Monetary Policy Board meeting" (3 Ekim 2026'da doğrulandı).
 * AEST/AEDT geçişini tz.ts çözer.
 */
const ANNOUNCE_HOUR = 14;
const ANNOUNCE_MINUTE = 30;
const TZ = "Australia/Sydney";

const EN_MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/**
 * Sayfada yıl başına bir tablo: `<caption>Board meeting schedules 2026</caption>`,
 * satır başlığı ay, ilk <td> Monetary Policy Board ("2–3 February"), ikinci
 * <td> Payments System Board (faiz kararı değil, atlanır). Toplantısız aylar
 * colspan'lı tek <th> satırıdır. Karar son gün açıklanır; ay geçişli bir
 * toplantı ("31 March–1 April") için son parçadaki ay kullanılır.
 */
export function parseRbaCalendar(html: string): ScrapedMeeting[] {
  const meetings: ScrapedMeeting[] = [];

  for (const table of html.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const caption = table[0].match(/<caption[^>]*>([\s\S]*?)<\/caption>/i);
    const year = Number(caption && stripTags(caption[1]).match(/(\d{4})/)?.[1]);
    if (!year) continue;

    for (const row of table[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const mpb = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
      if (!mpb) continue;
      const text = stripTags(mpb[1]);
      if (!text) continue;

      // "2–3 February" → son gün 3, ay February
      const parts = text.split(/[–-]/).map((p) => p.trim());
      const last = parts.at(-1)!.match(/^(\d{1,2})\s+([A-Za-z]+)$/);
      const month = last && EN_MONTHS[last[2].toLowerCase()];
      if (!last || !month) continue;

      const at = zonedWallTimeToUtc(year, month, Number(last[1]), ANNOUNCE_HOUR, ANNOUNCE_MINUTE, TZ);
      meetings.push({
        bankCode: "rba",
        meetingAt: at.toISOString(),
        timeTbd: false,
        type: "rate_decision",
        sourceUrl: RBA_SCHEDULE_URL,
      });
    }
  }

  return meetings;
}

/**
 * F1 tablosu: ilk ~11 satır meta veri, ardından "04-Jan-2011,4.75,…". İkinci
 * sütun "Cash Rate Target". Yeni hedef karardan sonraki gün yürürlüğe girer
 * (29.09.2026 kararı → 30.09'da 4,60). Son satır çoğunlukla boştur.
 */
export function parseRbaCashRate(csv: string): RateObservation[] {
  const out: RateObservation[] = [];
  for (const line of csv.split(/\r?\n/)) {
    const [d, v] = line.split(",");
    const m = d?.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
    if (!m || !v) continue;
    const month = EN_MONTHS[Object.keys(EN_MONTHS).find((k) => k.startsWith(m[2].toLowerCase()))!];
    const value = Number(v);
    if (!month || !Number.isFinite(value)) continue;
    out.push({ date: `${m[3]}-${String(month).padStart(2, "0")}-${m[1]}`, value });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchRbaMeetings(): Promise<ScrapedMeeting[]> {
  return parseRbaCalendar(await fetchText(RBA_SCHEDULE_URL));
}

export async function fetchRbaCashRate(): Promise<RateObservation[]> {
  return parseRbaCashRate(await fetchText(RBA_F1_URL));
}
