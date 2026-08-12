/**
 * Atlanta Fed Market Probability Tracker verisini indirir, en güncel gözlem
 * gününü çıkarır ve data/seed/probabilities.json dosyasına yazar.
 *
 *   npm run fetch:probabilities
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fetchMptWorkbook, parseLatestSnapshot } from "../src/lib/sources/mpt";

const OUT = path.join(process.cwd(), "data", "seed", "probabilities.json");

async function main() {
  console.log("Atlanta Fed MPT indiriliyor…");
  const bytes = await fetchMptWorkbook();
  console.log(`  ${(bytes.length / 1_048_576).toFixed(1)} MB indirildi, ayrıştırılıyor…`);

  const snapshot = parseLatestSnapshot(bytes);

  if (snapshot.windows.length === 0) {
    throw new Error("Hiç referans penceresi çıkarılamadı — dosya yapısı değişmiş olabilir.");
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify({ fetchedAt: new Date().toISOString(), ...snapshot }, null, 2) + "\n",
    "utf8",
  );

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
