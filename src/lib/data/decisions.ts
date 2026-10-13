import "server-only";
import {
  preDecisionPoint,
  surprise,
  type ExpectationPoint,
  type HistorySource,
  type SurpriseLabel,
} from "../expectation-history";
import { DECISIONS_FROM } from "../decision-format";
import { moveOdds } from "../implied-path";
import type { StatementRecord } from "../statements";
import type { BankCode, Meeting } from "../types";
import { getExpectationHistory } from "./history";
import { getAllMeetings } from "./meetings";
import { getStatements } from "./statements";

/**
 * Karar sayfası ve listesi: kararın kendisi, karardan önceki beklenti ve
 * aradaki fark (sürpriz), beklentinin seyri, karar metni kaydı.
 * Sürprizin kuralları: src/lib/expectation-history.ts.
 */

export type Odds = { cut: number; hold: number; hike: number };

export interface DecisionExpectation {
  source: HistorySource;
  kind: "market" | "survey";
  sourceUrl: string;
  point: ExpectationPoint;
  /** Beklenen değişim (bp), önceki orana göre. */
  expectedChangeBp: number;
  odds?: Odds;
  /** Gerçekleşen sonuca verilen olasılık (%), dağılım veren kaynakta. */
  actualPct?: number;
  surprise: { bp: number; label: SurpriseLabel };
}

/** Beklenti yoksa nedeni: kaynak hiç yok / anket henüz yayımlanmadı. */
export type MissingReason = "no-source" | "pending";

export interface DecisionView {
  meeting: Meeting;
  previous?: Meeting;
  next?: Meeting;
  /** Karardaki değişim (bp). */
  changeBp?: number;
  expectation?: DecisionExpectation;
  missing?: MissingReason;
  /** Önceki karardan bu karara beklentinin seyri. */
  history: ExpectationPoint[];
  statement?: StatementRecord;
}

/** Yeniden yayımlanabilir beklenti kaynağı olan bankalar (ARCHITECTURE.md §6). */
const HAS_SOURCE: Record<BankCode, boolean> = { fed: true, ecb: true, tcmb: true, boe: true, boj: false, rba: false };

function isDecision(m: Meeting): boolean {
  return m.status !== "cancelled" && (m.type === "rate_decision" || m.type === "projections");
}

/** SME dağılımını önceki orana göre yön olasılıklarına çevirir. */
function distOdds(dist: NonNullable<ExpectationPoint["dist"]>, previousUpper: number): Odds {
  const odds = { cut: 0, hold: 0, hike: 0 };
  for (const b of dist) {
    if (b.upper !== null && Math.abs(b.upper - previousUpper) < 0.01) odds.hold += b.pct;
    else if (b.upper !== null && b.upper < previousUpper) odds.cut += b.pct;
    else odds.hike += b.pct;
  }
  const r = (n: number) => Math.round(n * 10) / 10;
  return { cut: r(odds.cut), hold: r(odds.hold), hike: r(odds.hike) };
}

export async function getDecisionViews(
  opts: { bankCode?: BankCode; now?: Date } = {},
): Promise<DecisionView[]> {
  const now = opts.now ?? new Date();
  const [meetings, history, statements] = await Promise.all([
    getAllMeetings(),
    getExpectationHistory(),
    getStatements(),
  ]);
  const byBank = new Map<BankCode, Meeting[]>();
  for (const m of meetings.filter(isDecision)) {
    const list = byBank.get(m.bankCode) ?? [];
    list.push(m);
    byBank.set(m.bankCode, list);
  }

  const views: DecisionView[] = [];
  for (const [bank, list] of byBank) {
    if (opts.bankCode && bank !== opts.bankCode) continue;
    list.sort((a, b) => a.meetingAt.localeCompare(b.meetingAt));
    const h = history.banks[bank];
    list.forEach((m, i) => {
      if (m.meetingAt < DECISIONS_FROM || m.decisionRate === undefined || new Date(m.meetingAt) > now) return;
      const previous = list[i - 1];
      const points = h?.meetings[m.id] ?? [];
      const after = previous?.meetingAt.slice(0, 10) ?? "";
      const view: DecisionView = {
        meeting: m,
        previous,
        next: list[i + 1],
        changeBp: m.previousRate === undefined ? undefined : Math.round((m.decisionRate - m.previousRate) * 100),
        history: points.filter((p) => p.date >= after && p.date < m.meetingAt.slice(0, 10)),
        statement: statements.find((s) => s.meetingId === m.id),
      };
      const point = preDecisionPoint(points, m.meetingAt, previous?.meetingAt);
      if (h && point && m.previousRate !== undefined) {
        const expectedChangeBp = Math.round((point.rate - m.previousRate) * 100);
        const odds = point.odds ?? (point.dist ? distOdds(point.dist, m.previousRate) : h.kind === "market" ? marketOdds(expectedChangeBp) : undefined);
        view.expectation = {
          source: h.source,
          kind: h.kind,
          sourceUrl: h.sourceUrl,
          point,
          expectedChangeBp,
          odds,
          actualPct: point.dist?.find((b) => b.upper !== null && Math.abs(b.upper - m.decisionRate!) < 0.01)?.pct,
          surprise: surprise(m.decisionRate, point.rate),
        };
      } else {
        view.missing = HAS_SOURCE[bank] ? "pending" : "no-source";
      }
      views.push(view);
    });
  }
  return views.sort((a, b) => b.meeting.meetingAt.localeCompare(a.meeting.meetingAt));
}

export async function getDecisionView(id: string): Promise<DecisionView | undefined> {
  const bank = id.split("-")[0] as BankCode;
  return (await getDecisionViews({ bankCode: bank })).find((v) => v.meeting.id === id);
}

export async function getDecisionIds(): Promise<string[]> {
  return (await getDecisionViews()).map((v) => v.meeting.id);
}

/** Piyasa fiyatlamasından 25 bp adım varsayımıyla yön olasılıkları (BoE). */
function marketOdds(changeBp: number): Odds {
  const m = moveOdds(changeBp);
  return {
    cut: m.direction === "cut" ? m.pct : 0,
    hold: m.direction === "hold" ? 100 : 100 - m.pct,
    hike: m.direction === "hike" ? m.pct : 0,
  };
}
