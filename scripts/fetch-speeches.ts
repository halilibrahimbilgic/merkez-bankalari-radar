/**
 * BIS beslemesinden yeni konuşmaları çeker, metinlerini indirir ve
 * data/seed/speeches.json dosyasına ekler (mevcut kayıtlar korunur).
 *
 *   npm run fetch:speeches
 *
 * Besleme yalnızca son 25 konuşmayı verdiği için arşiv bu iş her gün
 * çalıştıkça birikir.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fetchBisSpeeches, fetchSpeechText } from "../src/lib/sources/bis";
import type { Speech } from "../src/lib/types";

const OUT = path.join(process.cwd(), "data", "seed", "speeches.json");

interface Store {
  fetchedAt: string;
  speeches: Speech[];
}

async function load(): Promise<Store> {
  try {
    return JSON.parse(await readFile(OUT, "utf8")) as Store;
  } catch {
    return { fetchedAt: new Date(0).toISOString(), speeches: [] };
  }
}

/** Kaynak URL'sinden kararlı bir kimlik türetilir: r260805g */
function speechId(sourceUrl: string): string {
  const m = sourceUrl.match(/\/([a-z0-9]+)\.htm/i);
  return m ? m[1] : sourceUrl.replace(/\W+/g, "-");
}

async function main() {
  const store = await load();
  const known = new Set(store.speeches.map((s) => s.sourceUrl));

  const scraped = await fetchBisSpeeches();
  console.log(`Beslemede tanınan bankalara ait ${scraped.length} konuşma var.`);

  const fresh = scraped.filter((s) => !known.has(s.sourceUrl));
  if (fresh.length === 0) {
    console.log("Yeni konuşma yok.");
    return;
  }

  console.log(`${fresh.length} yeni konuşma indiriliyor…`);
  let added = 0;

  for (const s of fresh) {
    try {
      const rawText = await fetchSpeechText(s.sourceUrl);
      if (rawText.length < 500) {
        console.warn(`⚠  ${s.sourceUrl}: metin çok kısa (${rawText.length}), atlandı`);
        continue;
      }
      store.speeches.push({
        id: speechId(s.sourceUrl),
        bankCode: s.bankCode,
        speakerName: s.speakerName,
        title: s.title,
        speechDate: s.speechDate,
        sourceUrl: s.sourceUrl,
        rawText,
      });
      added++;
      console.log(`✓  [${s.bankCode}] ${s.speechDate} — ${s.speakerName}`);
    } catch (err) {
      console.error(`✗  ${s.sourceUrl}: ${(err as Error).message}`);
    }
    // BIS sunucusuna yüklenmemek için kısa bekleme
    await new Promise((r) => setTimeout(r, 700));
  }

  store.speeches.sort((a, b) => b.speechDate.localeCompare(a.speechDate));
  store.fetchedAt = new Date().toISOString();

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(store, null, 2) + "\n", "utf8");

  const unscored = store.speeches.filter((s) => s.hawkDoveScore === undefined).length;
  console.log(`\n→ ${added} eklendi, arşivde toplam ${store.speeches.length} konuşma.`);
  console.log(`   ${unscored} tanesi henüz skorlanmadı — npm run score:speeches`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
