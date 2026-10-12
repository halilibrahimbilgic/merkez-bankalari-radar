import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScoreOutput } from "../src/lib/score";
import { parseNewsOutput } from "../src/lib/news";

const SCORE = {
  summary_tr: "Konuşmacı enflasyonun hedefin üzerinde kaldığını ve ek sıkılaşmanın gerekebileceğini söyledi.",
  hawk_dove_score: 14,
  score_rationale_tr: "Ek sıkılaşma ima ediliyor.",
  has_policy_signal: true,
  summary_en: "The speaker said inflation remains above target and further tightening may be needed.",
  score_rationale_en: "Further tightening is implied.",
  title_tr: "Ekonomik görünüm",
  context_tr: "",
};

test("skor -10..+10 aralığına sıkıştırılır", () => {
  assert.equal(parseScoreOutput(SCORE).hawkDoveScore, 10);
});

test("sinyalsiz konuşmanın skoru 0'dır (model ne derse desin)", () => {
  assert.equal(parseScoreOutput({ ...SCORE, has_policy_signal: false, hawk_dove_score: 5 }).hawkDoveScore, 0);
});

test("eksik ikinci dil alanı reddedilir", () => {
  const { summary_en: _drop, ...noEn } = SCORE;
  void _drop;
  assert.throws(() => parseScoreOutput(noEn));
  assert.throws(() => parseScoreOutput({ ...SCORE, title_tr: "  " }));
});

test("haber çıktısı: ilgisiz öğe önemli olamaz, başlıksız ilgili öğe düşer, uzun metin kırpılır", () => {
  const out = parseNewsOutput([
    { id: "a", relevant: false, important: true, title_tr: "", summary_tr: "", title_en: "", summary_en: "" },
    { id: "b", relevant: true, important: true, title_tr: "", summary_tr: "x", title_en: "y", summary_en: "z" },
    { id: "c", relevant: true, important: false, title_tr: "Başlık", summary_tr: "ö".repeat(2000), title_en: "Title", summary_en: "s" },
    { relevant: true },
  ]);
  assert.deepEqual(out.map((o) => [o.id, o.relevant, o.important]), [
    ["a", false, false],
    ["b", false, false],
    ["c", true, false],
  ]);
  assert.equal(out[2].summaryTr.length, 600);
});

test("haber çıktısı dizi değilse hata", () => {
  assert.throws(() => parseNewsOutput({ items: [] }));
});
