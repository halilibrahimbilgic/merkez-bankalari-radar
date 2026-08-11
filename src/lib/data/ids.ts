import type { BankCode, MeetingType } from "../types";

/**
 * Toplantı kimliği doğrudan içerikten türetilir: veritabanı olmadan da
 * kalıcı ve tekrar üretilebilir olur, URL'lerde okunabilir görünür.
 * Örn. "fed-2026-09-16".
 */
export function meetingId(
  bankCode: BankCode,
  meetingAtIso: string,
  type: MeetingType,
): string {
  const day = meetingAtIso.slice(0, 10);
  return type === "rate_decision" || type === "projections"
    ? `${bankCode}-${day}`
    : `${bankCode}-${day}-${type}`;
}
