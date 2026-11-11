import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import nextConfig from "../next.config";

// Veri dosyaları sitenin tek doğruluk kaynağı. Okuyucular üretimde dosya
// bozuksa/yoksa hata fırlatır (src/lib/data/read-store.ts); bu test aynı
// bozukluğu CI'da, dağıtımdan önce yakalar.

const ROOT = process.cwd();
const SEED_DIR = path.join(ROOT, "data", "seed");

test("data/seed/*.json hepsi geçerli JSON", () => {
  const files = readdirSync(SEED_DIR).filter((f) => f.endsWith(".json"));
  assert.ok(files.length > 0);
  for (const f of files) {
    assert.doesNotThrow(() => JSON.parse(readFileSync(path.join(SEED_DIR, f), "utf8")), f);
  }
});

test("haber ve beklenti geçmişi dosyaları geçerli JSON", () => {
  for (const f of ["data/news/news.json", "data/history/expectations.json"]) {
    assert.doesNotThrow(() => JSON.parse(readFileSync(path.join(ROOT, f), "utf8")), f);
  }
});

test("meetings.json: gelecek 90 günde en az bir toplantı var", () => {
  const { meetings } = JSON.parse(readFileSync(path.join(SEED_DIR, "meetings.json"), "utf8")) as {
    meetings: { meetingAt: string }[];
  };
  const now = Date.now();
  const soon = meetings.filter((m) => {
    const at = Date.parse(m.meetingAt);
    return at >= now && at <= now + 90 * 86_400_000;
  });
  assert.ok(soon.length > 0, "takvimde önümüzdeki 90 günde toplantı yok: kaynak kırılmış olabilir");
});

test("next.config'teki izlenen veri dosyalarının hepsi var", () => {
  const files = nextConfig.outputFileTracingIncludes?.["/*"] ?? [];
  assert.ok(files.length > 0);
  for (const f of files) assert.ok(existsSync(path.join(ROOT, f)), `${f} yok`);
  assert.deepEqual(nextConfig.outputFileTracingIncludes?.["/en/*"], files, "iki dilin listesi aynı olmalı");
});
