import type { CalendarEvent } from "./sources/speaking-calendars";
import { trtDayKey } from "./time";
import type { BankCode } from "./types";

/**
 * TÜFE açıklamasının ait olduğu ay: açıklandığı ayın bir öncesi. Takvimdeki
 * beş ekonominin hepsinde böyle (ABD, Türkiye, İngiltere, Japonya ulusal
 * TÜFE, Avustralya aylık TÜFE). Ay, Türkiye saatindeki güne göre.
 */
export function cpiReferenceMonth(releaseAt: string): string {
  const [y, m] = trtDayKey(releaseAt).split("-").map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
}

/**
 * Son `hours` saatte TÜFE'si açıklanmış ama kaydı hâlâ önceki aya ait
 * ekonomiler. Haber işi yalnızca bunların kaynağına gider: açıklanan rakam
 * ertesi sabahki günlük işi beklemeden sitede olur.
 */
export function dueCpiReleases(
  events: Pick<CalendarEvent, "kind" | "bankCode" | "at">[],
  readings: { bankCode: BankCode; period: string }[],
  now: Date,
  hours = 12,
): BankCode[] {
  const due = new Set<BankCode>();
  for (const e of events) {
    if (e.kind !== "cpi") continue;
    const passed = now.getTime() - Date.parse(e.at);
    if (passed < 0 || passed > hours * 3_600_000) continue;
    const period = readings.find((r) => r.bankCode === e.bankCode)?.period;
    if (!period || period < cpiReferenceMonth(e.at)) due.add(e.bankCode);
  }
  return [...due];
}
