/**
 * Skorlanmamış konuşmaları Claude API ile Türkçe özetler ve şahin/güvercin
 * puanı verir. Her konuşma tek tek yazılır — iş yarıda kesilirse ilerleme
 * kaybolmaz ve yeniden çalıştırıldığında kaldığı yerden devam eder.
 *
 *   npm run score:speeches            # skorlanmamış olanların hepsi
 *   npm run score:speeches -- --limit 5
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { scoreSpeech, SCORING_MODEL, PROMPT_VERSION } from "../src/lib/score";
import type { Speech } from "../src/lib/types";

config({ path: ".env.local", quiet: true });

const SEED = path.join(process.cwd(), "data", "seed", "speeches.json");

interface Store {
  fetchedAt: string;
  speeches: Speech[];
}

function parseLimit(): number | undefined {
  const i = process.argv.indexOf("--limit");
  if (i === -1) return undefined;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) ? n : undefined;
}

async function main() {
  const store = JSON.parse(await readFile(SEED, "utf8")) as Store;

  const pending = store.speeches.filter(
    (s) => s.hawkDoveScore === undefined && s.rawText,
  );
  const limit = parseLimit();
  const batch = limit ? pending.slice(0, limit) : pending;

  if (batch.length === 0) {
    console.log("Skorlanacak konuşma yok.");
    return;
  }

  console.log(`${batch.length} konuşma skorlanacak (model: ${SCORING_MODEL}).\n`);
  let ok = 0;
  let failed = 0;

  for (const speech of batch) {
    try {
      const result = await scoreSpeech({
        bankCode: speech.bankCode,
        speakerName: speech.speakerName,
        title: speech.title,
        speechDate: speech.speechDate,
        text: speech.rawText!,
      });

      speech.summaryTr = result.summaryTr;
      speech.hawkDoveScore = result.hawkDoveScore;
      speech.scoreRationaleTr = result.scoreRationaleTr;
      speech.hasPolicySignal = result.hasPolicySignal;
      speech.model = SCORING_MODEL;
      speech.promptVersion = PROMPT_VERSION;
      speech.scoredAt = new Date().toISOString();
      speech.scoredVia = "api";

      // Her başarılı skordan sonra yaz — kesinti hâlinde ilerleme korunur.
      await writeFile(SEED, JSON.stringify(store, null, 2) + "\n", "utf8");

      ok++;
      const sign = result.hawkDoveScore > 0 ? "+" : "";
      console.log(
        `✓  ${speech.speechDate} ${speech.speakerName} → ${sign}${result.hawkDoveScore}`,
      );
    } catch (err) {
      failed++;
      console.error(`✗  ${speech.id}: ${(err as Error).message}`);
    }
  }

  console.log(`\n→ ${ok} skorlandı${failed ? `, ${failed} başarısız` : ""}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
