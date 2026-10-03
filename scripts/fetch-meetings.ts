/**
 * Fed, ECB, TCMB, BoE, BoJ ve RBA resmi takvimlerini çeker, birleştirip data/seed/meetings.json
 * dosyasına yazar.
 *
 * Yalnızca dosyaya yazar; veritabanına aktarmak ayrı bir adımdır
 * (npm run db:import). Böylece çekme işi veritabanı erişimi olmadan da
 * çalışır ve cron'un commit ettiği seed dosyası tek doğruluk kaynağı kalır.
 *
 *   npm run fetch:meetings
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fetchFomcMeetings } from "../src/lib/sources/fomc";
import { fetchEcbMeetings } from "../src/lib/sources/ecb";
import { fetchTcmbMeetings } from "../src/lib/sources/tcmb";
import { fetchBoeMeetings } from "../src/lib/sources/boe";
import { fetchBojMeetings } from "../src/lib/sources/boj";
import { fetchRbaMeetings } from "../src/lib/sources/rba";
import type { ScrapedMeeting } from "../src/lib/sources/shared";
import { meetingId } from "../src/lib/data/ids";
import type { Meeting } from "../src/lib/types";

const OUT = path.join(process.cwd(), "data", "seed", "meetings.json");

const SOURCES = [
  { name: "Fed (FOMC)", run: fetchFomcMeetings },
  { name: "ECB (Governing Council)", run: fetchEcbMeetings },
  { name: "TCMB (PPK)", run: fetchTcmbMeetings },
  { name: "BoE (MPC)", run: fetchBoeMeetings },
  { name: "BoJ (MPM)", run: fetchBojMeetings },
  // rba.gov.au tarayıcı taklidine 403 veriyor; dürüst UA ile çalışır (rba.ts).
  { name: "RBA (Monetary Policy Board)", run: fetchRbaMeetings },
];

async function main() {
  const all: ScrapedMeeting[] = [];
  let failed = 0;

  for (const src of SOURCES) {
    try {
      const rows = await src.run();
      if (rows.length === 0) {
        console.warn(`⚠  ${src.name}: 0 kayıt — sayfa yapısı değişmiş olabilir`);
        failed++;
      } else {
        console.log(`✓  ${src.name}: ${rows.length} toplantı`);
      }
      all.push(...rows);
    } catch (err) {
      failed++;
      console.error(`✗  ${src.name}: ${(err as Error).message}`);
    }
  }

  if (all.length === 0) {
    console.error("Hiç veri çekilemedi; mevcut seed dosyası korunuyor.");
    process.exit(1);
  }

  const meetings: Meeting[] = all
    .map((m) => ({
      id: meetingId(m.bankCode, m.meetingAt, m.type),
      bankCode: m.bankCode,
      meetingAt: m.meetingAt,
      timeTbd: m.timeTbd,
      type: m.type,
      status: (new Date(m.meetingAt) < new Date() ? "done" : "scheduled") as
        | "done"
        | "scheduled",
      sourceUrl: m.sourceUrl,
    }))
    .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt));

  // Aynı banka+an için tekrar eden kayıtları ele (kaynak sayfalarda örtüşme olabilir)
  const unique = [...new Map(meetings.map((m) => [m.id, m])).values()];

  /*
   * Mevcut dosyayla BİRLEŞTİR, üzerine yazma.
   *
   * Takvim kaynakları yalnızca tarih ve saat verir; karar oranlarını
   * fetch:rates ayrı bir adımda FRED ve ECB'den doldurup bu dosyaya yazar.
   * Dosyayı sıfırdan yazmak o oranların tamamını siler — nitekim seed'de
   * 46 geçmiş Fed toplantısı "done" göründüğü hâlde karar oranı yoktu,
   * çünkü bu script fetch:rates'ten sonra tek başına çalışmıştı.
   */
  const existing = await readExisting();
  const scraped = unique.map((m) => {
    const old = existing.get(m.id);
    if (!old) return m;
    return {
      ...m,
      decisionRate: old.decisionRate,
      decisionRateLower: old.decisionRateLower,
      previousRate: old.previousRate,
      decisionNoteTr: old.decisionNoteTr,
    };
  });

  /*
   * GEÇMİŞ toplantılar, kaynak takviminden düşse bile korunur.
   *
   * Bankalar takvim sayfalarını ileriye doğru kaydırır: ECB'nin 10 Eylül
   * 2026 toplantısı, tarihi geçtiği için sayfadan kalkmış ve arşivden
   * sessizce silinmişti. Geçmiş kayıt değişmez bir olgudur; yalnızca
   * GELECEK toplantıların kaybolması anlamlıdır (ertelenmiş ya da iptal
   * edilmiş demektir), onları kaynağa bırakıyoruz.
   */
  const now = new Date();
  const scrapedIds = new Set(scraped.map((m) => m.id));
  const keptPast = [...existing.values()].filter(
    (m) => !scrapedIds.has(m.id) && new Date(m.meetingAt) < now,
  );
  if (keptPast.length > 0) {
    console.log(`   ${keptPast.length} geçmiş toplantı kaynakta yok, arşivde korundu.`);
  }

  const merged = [...scraped, ...keptPast].sort((a, b) =>
    a.meetingAt.localeCompare(b.meetingAt),
  );

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      { fetchedAt: new Date().toISOString(), meetings: merged },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  const kept = merged.filter((m) => m.decisionRate !== undefined).length;
  console.log(`\n→ ${merged.length} toplantı yazıldı: ${path.relative(process.cwd(), OUT)}`);
  console.log(`   ${kept} toplantının karar oranı korundu.`);
  if (failed > 0) console.log(`   (${failed} kaynak sorunlu — logu kontrol et)`);
}

/** Karar oranlarını korumak için mevcut seed dosyasını kimliğe göre okur. */
async function readExisting(): Promise<Map<string, Meeting>> {
  try {
    const file = JSON.parse(await readFile(OUT, "utf8")) as { meetings: Meeting[] };
    return new Map(file.meetings.map((m) => [m.id, m]));
  } catch {
    return new Map();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
