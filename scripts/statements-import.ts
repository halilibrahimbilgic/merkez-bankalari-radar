/**
 * Claude'un .statements/out/ altına yazdığı özetleri doğrulayıp
 * data/seed/statements.json'a işler. Bkz. scripts/fetch-statements.ts.
 *
 *   npm run statements:import
 *
 * Model çıktısı güvenilmez girdidir: yalnızca dışa aktarılmış ve hâlâ özetsiz
 * kayıtlar kabul edilir, alanlar parseStatementOutput'ta denetlenir; mevcut
 * bir özet ezilmez.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseStatementOutput, STATEMENT_MODEL, STATEMENT_PROMPT_VERSION } from "../src/lib/statements";
import { loadStatements, saveStatements } from "./statements-store";

const DIR = path.join(process.cwd(), ".statements");

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
    console.log("İçe aktarılacak bir şey yok (.statements/in boş).");
    return;
  }
  const store = await loadStatements();
  const produced = new Set(await list(path.join(DIR, "out"), ".json"));

  let ok = 0;
  let failed = 0;
  for (const id of exported) {
    const rec = store.statements.find((s) => s.meetingId === id);
    if (!rec || rec.summary) continue;
    if (!produced.has(id)) {
      console.error(`✗  ${id}: çıktı yok — bir sonraki koşuda yeniden denenir`);
      failed++;
      continue;
    }
    try {
      const raw = await readFile(path.join(DIR, "out", `${id}.json`), "utf8");
      // Model bazen kod bloğu içine sarar; ilk { ile son } arası alınır.
      const parsed = parseStatementOutput(JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)));
      rec.summary = {
        ...parsed,
        model: `claude-code/${STATEMENT_MODEL}`,
        promptVersion: STATEMENT_PROMPT_VERSION,
        summarizedAt: new Date().toISOString(),
      };
      ok++;
      console.log(`✓  ${id}: ${parsed.tone} — ${parsed.headlineTr}`);
    } catch (err) {
      console.error(`✗  ${id}: ${(err as Error).message}`);
      failed++;
    }
  }

  if (ok > 0) await saveStatements(store);
  console.log(`\n→ ${ok} özet işlendi${failed ? `, ${failed} başarısız` : ""}.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
