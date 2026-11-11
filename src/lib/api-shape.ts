import { SITE_URL } from "./site";
import { formatTimeTrt, trtDayKey } from "./time";
import type { Meeting } from "./types";

/**
 * API v1'in toplantı biçimi. "server-only" olan api-v1.ts'ten ayrı durur ki
 * testler anahtar listesini doğrudan sabitleyebilsin ("biçim v1 içinde
 * değişmez" sözünün korunması).
 */
export function meetingShape(m: Meeting) {
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
