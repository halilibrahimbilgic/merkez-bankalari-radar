import { test } from "node:test";
import assert from "node:assert/strict";
import { mergePoints, preDecisionPoint, surprise } from "../src/lib/expectation-history";
import { parseStatementOutput } from "../src/lib/statements";

test("karardan önceki beklenti: karar günü tarihli nokta dışarıda kalır", () => {
  const points = [
    { date: "2026-09-15", rate: 3.9 },
    { date: "2026-09-16", rate: 3.95 },
    // Karar günü kapanışı — karar çoktan fiyatlarda.
    { date: "2026-09-17", rate: 3.75 },
  ];
  assert.equal(preDecisionPoint(points, "2026-09-17T11:00:00.000Z")?.date, "2026-09-16");
  assert.equal(preDecisionPoint(points, "2026-09-15T11:00:00.000Z"), undefined);
  assert.equal(preDecisionPoint(undefined, "2026-09-15T11:00:00.000Z"), undefined);
});

test("önceki karardan önce oluşmuş beklenti eskimiştir", () => {
  // Eylül turu (yanıtlar 8 Eylül) 16 Eylül kararından önce; 28 Ekim kararı için kullanılmaz.
  const points = [{ date: "2026-09-08", rate: 3.75 }];
  assert.equal(preDecisionPoint(points, "2026-10-28T18:00:00Z", "2026-09-16T18:00:00Z"), undefined);
  assert.equal(preDecisionPoint(points, "2026-09-16T18:00:00Z", "2026-07-29T18:00:00Z")?.date, "2026-09-08");
});

test("aynı günün noktası yenisiyle değişir, sıra korunur", () => {
  const merged = mergePoints(
    [
      { date: "2026-10-02", rate: 1 },
      { date: "2026-10-01", rate: 2 },
    ],
    [{ date: "2026-10-02", rate: 3 }],
  );
  assert.deepEqual(merged, [
    { date: "2026-10-01", rate: 2 },
    { date: "2026-10-02", rate: 3 },
  ]);
});

test("sürpriz etiketi: uyumlu / biraz / sürpriz eşikleri", () => {
  assert.deepEqual(surprise(37, 36.95), { bp: 5, label: "in-line" });
  // Anket ortalaması 36,62 iken sabit tutma: "biraz şahin", sürpriz değil.
  assert.deepEqual(surprise(37, 36.82), { bp: 18, label: "slightly-hawkish" });
  assert.deepEqual(surprise(37, 36.5), { bp: 50, label: "hawkish" });
  assert.deepEqual(surprise(3.75, 3.87), { bp: -12, label: "slightly-dovish" });
  assert.deepEqual(surprise(2.25, 2.5), { bp: -25, label: "dovish" });
  // Kayan nokta: 4 − 3,9 = 0,1000…009 → 10 bp, uyumlu değil.
  assert.equal(surprise(4, 3.9).bp, 10);
});

test("karar metni özeti: geçerli çıktı okunur, ton eşlenir", () => {
  const out = parseStatementOutput({
    headline_tr: "Faiz sabit; metin enflasyon risklerine daha çok vurgu yapıyor.",
    headline_en: "Rates on hold; the statement puts more weight on inflation risks.",
    changes_tr: ["Enerji fiyatları yukarı yönlü risk olarak eklendi."],
    changes_en: ["Energy prices were added as an upside risk."],
    tone: "more_hawkish",
    tone_reason_tr: "Yukarı yönlü risk vurgusu güçlendi.",
    tone_reason_en: "The emphasis on upside risks grew.",
  });
  assert.equal(out.tone, "more-hawkish");
  assert.equal(out.changesTr.length, 1);
});

test("karar metni özeti: madde sayısı iki dilde farklıysa reddedilir", () => {
  assert.throws(
    () =>
      parseStatementOutput({
        headline_tr: "a",
        headline_en: "b",
        changes_tr: ["x", "y"],
        changes_en: ["x"],
        tone: "mixed",
        tone_reason_tr: "c",
        tone_reason_en: "d",
      }),
    /madde sayısı/,
  );
  assert.throws(() => parseStatementOutput({ tone: "hawkish" }), /tone geçersiz/);
});

test("reel faiz: Fed orta nokta, yüksek enflasyonda Fisher farkı", async () => {
  const { realRate } = await import("../src/lib/real-rates");
  const base = { sourceUrl: "", period: "2026-09" };
  const fed = realRate({ bankCode: "fed", rate: 4, rateLower: 3.75 }, { ...base, bankCode: "fed", yoy: 3.4 });
  assert.equal(fed.policy, 3.875);
  assert.equal(fed.real, 0.48);
  const tcmb = realRate({ bankCode: "tcmb", rate: 37 }, { ...base, bankCode: "tcmb", yoy: 29.73 });
  assert.equal(tcmb.real, 7.27);
  // 1,37 / 1,2973 − 1 = %5,60 — basit fark gerçek getiriyi 1,7 puan abartıyor.
  assert.equal(tcmb.fisher, 5.6);
});

test("ileriye dönük reel faiz: basit fark ve Fisher", async () => {
  const { forwardRealRate } = await import("../src/lib/real-rates");
  // %37 politika faizi, anketin 12 ay sonrası TÜFE beklentisi %23,70 (Eylül 2026).
  assert.deepEqual(forwardRealRate(37, 23.7), { real: 13.3, fisher: 10.75 });
});
