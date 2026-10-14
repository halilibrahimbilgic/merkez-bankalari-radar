import { test } from "node:test";
import assert from "node:assert/strict";
import { findErSummaryPdf, parseErIndex, parseTcmbForecast, shapeFedProjections } from "../src/lib/sources/projections";

// Örnekler 15 Ekim 2026'da FRED'den ve tcmb.gov.tr'den, kısaltılmış.

test("Fed SEP: yıllık seriler yıla göre, uzun dönemin günü SEP'in günü", () => {
  const sep = shapeFedProjections({
    median: [
      { date: "2026-01-01", value: 4.1 },
      { date: "2027-01-01", value: 4.1 },
      { date: "2028-01-01", value: 3.9 },
      { date: "2029-01-01", value: 3.6 },
    ],
    low: [
      { date: "2026-01-01", value: 3.9 },
      { date: "2027-01-01", value: 3.1 },
    ],
    high: [
      { date: "2026-01-01", value: 4.4 },
      { date: "2027-01-01", value: 4.4 },
    ],
    longerRun: [
      { date: "2026-06-17", value: 3.1 },
      { date: "2026-09-16", value: 3.2 },
    ],
  });
  assert.equal(sep.releasedOn, "2026-09-16");
  assert.equal(sep.longerRun, 3.2);
  assert.deepEqual(sep.years[0], { year: 2026, median: 4.1, low: 3.9, high: 4.4 });
  assert.deepEqual(sep.years[3], { year: 2029, median: 3.6, low: undefined, high: undefined });
});

test("Enflasyon Raporu dizini: bağlantısı olan ilk sayı en son yayımlanan", () => {
  const html = `<div class="collection-content w-clearfix">
Enflasyon Raporu 2026 - IV (12 Kasım 2026 tarihinde yayımlanacaktır)
</div><div class="collection-content w-clearfix">
<a class="collection-title" target="" href="/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Yayinlar/Raporlar/Enflasyon+Raporu/2026/Enflasyon+Raporu+2026+-+III" title="Enflasyon Raporu 2026 - III (13 Ağustos 2026)" class="type-link">Enflasyon Raporu 2026 - III (13 Ağustos 2026)</a>
</div><div class="collection-content w-clearfix">
<a class="collection-title" target="" href="/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Yayinlar/Raporlar/Enflasyon+Raporu/2026/Enflasyon+Raporu+2026+-+II" title="Enflasyon Raporu 2026 - II (14 Mayıs 2026)" class="type-link">Enflasyon Raporu 2026 - II (14 Mayıs 2026)</a></div>`;
  assert.deepEqual(parseErIndex(html), {
    report: "2026-III",
    publishedOn: "2026-08-13",
    url: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Yayinlar/Raporlar/Enflasyon+Raporu/2026/Enflasyon+Raporu+2026+-+III",
  });
  const issue = `<h2 class="type-h2">1. Genel Değerlendirme</h2>
<a target="_blank" href="/wps/wcm/connect/b465a891-4453-40ce-a79c-3fb9b2c846b4/1b26_iii.pdf?MOD=AJPERES&amp;CACHEID=ROOTWORKSPACE-b465a891" class="pdf type-link">PDF Metni</a>`;
  assert.equal(
    findErSummaryPdf(issue),
    "https://www.tcmb.gov.tr/wps/wcm/connect/b465a891-4453-40ce-a79c-3fb9b2c846b4/1b26_iii.pdf?MOD=AJPERES&CACHEID=ROOTWORKSPACE-b465a891",
  );
});

test("Enflasyon Raporu: yıl sonu tahminleri ve ara hedefler (virgül ayraç, ondalık değil)", () => {
  // Genel Değerlendirme, s. 3 — PDF metni boşluklar birleştirilmiş hâliyle.
  const text =
    "Enflasyon beklentileri ise enflasyon tahmini ve ara hedefinin üzerinde seyretmeye devam etmektedir. " +
    "Enflasyon ara hedefleri, 2026, 2027 ve 2028 yılları için sırasıyla yüzde 24, yüzde 15 ve yüzde 9 olarak korunmuştur. " +
    "TCMB, enflasyon gerçekleşmelerini, ana eğilimini ve beklentilerini dikkate alarak ara hedeflerle uyumlu biçimde dezenflasyonun gerektirdiği parasal sıkılığı sağlayacaktır. " +
    "Enflasyonun, 2026 yıl sonunda yüzde 28; 2027 yıl sonunda ise yüzde 15 olarak gerçekleşeceği tahmin edilmektedir. " +
    "2028 yıl sonunda yüzde 9’a geriledikten sonra enflasyonun orta vadede yüzde 5 hedefine ulaşacağı öngörülmektedir.";
  assert.deepEqual(parseTcmbForecast(text), {
    forecasts: { "2026": 28, "2027": 15, "2028": 9 },
    targets: { "2026": 24, "2027": 15, "2028": 9 },
  });
  // Ondalıklı tahmin de okunur.
  const decimal = text.replace("2026 yıl sonunda yüzde 28;", "2026 yıl sonunda yüzde 27,5;");
  assert.equal(parseTcmbForecast(decimal).forecasts["2026"], 27.5);
  assert.throws(() => parseTcmbForecast("Enflasyon raporu metni değişti."), /tahmin cümlesi bulunamadı/);
});
