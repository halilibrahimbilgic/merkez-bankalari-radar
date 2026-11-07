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

const TZ = "Europe/Istanbul";
const dayFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, day: "numeric", month: "short" });
const weekdayFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, weekday: "short" });
const rangeDayFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, day: "numeric" });
const rangeFullFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });

/** "Çar 10 Ara" */
export function weekDayLabel(iso: string): string {
  return `${weekdayFmt.format(new Date(iso))} ${dayFmt.format(new Date(iso))}`;
}

/** "7–13 Aralık 2026" ya da "30 Kas – 6 Aralık 2026" */
export function weekRangeLabel(week: { start: string; end: string }): string {
  const start = new Date(`${week.start}T12:00:00Z`);
  const last = new Date(Date.parse(`${week.end}T12:00:00Z`) - DAY_MS);
  return start.getUTCMonth() === last.getUTCMonth()
    ? `${rangeDayFmt.format(start)}–${rangeFullFmt.format(last)}`
    : `${dayFmt.format(start)} – ${rangeFullFmt.format(last)}`;
}

export function weekHeadline(decisions: number): string {
  if (decisions === 0) return "Bu hafta faiz kararı yok";
  return decisions === 1 ? "Bu hafta bir faiz kararı" : `Bu hafta ${decisions} faiz kararı`;
}
