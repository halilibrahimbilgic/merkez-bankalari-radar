import { fmtPercent, fmtPercentRange, type Lang } from "./i18n";
import type { Meeting } from "./types";

/**
 * Karar oranlarının metni — Fed bir aralık ilan eder ("%3,50–3,75"),
 * diğerleri tek oran. Türkçe cümlelerde sayıya ek getirilmez ("%37'den")
 * — ünlü uyumu sayının okunuşuna bağlı ve otomatik ek hatalı çıkardı;
 * cümleler eki gerektirmeyecek biçimde kurulur.
 */

/** Karar sayfaları bu günden başlar — altı bankanın takvim arşivi 2026'dan. */
export const DECISIONS_FROM = "2026-01-01";

/** Karar sayfası var mı: arşiv döneminde ve oranı belli bir karar. */
export function hasDecisionPage(m: Meeting, now: Date): boolean {
  return m.meetingAt >= DECISIONS_FROM && m.decisionRate !== undefined && new Date(m.meetingAt) <= now;
}

/** Fed aralıkları 25 bp genişliğinde: üst sınır → "%3,50–3,75". */
export function fedRange(upper: number, lang: Lang): string {
  return fmtPercentRange(upper - 0.25, upper, lang);
}

export function formatDecisionRate(m: Meeting, lang: Lang): string {
  return m.decisionRateLower === undefined
    ? fmtPercent(m.decisionRate!, lang)
    : fmtPercentRange(m.decisionRateLower, m.decisionRate!, lang);
}

export function formatPreviousRate(m: Meeting, lang: Lang): string {
  return m.bankCode === "fed" ? fedRange(m.previousRate!, lang) : fmtPercent(m.previousRate!, lang);
}

/** Beklenen oran: Fed'de üst sınır çeyrek puan ızgarasındaysa aralık olarak. */
export function formatExpectedRate(bankCode: Meeting["bankCode"], rate: number, lang: Lang): string {
  if (bankCode === "fed" && Number.isInteger(Math.round(rate * 100) / 25)) return fedRange(rate, lang);
  return fmtPercent(rate, lang);
}

/** "Politika faizi 25 baz puan artırıldı: %3,75–4,00" / "Policy rate raised by 25 bp to 3.75–4.00%" */
export function decisionSentence(m: Meeting, lang: Lang): string {
  const rate = formatDecisionRate(m, lang);
  const bp = m.previousRate === undefined ? 0 : Math.round((m.decisionRate! - m.previousRate) * 100);
  const abs = Math.abs(bp);
  if (lang === "en") {
    if (bp > 0) return `Policy rate raised by ${abs} bp to ${rate}`;
    if (bp < 0) return `Policy rate cut by ${abs} bp to ${rate}`;
    return `Policy rate held at ${rate}`;
  }
  if (bp > 0) return `Politika faizi ${abs} baz puan artırıldı: ${rate}`;
  if (bp < 0) return `Politika faizi ${abs} baz puan indirildi: ${rate}`;
  return `Politika faizi sabit tutuldu: ${rate}`;
}
