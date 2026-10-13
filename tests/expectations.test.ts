import { test } from "node:test";
import assert from "node:assert/strict";
import { impliedPath, moveOdds, type Curve } from "../src/lib/implied-path";
import { mapSurveyMeetings, parseTcmbSurvey } from "../src/lib/sources/tcmb-survey";

/** Aylık vadelerde sabit + basamak: ayın 1,5'inden sonra forward 25 bp yukarı. */
function stepCurve(base: number, stepAtMonth: number, step: number): Curve {
  const months = Array.from({ length: 24 }, (_, i) => i + 1);
  return {
    date: "2026-10-01",
    months,
    forwards: months.map((m) => (m >= stepAtMonth ? base + step : base)),
  };
}

test("düz eğri: değişim fiyatlanmaz", () => {
  const path = impliedPath(stepCurve(3.7, 99, 0), [{ id: "a", meetingAt: "2026-11-05T12:00:00Z" }], 3.75, 3.7);
  assert.equal(path[0].changeBp, 0);
  assert.equal(path[0].impliedRate, 3.75);
  assert.deepEqual(moveOdds(0), { direction: "hold", pct: 100 });
});

test("ikinci toplantıdan sonra 25 bp yukarı basamak", () => {
  const meetings = [
    { id: "m1", meetingAt: "2026-11-05T12:00:00Z" },
    { id: "m2", meetingAt: "2026-12-17T12:00:00Z" },
    { id: "m3", meetingAt: "2027-02-04T12:00:00Z" },
  ];
  // Basamak ~3. ayda: 17 Aralık sonrası penceresinin içinde.
  const path = impliedPath(stepCurve(3.7, 3, 0.25), meetings, 3.75, 3.7);
  const total = path.reduce((s, m) => s + m.changeBp, 0);
  assert.ok(Math.abs(total - 25) <= 2, `toplam ${total}`);
  // Aylık noktalar arası doğrusal okuma, basamağı komşu pencereye birkaç bp
  // sızdırır — gerçek eğri de yumuşak; arayüz bu yüzden "yaklaşık" der.
  assert.ok(path[0].changeBp <= 5, `ilk toplantı ${path[0].changeBp}`);
  assert.ok(path[1].changeBp >= 15, `ikinci toplantı ${path[1].changeBp}`);
  // SONIA–Bank Rate makası (3,70 vs 3,75) SONIA tabanıyla düşer: hedef ≈ %4,00.
  assert.ok(Math.abs(path[2].impliedRate - 4) <= 0.03, `son ${path[2].impliedRate}`);
});

test("ihtimal 25 bp adıma oran, %100 ile sınırlı", () => {
  assert.deepEqual(moveOdds(13), { direction: "hike", pct: 52 });
  assert.deepEqual(moveOdds(-6), { direction: "cut", pct: 24 });
  assert.deepEqual(moveOdds(40), { direction: "hike", pct: 100 });
});

test("TCMB anketi: en son dolu ay okunur", () => {
  const s = parseTcmbSurvey({
    items: [
      { Tarih: "2026-8", TP_PKAUO_S04_C_U: "37", TP_PKAUO_S04_F_U: "36.13", TP_PKAUO_S04_G_U: "35.25", TP_PKAUO_S04_H_U: "35.25" },
      { Tarih: "2026-9", TP_PKAUO_S04_C_U: "37", TP_PKAUO_S04_F_U: "36", TP_PKAUO_S04_G_U: "35.07", TP_PKAUO_S04_H_U: "35.07", TP_PKAUO_S04_D_U: "29.22" },
      { Tarih: "2026-10", TP_PKAUO_S04_C_U: null },
    ],
  });
  assert.equal(s.period, "2026-09");
  assert.deepEqual(s.meetings, [37, 36, 35.07]);
  assert.equal(s.months12, 29.22);
});

test("TCMB anketi: ilk toplantı anket ayının 1'inden sonraki ilk PPK", () => {
  const meetings = ["2026-07-23", "2026-09-10", "2026-10-22", "2026-12-10"].map((d) => ({
    id: d,
    meetingAt: `${d}T11:00:00Z`,
  }));
  const mapped = mapSurveyMeetings({ period: "2026-09", meetings: [37, 36, 35.07] }, meetings);
  assert.deepEqual(mapped.map((m) => m.meeting.id), ["2026-09-10", "2026-10-22", "2026-12-10"]);
  // Eylül anketinde 3. toplantı (Aralık) yıl sonu beklentisine eşitti — eşlemenin doğrulaması.
  assert.throws(() => mapSurveyMeetings({ period: "2026-11", meetings: [35, 34, 33] }, meetings));
});

test("eğri gününde açıklanan karar sıradaki toplantı sayılmaz", () => {
  const curve = { ...stepCurve(3.7, 99, 0), date: "2026-11-05" };
  const path = impliedPath(
    curve,
    [
      { id: "bugun", meetingAt: "2026-11-05T12:00:00Z" },
      { id: "sonraki", meetingAt: "2026-12-17T12:00:00Z" },
    ],
    3.75,
    3.7,
  );
  assert.deepEqual(path.map((m) => m.meetingId), ["sonraki"]);
});

test("toplantı arifesi: taban SONIA, eğrinin dışarı uzatılan kısa ucu değil", () => {
  // 29 Nisan 2026 eğrisinin kısa ucu (BoE OIS): 1–3 ay 3,746 / 3,892 / 4,041,
  // ertesi gün sabit tutuldu. Eski taban (eğrinin 0–ilk toplantı ortalaması,
  // 1 ayın altı eğimle uzatılmış) ~3,60 çıkıyor ve +12 bp "artırım" fiyatlanmış
  // görünüyordu; SONIA tabanıyla fark birkaç baz puan.
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const forwards = months.map((m) => (m <= 3 ? [3.746, 3.892, 4.041][m - 1] : 4.041 + (m - 3) * 0.1));
  const path = impliedPath(
    { date: "2026-04-29", months, forwards },
    [
      { id: "boe-2026-04-30", meetingAt: "2026-04-30T11:00:00Z" },
      { id: "boe-2026-06-18", meetingAt: "2026-06-18T11:00:00Z" },
    ],
    3.75,
    3.7298,
  );
  assert.ok(Math.abs(path[0].changeBp) <= 5, `arife ${path[0].changeBp}`);
});
