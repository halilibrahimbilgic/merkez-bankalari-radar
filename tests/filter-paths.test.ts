import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { CALENDAR_BANK_CODES } from "../src/lib/banks";
import { BANK_FILTER_PAGES, legacyFilterPath } from "../src/lib/filter-paths";

// Eski ?banka= adresleri dizinde ve paylaşılmış bağlantılarda duruyor;
// yönlendirme bir dilde ya da bir sayfada unutulursa o adres filtresiz
// sayfaya düşer ve kimse fark etmez.

const q = (s: string) => new URLSearchParams(s);

test("eski sorgulu adres iki dilde yeni yola gider", () => {
  for (const pre of ["", "/en"]) {
    for (const p of BANK_FILTER_PAGES) {
      for (const code of CALENDAR_BANK_CODES) {
        assert.equal(legacyFilterPath(`${pre}${p}`, q(`banka=${code}`)), `${pre}${p}/${code}`);
      }
      assert.equal(legacyFilterPath(`${pre}${p}`, q("banka=xyz")), null);
    }
    assert.equal(legacyFilterPath(`${pre}/haberler`, q("tur=resmi")), `${pre}/haberler/resmi`);
    assert.equal(legacyFilterPath(`${pre}/haberler`, q("tur=x")), null);
    assert.equal(legacyFilterPath(`${pre}/faiz-olasiligi`, q("donem=2027-03-17")), `${pre}/faiz-olasiligi/2027-03-17`);
    assert.equal(legacyFilterPath(`${pre}/faiz-olasiligi`, q("donem=../x")), null);
  }
  // Banka filtresi olmayan sayfa ve zaten yeni yoldaki adres dokunulmaz.
  assert.equal(legacyFilterPath("/haberler", q("banka=fed")), null);
  assert.equal(legacyFilterPath("/takvim/fed", q("banka=fed")), null);
});

test("filtre rotaları iki dilde var", () => {
  const dirs = [...BANK_FILTER_PAGES.map((p) => `${p}/[banka]`), "/haberler/[tur]", "/faiz-olasiligi/[donem]"];
  for (const root of ["src/app/(tr)", "src/app/en"]) {
    for (const d of dirs) assert.ok(existsSync(`${root}${d}/page.tsx`), `${root}${d}`);
  }
});
