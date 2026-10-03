/**
 * Bankaların güncel politika faizini çeker → data/seed/current-rates.json
 *
 *   npm run fetch:current-rates
 *
 * Fed bir aralık ilan eder (FRED: DFEDTARL/DFEDTARU), ECB tek oran
 * (SDMX: mevduat kolaylığı), TCMB tek oran (EVDS: 1 hafta repo;
 * EVDS_API_KEY gerekir, yoksa atlanır).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { fetchSeries, SERIES } from "../src/lib/sources/fred";
import { fetchEcbRates } from "../src/lib/sources/ecb-rates";
import { fetchEvdsSeries, TCMB_POLICY_RATE, TCMB_RATES_PAGE_URL } from "../src/lib/sources/evds";
import type { BankCode } from "../src/lib/types";

config({ path: ".env.local", quiet: true });

const OUT = path.join(process.cwd(), "data", "seed", "current-rates.json");

export interface CurrentRate {
  bankCode: BankCode;
  /** Tek oranlı bankalarda oranın kendisi, aralıklı bankalarda üst sınır. */
  rate: number;
  /** Yalnızca aralık ilan eden bankalarda (Fed). */
  rateLower?: number;
  /** Oranın geçerli olduğu gözlem tarihi. */
  asOf: string;
  sourceUrl: string;
}

async function loadPrevious(): Promise<CurrentRate[]> {
  try {
    return (JSON.parse(await readFile(OUT, "utf8")) as { rates: CurrentRate[] }).rates;
  } catch {
    return [];
  }
}

async function main() {
  const rates: CurrentRate[] = [];
  const failed: BankCode[] = [];
  const since = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);

  try {
    const [upper, lower] = await Promise.all([
      fetchSeries(SERIES.targetUpper, { start: since }),
      fetchSeries(SERIES.targetLower, { start: since }),
    ]);
    const u = upper.at(-1);
    const l = lower.at(-1);
    if (u && l) {
      rates.push({
        bankCode: "fed",
        rate: u.value,
        rateLower: l.value,
        asOf: u.date,
        sourceUrl: "https://fred.stlouisfed.org/series/DFEDTARU",
      });
      console.log(`✓  Fed: %${l.value}-${u.value} (${u.date})`);
    }
  } catch (err) {
    console.error(`✗  Fed: ${(err as Error).message}`);
    failed.push("fed");
  }

  try {
    const obs = await fetchEcbRates(since);
    const last = obs.at(-1);
    if (last) {
      rates.push({
        bankCode: "ecb",
        rate: last.value,
        asOf: last.date,
        sourceUrl:
          "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html",
      });
      console.log(`✓  ECB: %${last.value} (${last.date})`);
    }
  } catch (err) {
    console.error(`✗  ECB: ${(err as Error).message}`);
    failed.push("ecb");
  }

  const evdsKey = process.env.EVDS_API_KEY;
  if (!evdsKey) {
    console.warn("⚠  EVDS_API_KEY tanımlı değil, TCMB atlandı.");
  } else {
    try {
      const last = (await fetchEvdsSeries(TCMB_POLICY_RATE, since, evdsKey)).at(-1);
      if (last) {
        rates.push({
          bankCode: "tcmb",
          rate: last.value,
          asOf: last.date,
          sourceUrl: TCMB_RATES_PAGE_URL,
        });
        console.log(`✓  TCMB: %${last.value} (${last.date})`);
      }
    } catch (err) {
      console.error(`✗  TCMB: ${(err as Error).message}`);
      failed.push("tcmb");
    }
  }

  // Geçici bir kaynak hatası (ECB SDW 504 verdi) bankanın faizini siteden
  // siliyordu. Önceki kayıt korunur; asOf tarihi bayatlığı zaten gösterir.
  for (const prev of await loadPrevious()) {
    if (failed.includes(prev.bankCode)) {
      rates.push(prev);
      console.warn(`   ${prev.bankCode}: önceki kayıt korundu (${prev.asOf})`);
    }
  }

  if (rates.length === 0) {
    console.error("Hiç güncel faiz çekilemedi.");
    process.exit(1);
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify({ fetchedAt: new Date().toISOString(), rates }, null, 2) + "\n",
    "utf8",
  );
  console.log(`\n→ ${path.relative(process.cwd(), OUT)}`);

  // Dosya yazıldı ama kırılma cron'da görünür kalsın.
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
