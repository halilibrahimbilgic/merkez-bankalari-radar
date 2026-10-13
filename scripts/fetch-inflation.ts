/**
 * Altı ekonominin son yıllık enflasyonu → data/seed/inflation.json
 * (reel faiz tablosu: politika faizi − yıllık TÜFE).
 *
 *   npm run fetch:inflation
 *
 * Kaynaklar ve ölçüler: src/lib/sources/inflation.ts. FRED_API_KEY (ABD) ve
 * EVDS_API_KEY (Türkiye) gerekir; yoksa o ülke atlanır ve önceki kayıt kalır.
 * Birleştirir, üzerine yazmaz: bir kaynak hata verirse önceki okuma korunur
 * ve iş hata koduyla biter (current-rates ile aynı kural).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import {
  fetchAustraliaCpi,
  fetchEuroAreaHicp,
  fetchJapanCpi,
  fetchTurkeyCpi,
  fetchUkCpi,
  fetchUsCpi,
  type InflationReading,
} from "../src/lib/sources/inflation";
import type { BankCode } from "../src/lib/types";

config({ path: ".env.local", quiet: true });

const OUT = path.join(process.cwd(), "data", "seed", "inflation.json");

async function main() {
  let previous: InflationReading[] = [];
  try {
    previous = (JSON.parse(await readFile(OUT, "utf8")) as { readings: InflationReading[] }).readings;
  } catch {
    // ilk koşu
  }

  const fetchers: [BankCode, () => Promise<InflationReading>][] = [
    ["fed", fetchUsCpi],
    ["ecb", fetchEuroAreaHicp],
    ["tcmb", () => {
      const key = process.env.EVDS_API_KEY;
      if (!key) throw Object.assign(new Error("EVDS_API_KEY yok"), { skip: true });
      return fetchTurkeyCpi(key);
    }],
    ["boe", fetchUkCpi],
    ["boj", fetchJapanCpi],
    ["rba", fetchAustraliaCpi],
  ];

  const readings: InflationReading[] = [];
  const failed: BankCode[] = [];
  for (const [code, fetcher] of fetchers) {
    try {
      const r = await fetcher();
      readings.push(r);
      console.log(`✓  ${code.padEnd(4)} ${r.period}: %${r.yoy}${r.flash ? " (öncü)" : ""}`);
    } catch (err) {
      const old = previous.find((p) => p.bankCode === code);
      if (old) readings.push(old);
      if ((err as { skip?: boolean }).skip) {
        console.log(`–  ${code}: ${(err as Error).message}, atlandı`);
        continue;
      }
      console.error(`✗  ${code}: ${(err as Error).message}`);
      failed.push(code);
    }
  }

  await writeFile(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), readings }, null, 2) + "\n", "utf8");
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
