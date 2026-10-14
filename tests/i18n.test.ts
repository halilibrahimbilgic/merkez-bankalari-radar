import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtPercent, fmtPercentRange, languageAlternates, localePath, splitLangPath } from "../src/lib/i18n";

test("dil öneki eklenir ve geri alınır", () => {
  for (const path of ["/", "/takvim", "/banka/tcmb", "/konusma/r260813h"]) {
    assert.equal(splitLangPath(localePath("en", path)).path, path);
    assert.equal(splitLangPath(localePath("tr", path)).path, path);
  }
  assert.equal(localePath("en", "/"), "/en");
  assert.deepEqual(splitLangPath("/en"), { lang: "en", path: "/" });
  // "/enflasyon" gibi bir yol İngilizce sayılmamalı.
  assert.equal(splitLangPath("/enflasyon").lang, "tr");
});

test("hreflang karşılıkları", () => {
  const a = languageAlternates("en", "/takvim");
  assert.equal(a.canonical, "/en/takvim");
  assert.deepEqual(a.languages, { tr: "/takvim", en: "/en/takvim", "x-default": "/takvim" });
});

test("yüzde biçimi dile göre", () => {
  assert.equal(fmtPercent(37, "tr"), "%37,00");
  assert.equal(fmtPercent(37, "en"), "37.00%");
  assert.equal(fmtPercentRange(3.75, 4, "tr"), "%3,75–4,00");
  assert.equal(fmtPercentRange(3.75, 4, "en"), "3.75–4.00%");
});

test("konuşmacı adresi: aksan ve noktalama atılır, aynı kişi tek adrese düşer", async () => {
  const { speakerSlug } = await import("../src/lib/speakers");
  assert.equal(speakerSlug("Boris Vujčić"), "boris-vujcic");
  assert.equal(speakerSlug("Christopher J. Waller"), speakerSlug("Christopher J Waller"));
  assert.equal(speakerSlug("Christopher J Waller"), "christopher-j-waller");
  assert.equal(speakerSlug("Fatih Karahan"), "fatih-karahan");
  assert.equal(speakerSlug("Şebnem Kalemli-Özcan"), "sebnem-kalemli-ozcan");
  assert.equal(speakerSlug("Işık Ilgın"), "isik-ilgin");
});

test("konuşmacı unvanı: BIS tanıtım cümlesi ve modelin Türkçesi", async () => {
  const { roleFromContext, roleFromContextTr } = await import("../src/lib/speakers");
  // Örnekler 14 Ekim 2026'da data/seed/speeches.json'dan.
  assert.equal(
    roleFromContext("Speech by Mr Christopher J Waller, Member of the Board of Governors of the Federal Reserve System, at the Istanbul Economic Forum, Istanbul, 8 October 2026.", "Christopher J Waller"),
    "Member of the Board of Governors of the Federal Reserve System",
  );
  assert.equal(
    roleFromContext("Opening statement by Ms Michele Bullock, Governor of the Reserve Bank of Australia, to the House of Representatives Standing Committee on Economics, Canberra, 18 September 2026.", "Michele Bullock"),
    "Governor of the Reserve Bank of Australia",
  );
  assert.equal(roleFromContext("Speech at an event.", "Michele Bullock"), undefined);
  assert.equal(
    roleFromContextTr("Avrupa Merkez Bankası Denetim Kurulu Başkanı Prof. Claudia Buch'un, Hollanda Yabancı Bankacılar Derneği'nin yıllık konferansındaki açılış konuşması.", "Claudia Buch"),
    "Avrupa Merkez Bankası Denetim Kurulu Başkanı",
  );
  assert.equal(
    roleFromContextTr("Federal Rezerv Sistemi Guvernörler Kurulu Başkan Yardımcısı Philip N. Jefferson'ın, Darden İşletme Okulu'ndaki konuşması.", "Philip N Jefferson"),
    "Federal Rezerv Sistemi Guvernörler Kurulu Başkan Yardımcısı",
  );
  assert.equal(roleFromContextTr("Philip N. Jefferson'ın konuşması.", "Philip N Jefferson"), undefined);
});
