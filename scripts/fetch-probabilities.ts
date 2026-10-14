/**
 * Atlanta Fed Market Probability Tracker verisini indirir, en güncel gözlem
 * gününü çıkarır ve data/seed/probabilities.json dosyasına yazar; pencerelerin
 * günlük seyrini data/history/expectations.json'a (fedWindows).
 *
 *   npm run fetch:probabilities
 *   npm run fetch:probabilities -- --if-changed   # dosya değişmediyse indirmez
 *
 * --if-changed haber işi içindir (yarım saatte bir): günlük iş bizim
 * sabahımızda koşuyor, Atlanta Fed ise ABD sabahı yayımlıyor; site bu yüzden
 * bir tur geriden geliyordu (14 Ekim 2026'da 5 gün). Dosyanın tarihi
 * (Last-Modified) öncekiyle aynıysa çıkılır.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  fetchMptLastModified,
  fetchMptWorkbook,
  readMptRows,
  snapshotFromRows,
  windowHistoryFromRows,
} from "../src/lib/sources/mpt";
import { loadHistory, saveHistory } from "./expectation-history";

const OUT = path.join(process.cwd(), "data", "seed", "probabilities.json");

async function main() {
  const modified = await fetchMptLastModified().catch(() => undefined);
  if (process.argv.includes("--if-changed") && modified) {
    const previous = await readFile(OUT, "utf8")
      .then((s) => JSON.parse(s) as { sourceModified?: string })
      .catch(() => undefined);
    if (previous?.sourceModified === modified) {
      console.log(`Atlanta Fed dosyası değişmemiş (${modified}).`);
      return;
    }
  }

  console.log("Atlanta Fed MPT indiriliyor…");
  const bytes = await fetchMptWorkbook();
  console.log(`  ${(bytes.length / 1_048_576).toFixed(1)} MB indirildi, ayrıştırılıyor…`);

  const rows = readMptRows(bytes);
  const snapshot = snapshotFromRows(rows);

  if (snapshot.windows.length === 0) {
    throw new Error("Hiç referans penceresi çıkarılamadı — dosya yapısı değişmiş olabilir.");
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify({ fetchedAt: new Date().toISOString(), sourceModified: modified, ...snapshot }, null, 2) + "\n",
    "utf8",
  );

  // Olasılıkların seyri (faiz olasılığı sayfasındaki grafik): dosya Atlanta
  // Fed'in tüm geçmişini taşıdığı için her koşuda son bir yıl yeniden yazılır.
  const since = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  const history = await loadHistory();
  history.fedWindows = windowHistoryFromRows(rows, since);
  await saveHistory(history);

  const t = snapshot.targetRange;
  console.log(
    `\n✓ Gözlem tarihi ${snapshot.asOf} · güncel hedef aralık ` +
      (t ? `${t.lowerBps}-${t.upperBps} bp` : "bilinmiyor"),
  );
  for (const w of snapshot.windows.slice(0, 4)) {
    const total = w.buckets.reduce((s, b) => s + b.probabilityPct, 0);
    console.log(
      `   ${w.startDate}: indirim %${w.probCutPct?.toFixed(1)} · ` +
        `artırım %${w.probHikePct?.toFixed(1)} · ${w.buckets.length} bant ` +
        `(toplam %${total.toFixed(1)})`,
    );
  }
  console.log(`\n→ ${path.relative(process.cwd(), OUT)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
