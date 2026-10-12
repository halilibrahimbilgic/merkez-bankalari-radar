/**
 * Claude'un .news/out/batch.json'a yazdığı kararları doğrulayıp
 * data/news/news.json'a işler. Bkz. scripts/news-fetch.ts.
 *
 *   npm run news:import
 *
 * Model çıktısı güvenilmez girdidir: yalnızca dışa aktarılmış kimlikler
 * kabul edilir, alanlar parseNewsOutput'ta denetlenip kırpılır; bağlantı ve
 * tarih modelden değil akıştan gelir.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NEWS_SOURCES, parseNewsOutput, type NewsInput, type NewsItem } from "../src/lib/news";
import { loadNewsStore, saveNewsStore } from "./news-store";

const DIR = path.join(process.cwd(), ".news");
/** Sitede tutulan geçmiş. */
const KEEP_DAYS = 30;
const KEEP_MAX = 500;
/** Reddedilen kimlikler bu kadar hatırlanır — akışlar 72 saatten eskisini vermiyor. */
const REJECT_DAYS = 7;

async function main() {
  let batch: NewsInput[];
  try {
    batch = JSON.parse(await readFile(path.join(DIR, "in", "batch.json"), "utf8")) as NewsInput[];
  } catch {
    console.log("İçe aktarılacak bir şey yok.");
    return;
  }
  const urls = JSON.parse(await readFile(path.join(DIR, "urls.json"), "utf8")) as Record<string, string>;
  const raw = await readFile(path.join(DIR, "out", "batch.json"), "utf8");
  // Model bazen kod bloğu içine sarar; ilk [ ile son ] arası alınır.
  const results = parseNewsOutput(JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1)));

  const byId = new Map(batch.map((b) => [b.id, b]));
  const store = await loadNewsStore();
  const now = new Date().toISOString();
  let added = 0;
  let rejected = 0;

  for (const r of results) {
    const input = byId.get(r.id);
    if (!input || store.items.some((i) => i.id === r.id)) continue;
    if (!r.relevant) {
      store.rejected[r.id] = now.slice(0, 10);
      rejected++;
      continue;
    }
    const [key] = input.source.split("|");
    const source = NEWS_SOURCES.find((s) => s.key === key);
    if (!source || !urls[r.id]) continue;
    const item: NewsItem = {
      id: r.id,
      sourceKey: source.key,
      sourceName: source.name,
      kind: source.kind,
      bankCode: source.bankCode,
      url: urls[r.id],
      publishedAt: input.publishedAt,
      titleOriginal: input.title,
      titleTr: r.titleTr,
      summaryTr: r.summaryTr,
      titleEn: r.titleEn,
      summaryEn: r.summaryEn,
      important: r.important,
      processedAt: now,
    };
    store.items.push(item);
    added++;
    console.log(`${r.important ? "★" : "✓"}  [${source.key}] ${r.titleTr}`);
  }

  const missing = batch.filter((b) => !results.some((r) => r.id === b.id)).length;
  if (missing) console.warn(`⚠  ${missing} öğe için çıktı yok — bir sonraki koşuda yeniden denenir.`);

  // Budama: eski haberler ve eski ret kayıtları.
  const keepFrom = Date.now() - KEEP_DAYS * 86_400_000;
  store.items = store.items
    .filter((i) => Date.parse(i.publishedAt) >= keepFrom)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, KEEP_MAX);
  const rejectFrom = new Date(Date.now() - REJECT_DAYS * 86_400_000).toISOString().slice(0, 10);
  for (const [id, day] of Object.entries(store.rejected)) if (day < rejectFrom) delete store.rejected[id];

  if (added > 0 || rejected > 0) {
    store.fetchedAt = now;
    await saveNewsStore(store);
  }
  console.log(`\n→ ${added} haber eklendi, ${rejected} öğe ilgisiz bulundu.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
