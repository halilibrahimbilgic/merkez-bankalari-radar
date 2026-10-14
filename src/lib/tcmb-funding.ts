import { fmtNum, fmtPercent, type Lang } from "./i18n";
import { formatDate } from "./time";

/**
 * TCMB'nin fiilî fonlama maliyeti ve faiz koridoru.
 *
 * Politika faizi (1 hafta vadeli repo) bankaların her zaman ödediği faiz
 * değildir. TCMB repo ihalesine ara verip bankaları koridorun üst bandından
 * (gecelik borç verme) fonladığında ağırlıklı ortalama fonlama maliyeti
 * (AOFM) politika faizinden ayrışır: 3 Mart–24 Ağustos 2026 arasında
 * politika faizi %37 iken AOFM %40'tı ve site o altı ay yalnızca %37
 * gösterdi. 24 Mart–12 Haziran 2025'te de fark 2–3 puandı.
 */

/** Değişim noktası: değer bu günden bir sonraki noktaya kadar geçerli. */
export interface Step {
  date: string;
  value: number;
}

export interface TcmbFunding {
  fetchedAt: string;
  /** Bir hafta vadeli repo ihale faizi (politika faizi). */
  policy: Step[];
  /** Ağırlıklı ortalama fonlama maliyeti. */
  aofm: Step[];
  /** Koridorun alt bandı: gecelik borç alma faizi. */
  lower: Step[];
  /** Koridorun üst bandı: gecelik borç verme faizi. */
  upper: Step[];
}

/** Bu farkın altı ayrışma sayılmaz: AOFM karar sonrası günlerde kuruşla oynar (%37,01). */
export const DIVERGENCE_PP = 0.25;

/**
 * En az bir hafta (beş iş günü) süren fark ayrışmadır; daha kısa kesintiler
 * de dönemi bölmez. Karardan sonra AOFM yeni orana bir–iki iş gününde oturur
 * (23 Ocak 2026'da %37,30, 26 Ocak'ta %37,01), yıl başında üç gün yarım
 * puan oynadı (2–7 Ocak 2025) — bunlar ayrışma değil.
 */
export const MIN_WEEKDAYS = 5;

const DAY = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const isWeekday = (ms: number) => {
  const w = new Date(ms).getUTCDay();
  return w !== 0 && w !== 6;
};

/** Önceki iş günü. Resmî tatiller bilinmez; tatilde gözlem de yoktur. */
function previousWeekday(d: string): string {
  let ms = toMs(d) - DAY;
  while (!isWeekday(ms)) ms -= DAY;
  return toDay(ms);
}

/** [from, to) aralığındaki iş günü sayısı. */
function weekdaysBetween(from: string, to: string): number {
  let n = 0;
  for (let ms = toMs(from); ms < toMs(to); ms += DAY) if (isWeekday(ms)) n++;
  return n;
}

/** Günlük gözlemleri değişim noktalarına indirir: dosya yalnızca değer değişince değişir. */
export function toSteps(obs: { date: string; value: number }[]): Step[] {
  const out: Step[] = [];
  for (const o of [...obs].sort((a, b) => a.date.localeCompare(b.date))) {
    const value = Math.round(o.value * 100) / 100;
    if (out.at(-1)?.value !== value) out.push({ date: o.date, value });
  }
  return out;
}

/** Basamak serisinin o günkü değeri; seri daha başlamadıysa undefined. */
export function valueAt(steps: Step[], date: string): number | undefined {
  let v: number | undefined;
  for (const s of steps) {
    if (s.date > date) break;
    v = s.value;
  }
  return v;
}

/**
 * AOFM − politika faizi. Politika faizi bir önceki iş gününden alınır: seri
 * yeni oranı karar günü gösterir, AOFM ise o günün fonlamasını eski oranla
 * yansıtır ve ertesi iş günü yeni orana geçer (2025–2026'daki dokuz kararın
 * hepsinde). Sınır: karardan hemen sonra haftalık bir bayram tatili gelirse
 * gözlem olmadığı için AOFM eski değerinde "durur" ve ayrışma gibi görünür.
 */
function gapAt(f: TcmbFunding, date: string): number | undefined {
  const aofm = valueAt(f.aofm, date);
  const policy = valueAt(f.policy, previousWeekday(date));
  return aofm === undefined || policy === undefined ? undefined : aofm - policy;
}

export interface DivergencePeriod {
  start: string;
  /** AOFM'nin politika faizine döndüğü gün; süren dönemde yok. */
  end?: string;
  /** Dönem boyunca AOFM'nin politika faizinden ortalama farkı (puan, takvim günü ağırlıklı). */
  avgGap: number;
}

