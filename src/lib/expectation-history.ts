import type { BankCode } from "./types";

/**
 * Beklentilerin zaman içindeki seyri ve karar sonrası "sürpriz" hesabı.
 *
 * data/history/expectations.json — scripts/fetch-expectations.ts her koşuda
 * birleştirir, scripts/backfill-expectations.ts bir kez geçmişi doldurur.
 * Anahtar, beklentinin OLUŞTUĞU gündür, çekildiği an değil: günlük iş
 * saatlerce gecikebiliyor ve karardan önce oluşmuş bir beklentiyi karardan
 * sonra çekmek onu "karar sonrası" yapmaz.
 *   BoE OIS      eğri günü (gün sonu piyasa verisi)
 *   ECB SMA      turun ilk toplantısından bir gün önce (yanıtlar o toplantıdan
 *                önce toplanır, sonuçlar ertesi gün yayımlanır)
 *   NY Fed SME   yanıtların son günü (survey_due_date)
 *   TCMB PKA     yayım günü (toplama aralığı EVDS'de yok; yayım günü güvenli
 *                üst sınır)
 */

export type HistorySource = "boe-ois" | "ecb-sma" | "tcmb-pka" | "nyfed-sme";

export interface ExpectationPoint {
  /** Beklentinin oluştuğu gün, YYYY-MM-DD (yukarıdaki tablo). */
  date: string;
  /** Anketlerde sonuçların yayım günü — gösterim için. */
  publishedOn?: string;
  /** Anket turu, "2026-09". */
  round?: string;
  /** Toplantı sonrası beklenen politika faizi (%). Fed'de hedef aralığın üst sınırı. */
  rate: number;
  /** Anket dağılımı veren kaynaklarda 25. ve 75. yüzdelik. */
  p25?: number;
  p75?: number;
  /** Kaynağın verdiği yön olasılıkları (%). */
  odds?: { cut: number; hold: number; hike: number };
  /** Karar sonrası faizin olasılık dağılımı: bant üst sınırı (%) → olasılık (%). NY Fed SME. */
  dist?: { upper: number | null; pct: number }[];
}

export interface BankExpectationHistory {
  source: HistorySource;
  kind: "market" | "survey";
  sourceUrl: string;
  /** Toplantı kimliği → tarih sırasında beklentiler. */
  meetings: Record<string, ExpectationPoint[]>;
}

/** Atlanta Fed MPT penceresinin bir gündeki özeti. */
export interface FedWindowPoint {
  date: string;
  probCutPct?: number;
  probHikePct?: number;
  meanBps?: number;
}

export interface ExpectationHistory {
  fetchedAt: string;
  banks: Partial<Record<BankCode, BankExpectationHistory>>;
  /** Pencere başlangıcı (YYYY-MM-DD) → günlük noktalar. */
  fedWindows?: Record<string, FedWindowPoint[]>;
}

/** Aynı günün noktası yenisiyle değişir; sonuç tarih sırasında. */
export function mergePoints<P extends { date: string }>(existing: P[] = [], incoming: P[]): P[] {
  const byDate = new Map(existing.map((p) => [p.date, p]));
  for (const p of incoming) byDate.set(p.date, p);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Kararla karşılaştırılacak beklenti: bir önceki karardan SONRA, bu karardan
 * ÖNCE oluşmuş son nokta. Gün düzeyinde: karar günü tarihli bir eğri gün sonu
 * verisidir, kararı çoktan içerir. Önceki karardan önce oluşmuş beklenti
 * eskimiştir — Fed'in Eylül 2026'da beklenmedik artırımından önce toplanan bir
 * anketi Ekim kararıyla kıyaslamak, Eylül'ün sürprizini Ekim'e yazardı.
 */
export function preDecisionPoint(
  points: ExpectationPoint[] | undefined,
  meetingAt: string,
  previousMeetingAt?: string,
): ExpectationPoint | undefined {
  const day = meetingAt.slice(0, 10);
  const after = previousMeetingAt?.slice(0, 10) ?? "";
  return points?.filter((p) => p.date < day && p.date >= after).at(-1);
}

export type SurpriseLabel = "in-line" | "slightly-hawkish" | "slightly-dovish" | "hawkish" | "dovish";

/** Bu farkın altı "beklentiyle uyumlu" (bp). Çeyrek puanlık adımın %40'ı. */
export const IN_LINE_BP = 10;
/** Bu fark ve üstü "sürpriz" — bir standart adım (25 bp). */
export const SURPRISE_BP = 25;

/**
 * Kararın beklentiden farkı (bp): pozitif = beklenenden sıkı (şahin).
 * Ölçek bilinçli olarak kaba: anket ortalaması %36,62 iken çoğunluğun
 * beklediği sabit tutma "38 bp şahin sürpriz" diye sunulmasın diye 10–25
 * arası "biraz" diye ayrı etiketlenir.
 */
export function surprise(actual: number, expected: number): { bp: number; label: SurpriseLabel } {
  const bp = Math.round((actual - expected) * 100);
  const abs = Math.abs(bp);
  if (abs < IN_LINE_BP) return { bp, label: "in-line" };
  if (abs < SURPRISE_BP) return { bp, label: bp > 0 ? "slightly-hawkish" : "slightly-dovish" };
  return { bp, label: bp > 0 ? "hawkish" : "dovish" };
}
