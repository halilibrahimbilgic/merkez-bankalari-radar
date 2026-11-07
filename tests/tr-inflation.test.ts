import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCpiHistory, parseSurveyRounds } from "../src/lib/sources/tr-inflation";
import { addMonths, monthlyExpectation, nextRelease, type TrSurveyRound } from "../src/lib/tr-inflation";

// Örnekler 7 Kasım 2026'da EVDS'den, kısaltılmış.

test("TÜFE geçmişi: aylık (formül 1) ve yıllık (formül 3) aynı ayda birleşir", () => {
  const mom = { items: [
    { Tarih: "2026-9", "TP_TUKFIY2025_GENEL-1": "1.84044527" },
    { Tarih: "2026-10", "TP_TUKFIY2025_GENEL-1": "2.57961087" },
    { Tarih: "2026-11", "TP_TUKFIY2025_GENEL-1": null },
  ] };
  const yoy = { items: [
    { Tarih: "2026-9", "TP_TUKFIY2025_GENEL-3": "29.73151089" },
    { Tarih: "2026-10", "TP_TUKFIY2025_GENEL-3": "29.76874918" },
  ] };
  assert.deepEqual(parseCpiHistory(mom, yoy), [
    { period: "2026-09", mom: 1.84, yoy: 29.73 },
    { period: "2026-10", mom: 2.58, yoy: 29.77 },
  ]);
  assert.throws(() => parseCpiHistory({ items: [] }, { items: [] }), /boş/);
});

test("anket turu: cari ay, 1 ve 2 ay sonrası aylık; yıl sonu ve 12 ay yıllık", () => {
  const json = { items: [
    { Tarih: "2026-10", TP_PKAUO_S01_A_U: "2.11", TP_PKAUO_S01_B_U: "1.18", TP_PKAUO_S01_C_U: "0.97", TP_PKAUO_S01_D_U: "29.63", TP_PKAUO_S01_E_U: "23.89" },
  ] };
  assert.deepEqual(parseSurveyRounds(json, new Map([["2026-10", "2026-10-16"]])), [
    { round: "2026-10", publishedOn: "2026-10-16", monthly: [2.11, 1.18, 0.97], yearEnd: 29.63, months12: 23.89 },
  ]);
});

test("ayın beklentisi: o ayın turu, yoksa önceki turların ileri ayı", () => {
  const survey: TrSurveyRound[] = [
    { round: "2026-09", monthly: [2.12, 1.97, 1.13] },
    { round: "2026-10", monthly: [2.11, 1.18, 0.97] },
  ];
  assert.deepEqual(monthlyExpectation(survey, "2026-10"), { value: 2.11, round: "2026-10" });
  // Kasım turu henüz yok: Ekim turunun "1 ay sonrası".
  assert.deepEqual(monthlyExpectation(survey, "2026-11"), { value: 1.18, round: "2026-10" });
  assert.deepEqual(monthlyExpectation(survey, "2026-12"), { value: 0.97, round: "2026-10" });
  assert.equal(monthlyExpectation(survey, "2027-01"), undefined);
  assert.equal(addMonths("2026-12", 1), "2027-01");
});

test("sıradaki açıklama: verisi gelmemiş ilk ay; saati geçtiyse bekleyen", () => {
  const data = {
    history: [{ period: "2026-10", mom: 2.58, yoy: 29.77 }],
    releases: [
      { at: "2026-12-03T07:00:00.000Z", period: "2026-11" },
      { at: "2027-01-05T07:00:00.000Z", period: "2026-12" },
    ],
  };
  assert.deepEqual(nextRelease(data, new Date("2026-11-07T12:00:00Z")), { ...data.releases[0], pending: false });
  assert.equal(nextRelease(data, new Date("2026-12-03T07:20:00Z"))?.pending, true);
});