/** AOFM'nin politika faizinden en az MIN_WEEKDAYS iş günü ayrıştığı dönemler; `today` dahil. */
export function divergencePeriods(f: TcmbFunding, today: string): DivergencePeriod[] {
  const first = [f.policy[0]?.date, f.aofm[0]?.date].sort().at(-1);
  if (!first || !f.policy.length || !f.aofm.length) return [];

  // Ham ayrışma koşuları: [start, end) — end, farkın kapandığı ilk gün.
  const runs: { start: string; end?: string }[] = [];
  for (let ms = toMs(first); ms <= toMs(today); ms += DAY) {
    const date = toDay(ms);
    const gap = gapAt(f, date);
    const diverged = gap !== undefined && Math.abs(gap) >= DIVERGENCE_PP;
    const open = runs.at(-1);
    if (diverged && (!open || open.end)) runs.push({ start: date });
    else if (!diverged && open && !open.end) open.end = date;
  }

  // Kısa kesintiler (27 Mart 2025'te bir gün %42,50) dönemi bölmez.
  const merged: { start: string; end?: string }[] = [];
  for (const r of runs) {
    const prev = merged.at(-1);
    if (prev?.end && weekdaysBetween(prev.end, r.start) < MIN_WEEKDAYS) prev.end = r.end;
    else merged.push({ ...r });
  }

  const tomorrow = toDay(toMs(today) + DAY);
  return merged
    .filter((r) => weekdaysBetween(r.start, r.end ?? tomorrow) >= MIN_WEEKDAYS)
    .map((r) => {
      let sum = 0;
      let n = 0;
      for (let ms = toMs(r.start); ms < toMs(r.end ?? tomorrow); ms += DAY) {
        const gap = gapAt(f, toDay(ms));
        if (gap !== undefined) {
          sum += gap;
          n++;
        }
      }
      return { ...r, avgGap: Math.round((sum / n) * 100) / 100 };
    });
}

export interface FundingNow {
  policy: number;
  aofm: number;
  lower?: number;
  upper?: number;
  /** Süren ayrışma — yalnızca en az MIN_WEEKDAYS iş günüdür sürüyorsa. */
  divergence?: DivergencePeriod;
}

export function fundingNow(f: TcmbFunding, today: string): FundingNow | undefined {
  const policy = f.policy.at(-1)?.value;
  const aofm = f.aofm.at(-1)?.value;
  if (policy === undefined || aofm === undefined) return undefined;
  const last = divergencePeriods(f, today).at(-1);
  return {
    policy,
    aofm,
    lower: f.lower.at(-1)?.value,
    upper: f.upper.at(-1)?.value,
    divergence: last && !last.end ? last : undefined,
  };
}

/** Bir karar sayfasını ilgilendiren dönemler: önceki karardan bu karara kadar süren ya da başlayan/biten. */
export function periodsBetween(periods: DivergencePeriod[], from: string | undefined, to: string): DivergencePeriod[] {
  return periods.filter((p) => p.start <= to && (p.end === undefined || p.end > (from ?? to)));
}

/** Kapanmış ya da süren dönemi tek cümleyle anlatır. */
export function periodSentence(p: DivergencePeriod, lang: Lang, now?: FundingNow): string {
  const gap = fmtNum(Math.abs(p.avgGap), lang, 1);
  const above = p.avgGap > 0;
  if (p.end) {
    return lang === "en"
      ? `From ${formatDate(p.start, lang)} to ${formatDate(p.end, lang)}, the effective funding rate averaged ${gap} points ${above ? "above" : "below"} the policy rate.`
      : `${formatDate(p.start, lang)} – ${formatDate(p.end, lang)} arasında fiilî fonlama politika faizinin ortalama ${gap} puan ${above ? "üstündeydi" : "altındaydı"}.`;
  }
  const today =
    now &&
    (lang === "en"
      ? ` Today ${fmtPercent(now.aofm, lang)} against a policy rate of ${fmtPercent(now.policy, lang)}.`
      : ` Bugün ${fmtPercent(now.aofm, lang)}, politika faizi ${fmtPercent(now.policy, lang)}.`);
  return lang === "en"
    ? `Since ${formatDate(p.start, lang)}, the effective funding rate has been ${above ? "above" : "below"} the policy rate.${today ?? ""}`
    : `${formatDate(p.start, lang)} tarihinden beri fiilî fonlama politika faizinin ${above ? "üstünde" : "altında"}.${today ?? ""}`;
}
