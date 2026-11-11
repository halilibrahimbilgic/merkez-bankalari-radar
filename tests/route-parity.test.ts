import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// İki dilin rotaları ince sarmalayıcılardır (app/(tr)/ ve app/en/); biri
// değişip diğeri unutulursa (ör. revalidate, generateStaticParams) iki dil
// sessizce ayrışır. ARCHITECTURE.md §4 "Site iki dillidir".

const APP = path.join(process.cwd(), "src", "app");
const TR = path.join(APP, "(tr)");
const EN = path.join(APP, "en");

function files(dir: string, name: string, rel = ""): string[] {
  return readdirSync(path.join(dir, rel)).flatMap((f) => {
    const r = path.join(rel, f);
    if (statSync(path.join(dir, r)).isDirectory()) return files(dir, name, r);
    return f === name ? [r] : [];
  });
}

/**
 * Rota davranışını belirleyen satırlar: `export const …` (revalidate,
 * dynamicParams …) ve `generateStaticParams`. generateMetadata/Page imzaları
 * dile göre zaten farklıdır (PageProps yolu, lang), `alt` metni de — karşılaştırılmaz.
 */
function routeConfig(file: string): string[] {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => /^export (const (?!metadata\b|alt\b)|(async )?function generateStaticParams)/.test(l))
    .map((l) => l.replace(/\s+/g, " ").trim());
}

/** Bilinçli ayrışma: paylaşım kartı yalnızca Türkçe, /en/bu-hafta Türkçeye yönlenir (ARCHITECTURE.md §4). */
const EXEMPT = new Set(["bu-hafta/page.tsx"]);

for (const name of ["page.tsx", "opengraph-image.tsx"]) {
  test(`dil rotaları: her (tr)/**/${name}'nin en karşılığı var ve ayarları aynı`, () => {
    const tr = files(TR, name).sort();
    const en = files(EN, name).sort();
    assert.ok(tr.length > 0);
    assert.deepEqual(en, tr, "iki dilin rota ağacı aynı olmalı");
    for (const rel of tr.filter((r) => !EXEMPT.has(r))) {
      assert.deepEqual(routeConfig(path.join(EN, rel)), routeConfig(path.join(TR, rel)), `${rel}: export ayarları ayrışmış`);
    }
  });
}
