/**
 * Bankaların kendi tahminleri → data/seed/projections.json
 *
 *   npm run fetch:projections
 *
 * Fed: FOMC'nin Ekonomik Projeksiyonlar Özeti (FRED; FRED_API_KEY).
 * TCMB: Enflasyon Raporu'nun yıl sonu tahmini ve ara hedefleri (PDF yalnızca
 * yeni sayı çıktığında indirilir). Kaynaklar src/lib/sources/projections.ts.
 * Biri hata verirse yalnızca onun önceki kaydı korunur ve iş hata koduyla
 * biter (current-rates ile aynı kural).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import {
  fetchFedProjections,
  fetchTcmbForecast,
  type FedProjections,
  type TcmbForecast,
} from "../src/lib/sources/projections";

config({ path: ".env.local", quiet: true });

const OUT = path.join(process.cwd(), "data", "seed", "projections.json");

export interface ProjectionsStore {
  fetchedAt: string;
  fed?: FedProjections;
  tcmb?: TcmbForecast;
}

async function main() {
  let previous: ProjectionsStore = { fetchedAt: new Date(0).toISOString() };
  try {
    previous = JSON.parse(await readFile(OUT, "utf8")) as ProjectionsStore;
  } catch {
    // ilk koşu
  }
  const out: ProjectionsStore = { fetchedAt: new Date().toISOString(), fed: previous.fed, tcmb: previous.tcmb };
  let failed = 0;

  try {
    out.fed = await fetchFedProjections();
    console.log(
      `✓  Fed SEP ${out.fed.releasedOn}: ${out.fed.years.map((y) => `${y.year} ${y.median}`).join(", ")}, uzun dönem ${out.fed.longerRun}`,
    );
  } catch (err) {
    console.error(`✗  Fed SEP: ${(err as Error).message}`);
    failed++;
  }

  try {
    out.tcmb = await fetchTcmbForecast(previous.tcmb);
    console.log(
      `✓  TCMB Enflasyon Raporu ${out.tcmb.report}: tahmin ${JSON.stringify(out.tcmb.forecasts)}, ara hedef ${JSON.stringify(out.tcmb.targets)}`,
    );
  } catch (err) {
    console.error(`✗  TCMB Enflasyon Raporu: ${(err as Error).message}`);
    failed++;
  }

  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`→ ${path.relative(process.cwd(), OUT)}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
