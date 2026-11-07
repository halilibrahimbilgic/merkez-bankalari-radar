import "server-only";
import { ALL_BANKS, isBankCode } from "./banks";
import { getDecisionViews } from "./data/decisions";
import { getAllMeetings, getMeetingsFetchedAt } from "./data/meetings";
import { getAllMinutes } from "./data/minutes";
import { getTrInflation } from "./data/tr-inflation";
import type { HistorySource } from "./expectation-history";
import { SITE_URL } from "./site";
import { formatTimeTrt, trtDayKey } from "./time";
import { monthlyExpectation } from "./tr-inflation";
import type { BankCode, Meeting } from "./types";

/**
 * Açık API, sürüm 1 (/api/v1): anahtarsız, yalnızca okuma, önbellekten.
 *
 * Yalnızca yeniden dağıtılmasına izin olan ya da bize ait veri: takvim,
 * kararlar, karar metni ve tutanakların özet ve puanları (model çıktısı),
 * Türkiye TÜFE ve TCMB anketi. Atlanta Fed olasılıkları (kişisel/eğitim),
 * BoE OIS beklentisi (ticari olmayan) ve karar metinlerinin tam metni
 * (TCMB: ticari kullanım izne tabi) API'de yok — üçüncü taraf onu ticari
 * kullanabilir (ARCHITECTURE.md §6).
 *
 * Alan adları İngilizce ve sabit: biçim değişirse /api/v2 açılır, v1 kırılmaz.
 */

export const API_VERSION = "v1";

/** Sürprizi yeniden dağıtılabilir kaynaklar (BoE OIS yok, bkz. yukarı). */
const REDISTRIBUTABLE: HistorySource[] = ["ecb-sma", "tcmb-pka", "nyfed-sme"];

export function apiJson(data: unknown, extra: Record<string, unknown> = {}): Response {
  const body = {
    data,
    meta: {
      version: API_VERSION,
      generatedAt: new Date().toISOString(),
      ...extra,
      docs: `${SITE_URL}/gelistiriciler`,
      attribution: "Faiz Radar (faizradar.com) — kaynak gösterilerek kullanılabilir / free to use with attribution",
      disclaimer: "Yatırım tavsiyesi değildir / Not investment advice",
    },
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      // Önbellek (CDN) yükü taşır: anahtar ve IP sınırı olmadan kötüye kullanım
      // sunucuya değil önbelleğe düşer. Veri günde birkaç kez değişir.
      "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export function apiError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { status, message } }, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
  });
}

/** "fed" | ... ya da undefined (hepsi); geçersizse null. */
export function bankParam(raw: string | undefined): BankCode | undefined | null {
  if (raw === undefined) return undefined;
  return isBankCode(raw) ? raw : null;
}

export const BANK_CODES = ALL_BANKS.map((b) => b.code);

function meetingShape(m: Meeting) {
  const decided = m.decisionRate !== undefined;
  return {
    id: m.id,
    bank: m.bankCode,
    type: m.type,
    status: m.status,
    /** UTC, ISO-8601. Saat belli değilse gün başı ve timeTbd=true. */
    at: m.meetingAt,
    timeTbd: m.timeTbd,
    /** Türkiye saatiyle gün ve saat. */
    trt: { date: trtDayKey(m.meetingAt), time: m.timeTbd ? null : formatTimeTrt(m.meetingAt) },
    decision: decided
      ? {
          rate: m.decisionRate,
          rateLower: m.decisionRateLower ?? null,
          previousRate: m.previousRate ?? null,
          changeBp: m.previousRate === undefined ? null : Math.round((m.decisionRate! - m.previousRate) * 100),
        }
      : null,
    url: `${SITE_URL}/karar/${m.id}`,
  };
}

export async function apiMeetings(bank?: BankCode) {
  const meetings = (await getAllMeetings())
    .filter((m) => (m.type === "rate_decision" || m.type === "projections") && (!bank || m.bankCode === bank))
    .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt));
  return { data: meetings.map(meetingShape), meta: { count: meetings.length, sourceUpdatedAt: await getMeetingsFetchedAt() } };
}

export async function apiDecisions(bank?: BankCode) {
  const [views, minutes] = await Promise.all([getDecisionViews({ bankCode: bank }), getAllMinutes()]);
  const data = views.map((v) => {
    const s = v.statement?.summary;
    const mi = minutes.find((x) => x.meetingId === v.meeting.id)?.summary;
    const e = v.expectation && REDISTRIBUTABLE.includes(v.expectation.source) ? v.expectation : undefined;
    return {
      ...meetingShape(v.meeting),
      expectation: e
        ? {
            source: e.source,
            kind: e.kind,
            expectedRate: e.point.rate,
            asOf: e.point.date,
            surpriseBp: e.surprise.bp,
            surprise: e.surprise.label,
          }
        : null,
      statement: s
        ? {
            headline: { tr: s.headlineTr, en: s.headlineEn },
            toneVsPrevious: s.tone,
            score: s.score ?? null,
            sourceUrl: v.statement?.urls.en ?? v.statement?.urls.tr ?? null,
          }
        : null,
      minutes: mi ? { headline: { tr: mi.headlineTr, en: mi.headlineEn }, score: mi.score } : null,
    };
  });
  return { data, meta: { count: data.length, scoreScale: "-10 (çok güvercin / very dovish) … +10 (çok şahin / very hawkish)" } };
}

export async function apiTrInflation() {
  const d = await getTrInflation();
  if (!d) return undefined;
  return {
    data: {
      history: d.history.map((h) => ({ ...h, expectedMom: monthlyExpectation(d.survey, h.period)?.value ?? null })),
      releases: d.releases,
      survey: d.survey.map((r) => ({
        round: r.round,
        publishedOn: r.publishedOn ?? null,
        monthly: { current: r.monthly[0] ?? null, next1: r.monthly[1] ?? null, next2: r.monthly[2] ?? null },
        yearEnd: r.yearEnd ?? null,
        months12: r.months12 ?? null,
      })),
    },
    meta: {
      sources: "TÜİK (EVDS, TP.TUKFIY2025.GENEL), TCMB Piyasa Katılımcıları Anketi (TP.PKAUO.S01.A–E), TÜİK veri takvimi",
      sourceUpdatedAt: d.fetchedAt,
    },
  };
}
