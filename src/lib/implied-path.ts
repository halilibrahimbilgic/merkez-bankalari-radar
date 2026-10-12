/**
 * OIS forward eğrisinden toplantı bazında piyasanın fiyatladığı faiz.
 *
 * Yöntem (yaygın "toplantı arası ortalama forward" yaklaşımı):
 *  - Her toplantıdan bir sonrakine kadarki pencerede forward eğrisinin
 *    ortalaması, o pencerede beklenen gecelik faizdir.
 *  - Bugünden ilk toplantıya kadarki pencere taban alınır; sonraki her
 *    pencerenin tabana farkı, o toplantıdan sonra beklenen faiz değişimidir.
 *    Böylece SONIA ile Bank Rate arasındaki küçük sabit makas (birkaç baz
 *    puan) kendiliğinden düşer — tahmin etmeye gerek kalmaz.
 *  - İhtimal, değişimin 25 baz puanlık adıma oranıdır: +6 bp ≈ %24 ihtimalle
 *    25 bp artırım. Bu, piyasanın yalnızca 0 ya da 25 bp adımları
 *    fiyatladığını varsayar; sonuç yaklaşıktır ve arayüzde böyle yazılır.
 *
 * Sınırlar: BoE eğrisi yumuşatılmış bir eğri (spline) olduğu için toplantı
 * günlerindeki basamakları keskin göstermez; vade primi de ayrıştırılmaz.
 * Uzak toplantılarda sapma büyür — bu yüzden ilk birkaç toplantı gösterilir.
 */

const DAY = 86_400_000;
const MONTH_DAYS = 365.25 / 12;

export interface Curve {
  /** YYYY-MM-DD */
  date: string;
  months: number[];
  forwards: number[];
}

export interface ImpliedMeeting {
  meetingId: string;
  meetingAt: string;
  /** Bu toplantıdan sonra beklenen politika faizi (%). */
  impliedRate: number;
  /** Bu toplantıda fiyatlanan değişim (baz puan). */
  changeBp: number;
}

/** Vade (ay) için forward; ilk vadenin altında doğrusal uzatma, son vadenin üstünde sabit. */
export function forwardAt(curve: Curve, month: number): number {
  const { months: m, forwards: f } = curve;
  if (month <= m[0]) {
    const slope = (f[1] - f[0]) / (m[1] - m[0]);
    return f[0] + slope * (month - m[0]);
  }
  for (let i = 1; i < m.length; i++) {
    if (month <= m[i]) {
      const w = (month - m[i - 1]) / (m[i] - m[i - 1]);
      return f[i - 1] + w * (f[i] - f[i - 1]);
    }
  }
  return f[f.length - 1];
}

/** [a, b] ay aralığında forward ortalaması (yoğun örnekleme ile). */
function averageForward(curve: Curve, a: number, b: number): number {
  const steps = 24;
  let sum = 0;
  for (let i = 0; i < steps; i++) sum += forwardAt(curve, a + ((i + 0.5) / steps) * (b - a));
  return sum / steps;
}

export function impliedPath(
  curve: Curve,
  meetings: { id: string; meetingAt: string }[],
  currentRate: number,
  maxMeetings = 6,
): ImpliedMeeting[] {
  const t0 = Date.parse(`${curve.date}T00:00:00Z`);
  const toMonths = (iso: string) => (Date.parse(iso) - t0) / DAY / MONTH_DAYS;

  const upcoming = meetings
    .filter((m) => Date.parse(m.meetingAt) > t0)
    .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt))
    .slice(0, maxMeetings);
  if (upcoming.length === 0) return [];

  const at = upcoming.map((m) => toMonths(m.meetingAt));
  const base = averageForward(curve, 0, at[0]);

  const out: ImpliedMeeting[] = [];
  let previous = base;
  for (let i = 0; i < upcoming.length; i++) {
    // Son toplantının penceresi: bir sonraki toplantı bilinmiyorsa ~6 hafta.
    const end = i + 1 < at.length ? at[i + 1] : at[i] + 1.5;
    const avg = averageForward(curve, at[i], end);
    out.push({
      meetingId: upcoming[i].id,
      meetingAt: upcoming[i].meetingAt,
      impliedRate: round2(currentRate + (avg - base)),
      changeBp: Math.round((avg - previous) * 100),
    });
    previous = avg;
  }
  return out;
}

/** Fiyatlanan değişimi 25 bp adım ihtimaline çevirir: +6 → artırım %24. */
export function moveOdds(changeBp: number): { direction: "hike" | "cut" | "hold"; pct: number } {
  if (Math.abs(changeBp) < 1) return { direction: "hold", pct: 100 };
  return {
    direction: changeBp > 0 ? "hike" : "cut",
    pct: Math.min(100, Math.round((Math.abs(changeBp) / 25) * 100)),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
