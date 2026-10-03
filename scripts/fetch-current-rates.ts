/**
 * Bankaların güncel politika faizini çeker → data/seed/current-rates.json
 *
 *   npm run fetch:current-rates
 *
 * Fed bir aralık ilan eder (FRED: DFEDTARL/DFEDTARU), ECB tek oran
 * (SDMX: mevduat kolaylığı), TCMB tek oran (EVDS: 1 hafta repo;
 * EVDS_API_KEY gerekir, yoksa atlanır), BoE (takvim sayfası), RBA (F1 CSV).
 *
 * asOf, oranın yürürlüğe girdiği gündür (effectiveSince) — son gözlem günü
 * değil; aksi hâlde dosya her gün değişirdi.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { fetchSeries, SERIES } from "../src/lib/sources/fred";
import { fetchEcbRates } from "../src/lib/sources/ecb-rates";
import {
  BOE_URL,
  fetchBoePage,
  parseBoeCalendar,
  parseBoeCurrentRate,
} from "../src/lib/sources/boe";
import { fetchEvdsSeries, TCMB_POLICY_RATE, TCMB_RATES_PAGE_URL } from "../src/lib/sources/evds";
import { fetchRbaCashRate, RBA_RATE_PAGE_URL } from "../src/lib/sources/rba";
import { effectiveSince } from "../src/lib/sources/shared";
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
  // Geniş pencere: effectiveSince son değişikliği bu pencerede arar.
  const since = new Date(Date.now() - 6 * 365 * 86_400_000).toISOString().slice(0, 10);

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
        asOf: effectiveSince(upper) ?? u.date,
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
        asOf: effectiveSince(obs) ?? last.date,
        sourceUrl:
          "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html",
      });
      console.log(`✓  ECB: %${last.value} (${last.date})`);
    }
  } catch (err) {
    console.error(`✗  ECB: ${(err as Error).message}`);
    failed.push("ecb");
  }

  // BoE takvim sayfasındaki "Current Bank Rate" kutusu. Kutu tarih vermiyor;
  // oran son karardan beri geçerli olduğu için asOf o kararın günüdür.
  // Çekim günü yazmak dosyayı her gün değiştirip boş commit üretirdi.
  try {
    const html = await fetchBoePage();
    const rate = parseBoeCurrentRate(html);
    if (rate === undefined) throw new Error("Current Bank Rate kutusu bulunamadı");
    const lastDecision = parseBoeCalendar(html)
      .map((m) => m.meetingAt)
      .filter((at) => new Date(at) < new Date())
      .at(-1);
    rates.push({
      bankCode: "boe",
      rate,
      asOf: (lastDecision ?? new Date().toISOString()).slice(0, 10),
      sourceUrl: BOE_URL,
    });
    console.log(`✓  BoE: %${rate}`);
  } catch (err) {
    console.error(`✗  BoE: ${(err as Error).message}`);
    failed.push("boe");
  }

  const evdsKey = process.env.EVDS_API_KEY;
  if (!evdsKey) {
    console.warn("⚠  EVDS_API_KEY tanımlı değil, TCMB atlandı.");
  } else {
    try {
      const obs = await fetchEvdsSeries(TCMB_POLICY_RATE, since, evdsKey);
      const last = obs.at(-1);
      if (last) {
        rates.push({
          bankCode: "tcmb",
          rate: last.value,
          asOf: effectiveSince(obs) ?? last.date,
          sourceUrl: TCMB_RATES_PAGE_URL,
        });
        console.log(`✓  TCMB: %${last.value} (${last.date})`);
      }
    } catch (err) {
      console.error(`✗  TCMB: ${(err as Error).message}`);
      failed.push("tcmb");
    }
  }

  try {
    const obs = await fetchRbaCashRate();
    const last = obs.at(-1);
    if (last) {
      rates.push({
        bankCode: "rba",
        rate: last.value,
        asOf: effectiveSince(obs) ?? last.date,
        sourceUrl: RBA_RATE_PAGE_URL,
      });
      console.log(`✓  RBA: %${last.value} (${effectiveSince(obs)} itibarıyla)`);
    }
  } catch (err) {
    console.error(`✗  RBA: ${(err as Error).message}`);
    failed.push("rba");
  }

  // Geçici bir kaynak hatası (ECB SDW 504 verdi) bankanın faizini siteden
  // siliyordu. Önceki kayıt korunur; hata cron'da kırmızı görünür.
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
