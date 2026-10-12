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
