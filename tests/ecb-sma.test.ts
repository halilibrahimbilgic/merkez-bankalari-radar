import { test } from "node:test";
import assert from "node:assert/strict";
import { latestSmaResultsUrl, parseSmaText, summarizeChange } from "../src/lib/sources/ecb-sma";

// Eylül 2026 sonuç PDF'inin metninden kısaltılmış (unpdf çıktısı).
const TEXT = `Expectations for the DFR
(percentages per annum)
25th percentile Median 75th percentile Number of responses
Sep-2026 2.50 2.50 2.50 69
Oct-2026 2.50 2.50 2.50 69
Jun-2027 2.25 2.50 2.50 69
2027Q3 2.25 2.50 2.50 69
long run 2.00 2.00 2.25 67
Note: Cross-sectional distribution.
Expectations for the MRO
Mar-2030 9.99 9.99 9.99 1
Expected size of the first DFR change
(percentages)
<-75bps -75bps -50bps -25bps -10bps 0bps 10bps 25bps 50bps 75bps >75bps
Average probability 0.0 0.0 0.0 0.1 0.0 14.7 0.0 84.8 0.3 0.0 0.0
Expected size of the second DFR change
(percentages)
<-75bps -75bps -50bps -25bps -10bps 0bps 10bps 25bps 50bps 75bps >75bps
Average probability 0.0 0.0 0.0 0.3 0.0 81.3 0.0 18.2 0.2 0.0 0.0`;

test("DFR tablosu: yalnızca aylık satırlar, başka tabloya taşmaz", () => {
  const r = parseSmaText(TEXT);
  assert.deepEqual(r.path.map((p) => p.month), ["2026-09", "2026-10", "2027-06"]);
  assert.deepEqual(r.path[2], { month: "2027-06", p25: 2.25, median: 2.5, p75: 2.5 });
});

test("olasılık dağılımı yön özetine çevrilir", () => {
  const r = parseSmaText(TEXT);
  assert.deepEqual(summarizeChange(r.firstChange!), { cut: 0.1, hold: 14.7, hike: 85.1 });
  assert.deepEqual(summarizeChange(r.secondChange!), { cut: 0.3, hold: 81.3, hike: 18.4 });
});

test("tablo yoksa sessizce boş dönmez, hata verir", () => {
  assert.throws(() => parseSmaText("Expectations for the MRO\nSep-2026 2.65 2.65 2.65 69"));
});

test("en yeni sonuç PDF'i seçilir", () => {
  const html = `<a href="/stats/ecb_surveys/sma/shared/pdf/ecb.smar260727_july.en.pdf?a">x</a>
    <a href="/stats/ecb_surveys/sma/shared/pdf/ecb.smar260911_september.en.pdf?b">y</a>
    <a href="/stats/ecb_surveys/sma/shared/pdf/ecb.sma261012_questionnaire.en.pdf?c">anket formu</a>`;
  const r = latestSmaResultsUrl(html);
  assert.equal(r.publishedOn, "2026-09-11");
  assert.ok(r.url.startsWith("https://www.ecb.europa.eu/stats/ecb_surveys/sma/shared/pdf/ecb.smar260911"));
});
