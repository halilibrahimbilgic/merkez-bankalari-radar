/**
 * Claude Code'un .scoring/out/ altına yazdığı skorları doğrulayıp arşive
 * işler. Bkz. scripts/score-export.ts.
 *
 *   npm run score:import
 *
 * Model çıktısı güvenilmez girdidir: şema elle denetlenir (parseScoreOutput),
 * yalnızca dışa aktarılmış ve hâlâ skorsuz olan kimlikler kabul edilir, mevcut
 * bir skor asla ezilmez.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CLAUDE_CODE_MODEL, parseScoreOutput, PROMPT_VERSION } from "../src/lib/score";
import type { Speech } from "../src/lib/types";

const SEED = path.join(process.cwd(), "data", "seed", "speeches.json");
const DIR = path.join(process.cwd(), ".scoring");

async function list(dir: string, ext: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((f) => f.endsWith(ext)).map((f) => f.slice(0, -ext.length));
  } catch {
    return [];
  }
}

async function main() {
  const exported = await list(path.join(DIR, "in"), ".md");
  if (exported.length === 0) {
    console.log("İçe aktarılacak bir şey yok (.scoring/in boş).");
    return;
  }

  const store = JSON.parse(await readFile(SEED, "utf8")) as {
    fetchedAt: string;
    speeches: Speech[];
  };
  const byId = new Map(store.speeches.map((s) => [s.id, s]));
  const produced = new Set(await list(path.join(DIR, "out"), ".json"));

  let ok = 0;
  let failed = 0;
  for (const id of exported) {
    const speech = byId.get(id);
    if (!speech || speech.hawkDoveScore !== undefined) continue;

    if (!produced.has(id)) {
      console.error(`✗  ${id}: çıktı yok`);
      failed++;
      continue;
    }

    try {
      const raw = await readFile(path.join(DIR, "out", `${id}.json`), "utf8");
      // Model bazen kod bloğu içine sarar; ilk { ile son } arası alınır.
      const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const result = parseScoreOutput(JSON.parse(json));

      speech.summaryTr = result.summaryTr;
      speech.hawkDoveScore = result.hawkDoveScore;
      speech.scoreRationaleTr = result.scoreRationaleTr;
      speech.hasPolicySignal = result.hasPolicySignal;
      speech.model = `claude-code/${CLAUDE_CODE_MODEL}`;
      speech.promptVersion = PROMPT_VERSION;
      speech.scoredAt = new Date().toISOString();
      speech.scoredVia = "claude-code";
      ok++;

      const sign = result.hawkDoveScore > 0 ? "+" : "";
      console.log(
        `✓  ${speech.speechDate} ${speech.speakerName} → ${sign}${result.hawkDoveScore}` +
          (result.hasPolicySignal ? "" : " (sinyalsiz)"),
      );
    } catch (err) {
      console.error(`✗  ${id}: ${(err as Error).message}`);
      failed++;
    }
  }

  if (ok > 0) await writeFile(SEED, JSON.stringify(store, null, 2) + "\n", "utf8");
  console.log(`\n→ ${ok} skor işlendi${failed ? `, ${failed} başarısız` : ""}.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
