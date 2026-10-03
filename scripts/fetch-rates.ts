/**
 * Geçmiş toplantıların karar oranlarını doldurur ve data/seed/meetings.json
 * dosyasını günceller: Fed için FRED, ECB için SDMX veri servisi, TCMB
 * için EVDS (EVDS_API_KEY gerekir; yoksa TCMB atlanır).
 *
 *   npm run fetch:rates
 *
 * Fed hedef aralığı bir bant olduğu için üst sınır decisionRate, alt sınır
 * decisionRateLower olarak saklanır. Yeni aralık karar gününün ertesi iş günü
 * yürürlüğe girer; bu yüzden karardan sonraki değer "yeni", karardan önceki
 * değer "önceki" oran kabul edilir.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { fetchSeries, SERIES, valueAsOf } from "../src/lib/sources/fred";
import { fetchEcbRates, rateAsOf } from "../src/lib/sources/ecb-rates";
import { fetchEvdsSeries, TCMB_POLICY_RATE } from "../src/lib/sources/evds";
import type { Meeting } from "../src/lib/types";

config({ path: ".env.local", quiet: true });

const SEED = path.join(process.cwd(), "data", "seed", "meetings.json");

async function main() {
  const file = JSON.parse(await readFile(SEED, "utf8")) as {
    fetchedAt: string;
    meetings: Meeting[];
  };

  const fedPast = file.meetings.filter(
    (m) => m.bankCode === "fed" && new Date(m.meetingAt) < new Date(),
  );
  if (fedPast.length === 0) {
    console.log("Doldurulacak geçmiş Fed toplantısı yok.");
    return;
  }

  const start = fedPast[0].meetingAt.slice(0, 10);
  const [upper, lower] = await Promise.all([
    fetchSeries(SERIES.targetUpper, { start }),
    fetchSeries(SERIES.targetLower, { start }),
  ]);
  console.log(`FRED: ${upper.length} üst / ${lower.length} alt sınır gözlemi`);

  let filled = 0;
  for (const m of file.meetings) {
    if (m.bankCode !== "fed") continue;
    if (new Date(m.meetingAt) >= new Date()) continue;

    const day = m.meetingAt.slice(0, 10);
    const before = dayOffset(day, -1);
    // Yeni aralık ertesi gün yürürlükte; hafta sonuna denk gelirse
    // valueAsOf en yakın önceki gözlemi bulur, bu yüzden +4 gün bakılır.
    const after = dayOffset(day, 4);

    const newUpper = valueAsOf(upper, after);
    const newLower = valueAsOf(lower, after);
    const oldUpper = valueAsOf(upper, before);

    if (newUpper === undefined || oldUpper === undefined) continue;

    m.decisionRate = newUpper;
    m.decisionRateLower = newLower;
    m.previousRate = oldUpper;
    m.status = "done";
    filled++;
  }

  // ECB SDW kırılırsa Fed'in doldurduğu oranlar yine yazılmalı; adım
  // sonunda hata koduyla biter ki kırılma görünür kalsın.
  let ecbFilled = 0;
  let ecbFailed = false;
  try {
    ecbFilled = await fillEcb(file.meetings);
  } catch (err) {
    console.error(`✗  ECB: ${(err as Error).message}`);
    ecbFailed = true;
  }

  let tcmbFilled = 0;
  let tcmbFailed = false;
  try {
    tcmbFilled = await fillTcmb(file.meetings);
  } catch (err) {
    console.error(`✗  TCMB: ${(err as Error).message}`);
    tcmbFailed = true;
  }

  await writeFile(SEED, JSON.stringify(file, null, 2) + "\n", "utf8");
  console.log(
    `→ ${filled} Fed, ${ecbFilled} ECB, ${tcmbFilled} TCMB toplantısına karar oranı yazıldı.`,
  );

  // Son 6 kararı özet olarak göster — gözle doğrulama için.
  for (const m of file.meetings.filter((x) => x.bankCode === "fed" && x.decisionRate).slice(-6)) {
    const bps = Math.round(((m.decisionRate ?? 0) - (m.previousRate ?? 0)) * 100);
    console.log(
      `   ${m.meetingAt.slice(0, 10)}  ${m.decisionRateLower}-${m.decisionRate}%  ` +
        (bps === 0 ? "(değişiklik yok)" : `(${bps > 0 ? "+" : ""}${bps} bp)`),
    );
  }

  for (const m of file.meetings.filter((x) => x.bankCode === "tcmb" && x.decisionRate !== undefined)) {
    const bps = Math.round(((m.decisionRate ?? 0) - (m.previousRate ?? 0)) * 100);
    console.log(
      `   TCMB ${m.meetingAt.slice(0, 10)}  %${m.decisionRate}  ` +
        (bps === 0 ? "(değişiklik yok)" : `(${bps > 0 ? "+" : ""}${bps} bp)`),
    );
  }

  if (ecbFailed || tcmbFailed) process.exit(1);
}

/**
 * ECB tek bir oran ilan eder (mevduat kolaylığı), Fed gibi aralık değil.
 * Yeni oran karardan birkaç gün sonra yürürlüğe girer; bu yüzden karar
 * gününün sonrasındaki pencereye bakılır.
 */
async function fillEcb(meetings: Meeting[]): Promise<number> {
  const past = meetings.filter(
    (m) => m.bankCode === "ecb" && new Date(m.meetingAt) < new Date(),
  );
  if (past.length === 0) return 0;

  // Seri toplantı gününden başlarsa "önceki oran" (gün-1) hiç bulunamaz ve
  // hiçbir toplantı dolmaz — "0 ECB" çıktısının asıl sebebi buydu.
  const obs = await fetchEcbRates(dayOffset(past[0].meetingAt.slice(0, 10), -10));
  console.log(`ECB SDW: ${obs.length} günlük gözlem`);

  let filled = 0;
  for (const m of past) {
    const day = m.meetingAt.slice(0, 10);
    const before = rateAsOf(obs, dayOffset(day, -1));
    const after = rateAsOf(obs, dayOffset(day, 10));
    if (before === undefined || after === undefined) continue;

    m.decisionRate = after;
    m.previousRate = before;
    m.status = "done";
    filled++;
  }
  return filled;
}

/**
 * TCMB tek oran ilan eder ve yeni oran karar günü yürürlüğe girer (EVDS
 * serisinde değişiklik karar tarihinde görünür). Hafta sonu/tatil boşlukları
 * için +4 gün bakılır; rateAsOf en yakın önceki gözlemi alır.
 */
async function fillTcmb(meetings: Meeting[]): Promise<number> {
  const apiKey = process.env.EVDS_API_KEY;
  if (!apiKey) {
    console.warn("⚠  EVDS_API_KEY tanımlı değil, TCMB karar oranları atlandı.");
    return 0;
  }

  const past = meetings.filter(
    (m) => m.bankCode === "tcmb" && new Date(m.meetingAt) < new Date(),
  );
  if (past.length === 0) return 0;

  const obs = await fetchEvdsSeries(
    TCMB_POLICY_RATE,
    dayOffset(past[0].meetingAt.slice(0, 10), -10),
    apiKey,
  );
  console.log(`EVDS: ${obs.length} günlük gözlem`);

  let filled = 0;
  for (const m of past) {
    const day = m.meetingAt.slice(0, 10);
    const before = rateAsOf(obs, dayOffset(day, -1));
    const after = rateAsOf(obs, dayOffset(day, 4));
    if (before === undefined || after === undefined) continue;

    m.decisionRate = after;
    m.previousRate = before;
    m.status = "done";
    filled++;
  }
  return filled;
}

function dayOffset(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
