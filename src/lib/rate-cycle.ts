import type { BankCode, Meeting } from "./types";

/**
 * Küresel faiz döngüsü: bir dönem başından (`from`, YYYY-AA-GG) bu yana her
 * bankanın faizindeki değişim. Seviye yerine değişim (baz puan) — TCMB'nin %37'si diğer
 * bankaları aynı grafikte düz çizgiye çevirirdi. Fed'de hedef aralığın üst
 * sınırı; aralık hep 25 bp genişliğinde olduğu için değişim aynıdır.
 */

export interface CycleRow {
  bankCode: BankCode;
  /** Dönem başındaki ve bugünkü oran (%). */
  start?: number;
  current?: number;
  /** Dönem başından bu yana toplam değişim (bp). */
  totalBp?: number;
  hikes: number;
  cuts: number;
  lastChange?: { meetingId: string; at: string; bp: number };
}

function decided(meetings: Meeting[], bank: BankCode, now: Date): Meeting[] {
  return meetings
    .filter(
      (m) =>
        m.bankCode === bank &&
        m.status !== "cancelled" &&
        m.decisionRate !== undefined &&
        new Date(m.meetingAt) <= now,
    )
    .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt));
}

function bpOf(m: Meeting): number {
  return m.previousRate === undefined ? 0 : Math.round((m.decisionRate! - m.previousRate) * 100);
}

export function rateCycle(meetings: Meeting[], banks: BankCode[], from: string, now: Date): CycleRow[] {
  return banks.map((bank) => {
    const all = decided(meetings, bank, now);
    const before = all.filter((m) => m.meetingAt < from);
    const inPeriod = all.filter((m) => m.meetingAt >= from);
    // Başlangıç oranı: dönem öncesinin son kararı, yoksa dönemin ilk kararının "önceki oranı".
    const start = before.at(-1)?.decisionRate ?? inPeriod[0]?.previousRate;
    const current = all.at(-1)?.decisionRate;
    const changes = inPeriod.filter((m) => bpOf(m) !== 0);
    const last = all.filter((m) => bpOf(m) !== 0).at(-1);
    return {
      bankCode: bank,
      start,
      current,
      totalBp: start !== undefined && current !== undefined ? Math.round((current - start) * 100) : undefined,
      hikes: changes.filter((m) => bpOf(m) > 0).length,
      cuts: changes.filter((m) => bpOf(m) < 0).length,
      lastChange: last && { meetingId: last.id, at: last.meetingAt, bp: bpOf(last) },
    };
  });
}

/**
 * Grafik için birikimli değişim serisi: dönem başı, her karar günü ve bugün;
 * her bankanın değeri o ana kadarki toplam değişim (bp).
 */
export function cycleSeries(
  meetings: Meeting[],
  banks: BankCode[],
  from: string,
  now: Date,
): ({ t: number } & Partial<Record<BankCode, number>>)[] {
  const changes = banks.flatMap((bank) =>
    decided(meetings, bank, now)
      .filter((m) => m.meetingAt >= from && bpOf(m) !== 0)
      .map((m) => ({ bank, t: Date.parse(m.meetingAt), bp: bpOf(m) })),
  );
  const times = [...new Set([Date.parse(from), ...changes.map((c) => c.t), now.getTime()])].sort((a, b) => a - b);
  return times.map((t) => {
    const row: { t: number } & Partial<Record<BankCode, number>> = { t };
    for (const bank of banks) {
      row[bank] = changes.filter((c) => c.bank === bank && c.t <= t).reduce((s, c) => s + c.bp, 0);
    }
    return row;
  });
}
