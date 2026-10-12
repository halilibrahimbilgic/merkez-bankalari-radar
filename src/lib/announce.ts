import { BANKS } from "./banks";
import { formatDate, formatTimeTrt } from "./time";
import type { Meeting } from "./types";

/**
 * Karar duyurularının ortak cümleleri — RSS ve Telegram aynı metni kullanır,
 * böylece iki kanal aynı kararı farklı ifade etmez. "server-only" değildir:
 * scripts/ altındaki işler de içe aktarır.
 */

/** "22 Ekim 2026, 14:00 TRT" — saat açıklanmadıysa saat yerine not. */
export function whenTr(m: Meeting): string {
  return m.timeTbd
    ? `${formatDate(m.meetingAt)} (saat açıklanmadı)`
    : `${formatDate(m.meetingAt)}, ${formatTimeTrt(m.meetingAt)} TRT`;
}

/** "TCMB faizi 250 baz puan indirdi: %34,50". Karar oranı dolu olmalı. */
export function resultTitle(m: Meeting): string {
  const bank = BANKS[m.bankCode];
  const bps = Math.round((m.decisionRate! - m.previousRate!) * 100);
  if (bps === 0) return `${bank.nameTr} faizi değiştirmedi: ${rateTr(m)}`;
  const verb = bps > 0 ? "artırdı" : "indirdi";
  return `${bank.nameTr} faizi ${Math.abs(bps)} baz puan ${verb}: ${rateTr(m)}`;
}

/** Fed aralık ilan eder ("%3,75–4,00"); diğerleri tek oran. */
export function rateTr(m: Meeting): string {
  const upper = num(m.decisionRate!);
  return m.decisionRateLower === undefined ? `%${upper}` : `%${num(m.decisionRateLower)}–${upper}`;
}

export function num(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
