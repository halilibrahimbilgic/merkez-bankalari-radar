import { test } from "node:test";
import assert from "node:assert/strict";
import {
  divergencePeriods,
  fundingNow,
  periodSentence,
  periodsBetween,
  toSteps,
  type Step,
  type TcmbFunding,
} from "../src/lib/tcmb-funding";

// EVDS'den 15 Ekim 2026'da çekilen gerçek seriler (2 Ocak 2025 – 14 Ekim 2026),
// değişim noktalarına indirilmiş: TP.PY.P02.1H, TP.APIFON4, TP.PY.P01.ON, TP.PY.P02.ON.
const s = (rows: [string, number][]): Step[] => rows.map(([date, value]) => ({ date, value }));
const REAL: TcmbFunding = {
  fetchedAt: "2026-10-15T08:00:00.000Z",
  policy: s([["2025-01-02",47.5],["2025-01-23",45],["2025-03-06",42.5],["2025-04-17",46],["2025-07-24",43],["2025-09-11",40.5],["2025-10-23",39.5],["2025-12-11",38],["2026-01-22",37]]),
  aofm: s([["2025-01-02",48],["2025-01-08",47.5],["2025-01-24",45],["2025-03-07",42.5],["2025-03-24",45.94],["2025-03-25",45.95],["2025-03-26",45.97],["2025-03-27",42.5],["2025-03-28",46],["2025-04-18",47.97],["2025-04-21",48.18],["2025-04-22",48.06],["2025-04-24",48.11],["2025-04-25",48.55],["2025-04-28",48.77],["2025-04-29",48.78],["2025-05-02",48.82],["2025-05-05",48.83],["2025-05-06",48.79],["2025-05-07",48.74],["2025-05-08",48.79],["2025-05-09",48.81],["2025-05-12",48.77],["2025-05-13",48.62],["2025-05-15",48.35],["2025-05-16",47.79],["2025-05-20",47.34],["2025-05-21",46],["2025-05-23",48.69],["2025-05-26",48.94],["2025-05-27",48.97],["2025-05-29",48.98],["2025-06-10",48.55],["2025-06-11",47.99],["2025-06-12",46.11],["2025-06-13",46],["2025-07-25",43],["2025-09-12",41.15],["2025-09-15",40.5],["2025-10-24",39.5],["2025-12-12",38],["2026-01-23",37.3],["2026-01-26",37.01],["2026-01-28",37],["2026-03-03",39.35],["2026-03-04",39.98],["2026-03-05",39.99],["2026-03-06",40],["2026-08-24",37],["2026-09-10",37.09],["2026-09-11",37]]),
  lower: s([["2025-01-02",46],["2025-01-23",43.5],["2025-03-06",41],["2025-04-17",44.5],["2025-07-24",41.5],["2025-09-11",39],["2025-10-23",38],["2025-12-11",36.5],["2026-01-22",35.5]]),
  upper: s([["2025-01-02",49],["2025-01-23",46.5],["2025-03-06",44],["2025-03-20",46],["2025-04-17",49],["2025-07-24",46],["2025-09-11",43.5],["2025-10-23",42.5],["2025-12-11",41],["2026-01-22",40]]),
};

/** Seriyi verilen günde kesilmiş gibi gösterir: o günkü durumu sınamak için. */
const asOf = (f: TcmbFunding, day: string): TcmbFunding => ({
  ...f,
  policy: f.policy.filter((x) => x.date <= day),
  aofm: f.aofm.filter((x) => x.date <= day),
});

test("toSteps: sıralar, iki haneye yuvarlar, yalnızca değişimleri tutar", () => {
  assert.deepEqual(
    toSteps([
      { date: "2026-03-04", value: 39.98 },
      { date: "2026-03-03", value: 39.349999 },
      { date: "2026-03-05", value: 39.98 },
      { date: "2026-03-06", value: 40.0 },
    ]),
    [
      { date: "2026-03-03", value: 39.35 },
      { date: "2026-03-04", value: 39.98 },
      { date: "2026-03-06", value: 40 },
    ],
  );
});

test("Ayrışma dönemleri: 2025 ve 2026'daki iki dönem, karar günleri ayrışma sayılmaz", () => {
  // Dokuz kararın hepsinde AOFM yeni orana bir–üç iş gününde geçti; hiçbiri dönem değil.
  assert.deepEqual(divergencePeriods(REAL, "2026-10-15"), [
    // 27 Mart'taki bir günlük %42,50 ve 21–22 Mayıs'taki %46 dönemi bölmez;
    // 17 Nisan'daki ara artırımın ertesi günü de dönem sürer.
    { start: "2025-03-24", end: "2025-06-12", avgGap: 2.76 },
    { start: "2026-03-03", end: "2026-08-24", avgGap: 3 },
  ]);
});

test("Bugünkü durum: ayrışma yalnızca bir haftadır sürüyorsa gösterilir", () => {
  const now = fundingNow(REAL, "2026-10-15")!;
  assert.deepEqual(now, { policy: 37, aofm: 37, lower: 35.5, upper: 40, divergence: undefined });

  const july = fundingNow(asOf(REAL, "2026-07-01"), "2026-07-01")!;
  assert.equal(july.aofm, 40);
  assert.equal(july.divergence?.start, "2026-03-03");
  assert.equal(july.divergence?.end, undefined);

  // 3 Mart (Salı) başladı: Cuma günü henüz dört iş günü, ertesi Salı beş.
  assert.equal(fundingNow(asOf(REAL, "2026-03-06"), "2026-03-06")!.divergence, undefined);
  assert.equal(fundingNow(asOf(REAL, "2026-03-09"), "2026-03-09")!.divergence?.start, "2026-03-03");
});

test("Karar sayfası: önceki karardan bu karara kadar süren ya da biten dönemler", () => {
  const periods = divergencePeriods(REAL, "2026-10-15");
  const starts = (from: string | undefined, to: string) => periodsBetween(periods, from, to).map((p) => p.start);
  assert.deepEqual(starts("2026-01-22", "2026-03-12"), ["2026-03-03"]); // başladı
  assert.deepEqual(starts("2026-06-11", "2026-07-23"), ["2026-03-03"]); // sürüyor
  assert.deepEqual(starts("2026-07-23", "2026-09-10"), ["2026-03-03"]); // 24 Ağustos'ta bitti
  assert.deepEqual(starts("2026-09-10", "2026-10-22"), []);
  assert.deepEqual(starts("2025-12-11", "2026-01-22"), []);
});

test("Dönem cümlesi iki dilde", () => {
  const [, p2026] = divergencePeriods(REAL, "2026-10-15");
  assert.equal(
    periodSentence(p2026, "tr"),
    "03 Mart 2026 – 24 Ağustos 2026 arasında fiilî fonlama politika faizinin ortalama 3,0 puan üstündeydi.",
  );
  assert.equal(
    periodSentence(p2026, "en"),
    "From 03 March 2026 to 24 August 2026, the effective funding rate averaged 3.0 points above the policy rate.",
  );
  const july = fundingNow(asOf(REAL, "2026-07-01"), "2026-07-01")!;
  assert.equal(
    periodSentence(july.divergence!, "tr", july),
    "03 Mart 2026 tarihinden beri fiilî fonlama politika faizinin üstünde. Bugün %40,00, politika faizi %37,00.",
  );
});
