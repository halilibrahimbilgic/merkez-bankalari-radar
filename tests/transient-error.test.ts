import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFailures, isOnlyTransient, isTransientMessage } from "../src/lib/transient-error";

// Örnekler 11 Kasım 2026 günlük işinden: ECB HICP servisi 504 vermişti.

test("geçici ağ hataları tanınır", () => {
  assert.ok(isTransientMessage("https://data-api.ecb.europa.eu/service/data/ICP → HTTP 504"));
  assert.ok(isTransientMessage("FRED CPIAUCSL → HTTP 503"));
  assert.ok(isTransientMessage("EVDS → HTTP 429"));
  assert.ok(isTransientMessage("fetch failed"));
  assert.ok(isTransientMessage("connect ETIMEDOUT 1.2.3.4:443"));
  assert.ok(isTransientMessage("The operation was aborted due to timeout"));
});

test("kalıcı hatalar geçici sayılmaz", () => {
  assert.ok(!isTransientMessage("https://www.tcmb.gov.tr/x → HTTP 404"));
  assert.ok(!isTransientMessage("EVDS → HTTP 403"));
  assert.ok(!isTransientMessage("Karar tarihi kalıbı bulunamadı"));
  assert.ok(!isTransientMessage("0 kayıt ayrıştırıldı"));
});

test("adım çıktısı: yalnızca geçici satırlar uyarı sayılır", () => {
  const out = "✓  fed: ok\n✗  ecb: https://x → HTTP 504\n✗  boe: fetch failed\n";
  const f = classifyFailures(out);
  assert.equal(f.transient.length, 2);
  assert.equal(f.permanent.length, 0);
  assert.ok(isOnlyTransient(f));
});

test("bir kalıcı hata varsa adım kırmızı kalır", () => {
  const f = classifyFailures("✗  ecb: HTTP 504\n✗  tcmb: kalıp bulunamadı\n");
  assert.ok(!isOnlyTransient(f));
  assert.deepEqual(f.permanent, ["tcmb: kalıp bulunamadı"]);
});

test("✗ satırı olmayan çökme kalıcı sayılır", () => {
  assert.ok(!isOnlyTransient(classifyFailures("TypeError: x is not a function\n")));
  assert.ok(!isOnlyTransient(classifyFailures("")));
});
