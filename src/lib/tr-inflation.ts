/**
 * Türkiye enflasyonu sayfasının verisi (data/seed/tr-inflation.json) ve saf
 * hesapları. Her ayın 3'ünde "enflasyon ne zaman açıklanacak, kaç oldu"
 * aramaları — faiz kararıyla aynı "ne zaman, saat kaçta" kalıbı; cevap
 * zaten elimizdeki veride: TÜİK'in takvimi, EVDS'deki TÜFE ve TCMB'nin
 * Piyasa Katılımcıları Anketi.
 */

export interface TrCpiMonth {
  /** "2026-10" */
  period: string;
  /** Aylık değişim (%). */
  mom: number;
  /** Yıllık değişim (%). */
  yoy: number;
}

/** Anketin bir turu (ay): TÜFE beklentileri. */
export interface TrSurveyRound {
  /** Anketin ayı, "2026-10". */
  round: string;
  /** Yayım günü (TCMB veri takvimi), biliniyorsa. */
  publishedOn?: string;
  /** Cari ayın, sonraki ayın ve ondan sonrakinin aylık TÜFE beklentisi (%). */
  monthly: [number?, number?, number?];
  yearEnd?: number;
  months12?: number;
}

export interface TrInflation {
  fetchedAt: string;
  history: TrCpiMonth[];
  /** TÜİK'in açıklayacağı TÜFE bültenleri (UTC), eskiden yeniye. */
  releases: { at: string; period: string }[];
  survey: TrSurveyRound[];
}

/** "2026-10" + n ay */
export function addMonths(period: string, n: number): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/**
 * Bir ayın aylık TÜFE beklentisi: o ayın anketindeki "cari ay" beklentisi;
 * o tur yoksa bir önceki turun "sonraki ay"ı, o da yoksa iki önceki turun.
 * Anket ayın ortasında yayımlanır, TÜFE ertesi ayın 3'ünde: cari ay
 * beklentisi her zaman açıklamadan önce oluşmuştur.
 */
export function monthlyExpectation(
  survey: TrSurveyRound[],
  period: string,
): { value: number; round: string } | undefined {
  for (let k = 0; k <= 2; k++) {
    const round = survey.find((r) => r.round === addMonths(period, -k));
    const value = round?.monthly[k];
    if (round && value !== undefined) return { value, round: round.round };
  }
  return undefined;
}

/** Sıradaki açıklama; saati geçmiş ama verisi gelmemiş olan da "sıradaki" sayılır (bekleyen). */
export function nextRelease(
  data: Pick<TrInflation, "releases" | "history">,
  now: Date,
): { at: string; period: string; pending: boolean } | undefined {
  const latest = data.history.at(-1)?.period ?? "";
  const r = data.releases.find((x) => x.period > latest);
  if (!r) return undefined;
  return { ...r, pending: Date.parse(r.at) <= now.getTime() };
}
