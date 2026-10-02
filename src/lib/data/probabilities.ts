import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPool } from "../db";
import type { ProbabilitySnapshot, ProbabilityWindow } from "../sources/mpt";

const SEED_PATH = path.join(process.cwd(), "data", "seed", "probabilities.json");

export interface StoredSnapshot extends ProbabilitySnapshot {
  fetchedAt: string;
}

/** Bkz. speeches.ts — yalnızca seed yolu önbelleğe alınır. */
let seedCache: StoredSnapshot | null | undefined;

export async function getProbabilitySnapshot(): Promise<StoredSnapshot | null> {
  const pool = getPool();
  if (pool) return loadFromDb(pool);

  if (seedCache !== undefined) return seedCache;
  try {
    seedCache = JSON.parse(await readFile(SEED_PATH, "utf8")) as StoredSnapshot;
  } catch {
    seedCache = null;
  }
  return seedCache;
}

/**
 * En güncel gözlem gününün anlığı.
 *
 * Seed dosyası tek anlık tutar; veritabanı geçmişi biriktirir (şema bunu
 * kasıtlı olarak destekler), bu yüzden burada en yeni as_of seçilir.
 */
async function loadFromDb(
  pool: NonNullable<ReturnType<typeof getPool>>,
): Promise<StoredSnapshot | null> {
  const { rows: snaps } = await pool.query<{
    as_of: Date;
    target_lower_bps: number | null;
    target_upper_bps: number | null;
    fetched_at: Date;
  }>(
    `select as_of, target_lower_bps, target_upper_bps, fetched_at
       from probability_snapshots
      order by as_of desc
      limit 1`,
  );
  const snap = snaps[0];
  if (!snap) return null;

  const { rows: windows } = await pool.query<{
    start_date: Date;
    prob_cut_pct: string | null;
    prob_hike_pct: string | null;
    mean_bps: string | null;
    mode_bps: string | null;
    p25_bps: string | null;
    p75_bps: string | null;
  }>(
    `select start_date, prob_cut_pct, prob_hike_pct,
            mean_bps, mode_bps, p25_bps, p75_bps
       from probability_windows
      where as_of = $1
      order by start_date asc`,
    [snap.as_of],
  );

  const { rows: buckets } = await pool.query<{
    start_date: Date;
    lower_bps: number;
    upper_bps: number;
    probability_pct: string;
  }>(
    `select start_date, lower_bps, upper_bps, probability_pct
       from probability_buckets
      where as_of = $1
      order by start_date asc, lower_bps asc`,
    [snap.as_of],
  );

  const bucketsByWindow = new Map<string, ProbabilityWindow["buckets"]>();
  for (const b of buckets) {
    const key = day(b.start_date);
    const list = bucketsByWindow.get(key) ?? [];
    list.push({
      lowerBps: b.lower_bps,
      upperBps: b.upper_bps,
      probabilityPct: Number(b.probability_pct),
    });
    bucketsByWindow.set(key, list);
  }

  return {
    asOf: day(snap.as_of),
    fetchedAt: snap.fetched_at.toISOString(),
    targetRange:
      snap.target_lower_bps === null || snap.target_upper_bps === null
        ? undefined
        : { lowerBps: snap.target_lower_bps, upperBps: snap.target_upper_bps },
    windows: windows.map((w) => ({
      startDate: day(w.start_date),
      probCutPct: num(w.prob_cut_pct),
      probHikePct: num(w.prob_hike_pct),
      meanBps: num(w.mean_bps),
      modeBps: num(w.mode_bps),
      p25Bps: num(w.p25_bps),
      p75Bps: num(w.p75_bps),
      buckets: bucketsByWindow.get(day(w.start_date)) ?? [],
    })),
  };
}

function day(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function num(value: string | null): number | undefined {
  return value === null ? undefined : Number(value);
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
