/**
 * Claude'un .minutes/out/ altına yazdığı özetleri doğrulayıp
 * data/seed/minutes.json'a işler. Bkz. scripts/fetch-minutes.ts.
 *
 *   npm run minutes:import
 *
 * Model çıktısı güvenilmez girdidir: yalnızca dışa aktarılmış ve güncel
 * istem sürümünde özeti olmayan kayıtlar kabul edilir, alanlar
 * parseMinutesOutput'ta denetlenir; güncel sürümdeki bir özet ezilmez.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { MINUTES_MODEL, MINUTES_PROMPT_VERSION, parseMinutesOutput } from "../src/lib/minutes";
import { loadMinutes, saveMinutes } from "./minutes-store";

const DIR = path.join(process.cwd(), ".minutes");

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
    console.log("İçe aktarılacak bir şey yok (.minutes/in boş).");
    return;
  }
  const store = await loadMinutes();
  const produced = new Set(await list(path.join(DIR, "out"), ".json"));

  let ok = 0;
  let failed = 0;
  for (const id of exported) {
    const rec = store.minutes.find((r) => r.meetingId === id);
    if (!rec || rec.summary?.promptVersion === MINUTES_PROMPT_VERSION) continue;
    if (!produced.has(id)) {
      console.error(`✗  ${id}: çıktı yok — bir sonraki koşuda yeniden denenir`);
      failed++;
      continue;
    }
    try {
      const raw = await readFile(path.join(DIR, "out", `${id}.json`), "utf8");
      // Model bazen kod bloğu içine sarar; ilk { ile son } arası alınır.
      const parsed = parseMinutesOutput(JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)));
      rec.summary = {
        ...parsed,
        model: `claude-code/${MINUTES_MODEL}`,
        promptVersion: MINUTES_PROMPT_VERSION,
        summarizedAt: new Date().toISOString(),
      };
      ok++;
      console.log(`✓  ${id}: ${parsed.score} — ${parsed.headlineTr}`);
    } catch (err) {
      console.error(`✗  ${id}: ${(err as Error).message}`);
      failed++;
    }
  }

  if (ok > 0) await saveMinutes(store);
  console.log(`\n→ ${ok} tutanak özeti işlendi${failed ? `, ${failed} başarısız` : ""}.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
