/**
 * Altı ekonominin son yıllık enflasyonu → data/seed/inflation.json
 * (reel faiz tablosu: politika faizi − yıllık TÜFE).
 *
 *   npm run fetch:inflation
 *   npm run fetch:inflation -- --if-due   # yalnızca yeni açıklanan TÜFE
 *
 * --if-due haber işi içindir (yarım saatte bir): son 12 saatte TÜFE'si
 * açıklanmış (events.json) ama kaydı hâlâ önceki aya ait ekonomilerin
 * kaynağına gidilir; yoksa hiçbir kaynağa gidilmez.
 *
 * Kaynaklar ve ölçüler: src/lib/sources/inflation.ts. FRED_API_KEY (ABD) ve
 * EVDS_API_KEY (Türkiye) gerekir; yoksa o ülke atlanır ve önceki kayıt kalır.
 * Birleştirir, üzerine yazmaz: bir kaynak hata verirse önceki okuma korunur
 * ve iş hata koduyla biter (current-rates ile aynı kural).
 *
 * Türkiye okunduğunda enflasyon sayfasının ayrıntısı da yazılır
 * (data/seed/tr-inflation.json): Ocak 2024'ten aylık ve yıllık TÜFE, TÜİK'in
 * açıklama takvimi, anketin TÜFE beklentileri. Parçalardan biri hata verirse
 * onun önceki hâli korunur (src/lib/sources/tr-inflation.ts).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { dueCpiReleases } from "../src/lib/cpi-release";
import { fetchTrCpiCalendar, fetchTrCpiHistory, fetchTrSurveyRounds } from "../src/lib/sources/tr-inflation";
import type { TrInflation } from "../src/lib/tr-inflation";
import {
  fetchAustraliaCpi,
  fetchEuroAreaHicp,
  fetchJapanCpi,
  fetchTurkeyCpi,
  fetchUkCpi,
  fetchUsCpi,
  type InflationReading,
} from "../src/lib/sources/inflation";
import type { CalendarEvent } from "../src/lib/sources/speaking-calendars";
import type { BankCode } from "../src/lib/types";

config({ path: ".env.local", quiet: true });

const OUT = path.join(process.cwd(), "data", "seed", "inflation.json");
const EVENTS = path.join(process.cwd(), "data", "seed", "events.json");
const TR_OUT = path.join(process.cwd(), "data", "seed", "tr-inflation.json");

async function main() {
  let previous: InflationReading[] = [];
  try {
    previous = (JSON.parse(await readFile(OUT, "utf8")) as { readings: InflationReading[] }).readings;
  } catch {
    // ilk koşu
  }

  let only: Set<BankCode> | undefined;
  if (process.argv.includes("--if-due")) {
    const events = await readFile(EVENTS, "utf8")
      .then((s) => (JSON.parse(s) as { events: CalendarEvent[] }).events)
      .catch(() => []);
    only = new Set(dueCpiReleases(events, previous, new Date()));
    if (only.size === 0) {
      console.log("Yeni açıklanmış TÜFE yok.");
      return;
    }
    console.log(`Yeni açıklanan TÜFE: ${[...only].join(", ")}`);
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
    if (only && !only.has(code)) {
      const old = previous.find((p) => p.bankCode === code);
      if (old) readings.push(old);
      continue;
    }
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

  const key = process.env.EVDS_API_KEY;
  if (key && (!only || only.has("tcmb")) && !failed.includes("tcmb")) {
    if (!(await writeTrDetail(key))) failed.push("tcmb");
  }
  if (failed.length > 0) process.exit(1);
}

/** Enflasyon sayfasının ayrıntısı; parça başına birleştirir. Başarısız parça varsa false. */
async function writeTrDetail(apiKey: string): Promise<boolean> {
  let previous: Partial<TrInflation> = {};
  try {
    previous = JSON.parse(await readFile(TR_OUT, "utf8")) as TrInflation;
  } catch {
    // ilk koşu
  }
  let ok = true;
  const part = async <T>(name: string, fetcher: () => Promise<T>, old: T | undefined): Promise<T | undefined> => {
    try {
      return await fetcher();
    } catch (err) {
      console.error(`✗  Türkiye ${name}: ${(err as Error).message}`);
      ok = false;
      return old;
    }
  };
  const history = await part("TÜFE geçmişi", () => fetchTrCpiHistory(apiKey), previous.history);
  const releases = await part("TÜİK takvimi", () => fetchTrCpiCalendar(), previous.releases);
  const survey = await part("anket beklentileri", () => fetchTrSurveyRounds(apiKey), previous.survey);
  const out: TrInflation = { fetchedAt: new Date().toISOString(), history: history ?? [], releases: releases ?? [], survey: survey ?? [] };
  await writeFile(TR_OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  const last = out.history.at(-1);
  console.log(
    `✓  Türkiye ayrıntısı: ${out.history.length} ay (son ${last?.period}: aylık %${last?.mom}, yıllık %${last?.yoy}), ` +
      `${out.releases.length} açıklama günü, ${out.survey.length} anket turu`,
  );
  return ok;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
