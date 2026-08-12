import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ProbabilitySnapshot, ProbabilityWindow } from "../sources/mpt";

const SEED_PATH = path.join(process.cwd(), "data", "seed", "probabilities.json");

export interface StoredSnapshot extends ProbabilitySnapshot {
  fetchedAt: string;
}

let cache: StoredSnapshot | null | undefined;

export async function getProbabilitySnapshot(): Promise<StoredSnapshot | null> {
  if (cache !== undefined) return cache;
  try {
    cache = JSON.parse(await readFile(SEED_PATH, "utf8")) as StoredSnapshot;
  } catch {
    cache = null;
  }
  return cache;
}

/** Baz puanı yüzde metnine çevirir: 375 → "%3,75" */
export function bpsToPercentTr(bps: number): string {
  return `%${(bps / 100).toFixed(2).replace(".", ",")}`;
}

export function formatPct(value: number): string {
  return `%${value.toFixed(1).replace(".", ",")}`;
}

/** Bant metni — yüzde işareti yalnızca başta: "%3,50–3,75" */
export function bpsRangeTr(lowerBps: number, upperBps: number): string {
  return `${bpsToPercentTr(lowerBps)}–${bpsToPercentTr(upperBps).slice(1)}`;
}

/** En yüksek olasılıklı bant. */
export function modalBucket(w: ProbabilityWindow) {
  return w.buckets.reduce(
    (best, b) => (b.probabilityPct > best.probabilityPct ? b : best),
    w.buckets[0],
  );
}

/**
 * Pencereyi tek paragrafta Türkçe anlatır.
 *
 * Kasıtlı olarak "toplantıda şu kadar indirim ihtimali" demiyoruz — veri
 * toplantı bazlı değil, üç aylık ortalama faiz üzerinedir.
 */
export function describeWindowTr(
  w: ProbabilityWindow,
  targetRange: ProbabilitySnapshot["targetRange"],
): string {
  const parts: string[] = [];
  const modal = modalBucket(w);

  if (targetRange) {
    parts.push(
      `Bugünkü hedef aralık ${bpsRangeTr(targetRange.lowerBps, targetRange.upperBps)}.`,
    );
  }

  if (w.probHikePct !== undefined && w.probCutPct !== undefined) {
    const hold = Math.max(0, 100 - w.probHikePct - w.probCutPct);
    parts.push(
      `Piyasa bu dönemde ortalama faizin bu aralığın üzerine çıkmasına ` +
        `${formatPct(w.probHikePct)}, altına inmesine ${formatPct(w.probCutPct)}, ` +
        `aralık içinde kalmasına ${formatPct(hold)} ihtimal veriyor.`,
    );
  }

  if (modal) {
    parts.push(
      `En olası bant ${bpsRangeTr(modal.lowerBps, modal.upperBps)} ` +
        `(${formatPct(modal.probabilityPct)}).`,
    );
  }

  return parts.join(" ");
}

/** Üç aylık referans penceresinin bitişi. */
export function windowEndDate(startDate: string): string {
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 3);
  return d.toISOString().slice(0, 10);
}
