import type { CalendarEvent, EventKind } from "./sources/speaking-calendars";
import { trtDayKey } from "./time";
import type { Meeting } from "./types";

/**
 * Haftalık paylaşım kartının içeriği: Türkiye takvim haftası (pazartesi–pazar)
 * içindeki faiz kararları ve piyasayı oynatan yayınlar. Kart pazartesi sabahı
 * paylaşılmak için; "önümüzdeki yedi gün" yerine takvim haftası, çünkü
 * paylaşımın başlığı "bu hafta" ve hafta ortasında açılsa da aynı haftayı
 * anlatmalı. Cumartesi ve pazar sıradaki haftayı verir: kart hafta sonu
 * hazırlanıp pazartesi paylaşılıyor, biten haftanın kararları açıklanmış olur.
 * Konuşmalar ve paneller karta girmez: sayıları çok, tek tek önemleri düşük
 * (ECB takvimi panelleri de "testimony" diye veriyor — bir haftada dört tane).
 */

export type WeekItem = { at: string; meeting: Meeting } | { at: string; event: CalendarEvent };

/** Karta giren yayın türleri ve önemi (küçük önce). */
const EVENT_WEIGHT: Partial<Record<EventKind, number>> = {
  "inflation-report": 0,
  minutes: 1,
  "mpc-summary": 1,
  cpi: 2,
  fsr: 3,
};

/** Görselde okunur kalan satır sayısı (1080×1350). */
export const WEEK_CARD_ROWS = 8;

const DAY_MS = 86_400_000;

/** Kartın haftası (TRT): pazartesi ve ertesi pazartesi, "YYYY-MM-DD"; hafta sonu sıradaki hafta. */
export function trtWeek(now: Date): { start: string; end: string } {
  const today = trtDayKey(now.toISOString());
  const noon = Date.parse(`${today}T12:00:00Z`);
  const weekday = (new Date(noon).getUTCDay() + 6) % 7; // pazartesi 0
  const sinceMonday = weekday >= 5 ? weekday - 7 : weekday;
  const start = new Date(noon - sinceMonday * DAY_MS).toISOString().slice(0, 10);
  const end = new Date(noon + (7 - sinceMonday) * DAY_MS).toISOString().slice(0, 10);
  return { start, end };
}

export function weekCardItems(
  meetings: Meeting[],
  events: CalendarEvent[],
  now: Date,
): { week: { start: string; end: string }; items: WeekItem[]; hidden: number } {
  const week = trtWeek(now);
  const inWeek = (iso: string) => {
    const day = trtDayKey(iso);
    return day >= week.start && day < week.end;
  };

  const decisions: WeekItem[] = meetings
    .filter((m) => m.status !== "cancelled" && (m.type === "rate_decision" || m.type === "projections") && inWeek(m.meetingAt))
    .map((m) => ({ at: m.meetingAt, meeting: m }));

  // Türkiye enflasyonu bu sitenin okuru için en önemli veri; diğer TÜFE'lerden önce.
  const weightOf = (e: CalendarEvent) => (e.kind === "cpi" && e.bankCode === "tcmb" ? 0 : (EVENT_WEIGHT[e.kind] ?? 9));
  const candidates = events
    .filter((e) => EVENT_WEIGHT[e.kind] !== undefined && inWeek(e.at))
    .sort((a, b) => weightOf(a) - weightOf(b) || a.at.localeCompare(b.at));
  const room = Math.max(0, WEEK_CARD_ROWS - decisions.length);
  const shown: WeekItem[] = candidates.slice(0, room).map((e) => ({ at: e.at, event: e }));

  const items = [...decisions, ...shown].sort((a, b) => a.at.localeCompare(b.at));
  return { week, items, hidden: candidates.length - shown.length };
}
