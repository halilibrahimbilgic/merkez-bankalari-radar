/**
 * Beklenti geçmişi (data/history/expectations.json) — fetch:expectations her
 * koşuda, backfill-expectations bir kez yazar. Kaynaktan noktalara çeviri
 * burada tek yerde: iki script aynı kuralla üretsin diye.
 * Noktanın "date" alanının anlamı: src/lib/expectation-history.ts.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  mergePoints,
  type BankExpectationHistory,
  type ExpectationHistory,
  type ExpectationPoint,
} from "../src/lib/expectation-history";
import { impliedPath } from "../src/lib/implied-path";
import { soniaOn, type OisForwards } from "../src/lib/sources/boe-ois";
import { summarizeChange, type SmaRound } from "../src/lib/sources/ecb-sma";
import type { SmeRound } from "../src/lib/sources/nyfed-sme";
import { mapSurveyMeetings, type TcmbSurvey } from "../src/lib/sources/tcmb-survey";
import type { BankCode, Meeting } from "../src/lib/types";

export const HISTORY_FILE = path.join(process.cwd(), "data", "history", "expectations.json");

export async function loadHistory(): Promise<ExpectationHistory> {
  try {
    return JSON.parse(await readFile(HISTORY_FILE, "utf8")) as ExpectationHistory;
  } catch {
    return { fetchedAt: new Date(0).toISOString(), banks: {} };
  }
}

export async function saveHistory(h: ExpectationHistory): Promise<void> {
  await mkdir(path.dirname(HISTORY_FILE), { recursive: true });
  h.fetchedAt = new Date().toISOString();
  await writeFile(HISTORY_FILE, JSON.stringify(h, null, 1) + "\n", "utf8");
}

type Points = Record<string, ExpectationPoint[]>;

export function mergeBank(
  h: ExpectationHistory,
  bank: BankCode,
  meta: Omit<BankExpectationHistory, "meetings">,
  points: Points,
): number {
  const entry = (h.banks[bank] ??= { ...meta, meetings: {} });
  Object.assign(entry, meta);
  let n = 0;
  for (const [id, list] of Object.entries(points)) {
    entry.meetings[id] = mergePoints(entry.meetings[id], list);
    n += list.length;
  }
  return n;
}

function push(points: Points, id: string, p: ExpectationPoint) {
  (points[id] ??= []).push(p);
}

/** Karar kayıtlarından o gün yürürlükte olan politika faizi (gün sonu). */
export function rateOn(decisions: Meeting[], day: string, fallback: number): number {
  const last = decisions
    .filter((m) => m.decisionRate !== undefined && m.meetingAt.slice(0, 10) <= day)
    .at(-1);
  return last?.decisionRate ?? fallback;
}

/** BoE: her eğri günü için sonraki toplantılarda beklenen Bank Rate. */
export function boePoints(
  curves: OisForwards[],
  decisions: Meeting[],
  sonia: Map<string, number>,
  currentRate: number,
): Points {
  const points: Points = {};
  for (const curve of curves) {
    const overnight = soniaOn(sonia, curve.date);
    if (overnight === undefined) continue;
    const rate = rateOn(decisions, curve.date, currentRate);
    for (const m of impliedPath(curve, decisions, rate, overnight)) {
      push(points, m.meetingId, { date: curve.date, rate: m.impliedRate });
    }
  }
  return points;
}

/**
 * ECB SMA turu: aylık satırlar toplantı sonrası beklentidir. Oluşma günü,
 * turun ilk toplantısından bir gün öncesi — yanıtlar o toplantıdan önce
 * toplanır, sonuçlar ertesi gün yayımlanır.
 */
export function smaPoints(round: SmaRound, decisions: Meeting[]): Points {
  const points: Points = {};
  const matched = round.path
    .map((row, i) => ({ row, i, m: decisions.find((x) => x.meetingAt.slice(0, 7) === row.month) }))
    .filter((x) => x.m);
  const first = matched[0]?.m;
  if (!first) return points;
  const formed = dayBefore(first.meetingAt.slice(0, 10));
  const odds = [round.firstChange, round.secondChange];
  for (const { row, i, m } of matched) {
    const bins = i < 2 ? odds[i] : undefined;
    push(points, m!.id, {
      date: formed,
      publishedOn: round.publishedOn,
      round: first.meetingAt.slice(0, 7),
      rate: row.median,
      p25: row.p25,
      p75: row.p75,
      odds: bins && summarizeChange(bins),
    });
  }
  return points;
}

/**
 * TCMB anketi: oluşma günü yayım günüdür (toplama aralığı EVDS'de yok).
 * Yayım günü bilinmiyorsa `fallback` (ilk görüldüğü gün) kullanılır.
 */
export function tcmbPoints(
  surveys: TcmbSurvey[],
  decisions: Meeting[],
  releaseDates: Map<string, string>,
  fallback: (period: string) => string | undefined,
): Points {
  const points: Points = {};
  for (const s of surveys) {
    const date = releaseDates.get(s.period) ?? fallback(s.period);
    if (!date) continue;
    let mapped: ReturnType<typeof mapSurveyMeetings<Meeting>>;
    try {
      mapped = mapSurveyMeetings(s, decisions);
    } catch {
      continue; // takvimde yeterli toplantı yok — yanlış toplantıya yazmaktansa atla
    }
    for (const { meeting, expectedRate } of mapped) {
      push(points, meeting.id, { date, publishedOn: date, round: s.period, rate: expectedRate });
    }
  }
  return points;
}

/** NY Fed SME turu: oluşma günü yanıtların son günü. */
export function smePoints(round: SmeRound, decisions: Meeting[]): Points {
  const points: Points = {};
  for (const m of round.meetings) {
    const meeting = decisions.find((x) => x.meetingAt.slice(0, 10) === m.date);
    if (!meeting) continue;
    push(points, meeting.id, {
      date: round.dueDate,
      round: round.round,
      rate: m.median,
      p25: m.p25,
      p75: m.p75,
      dist: m.dist,
    });
  }
  return points;
}

function dayBefore(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
