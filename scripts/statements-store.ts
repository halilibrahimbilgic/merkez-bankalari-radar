/**
 * Karar metinlerinin deposu: data/seed/statements.json (kayıtlar) ve metin
 * dosyaları. Yayımlanabilen metin data/statements/<id>.<dil>.txt'de
 * commit'lenir; yayımlanamayan (BoE, BoJ PDF) git'e girmeyen
 * .cache/statements/'ta durur — yalnızca model girdisidir, gerekirse yeniden
 * indirilir. Bkz. src/lib/statements.ts.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StatementLang, StatementRecord, StatementStore } from "../src/lib/statements";

export const STORE = path.join(process.cwd(), "data", "seed", "statements.json");
const PUBLIC_DIR = path.join(process.cwd(), "data", "statements");
const CACHE_DIR = path.join(process.cwd(), ".cache", "statements");

export async function loadStatements(): Promise<StatementStore> {
  try {
    return JSON.parse(await readFile(STORE, "utf8")) as StatementStore;
  } catch {
    return { fetchedAt: new Date(0).toISOString(), statements: [] };
  }
}

export async function saveStatements(store: StatementStore): Promise<void> {
  store.fetchedAt = new Date().toISOString();
  store.statements.sort((a, b) => a.meetingId.localeCompare(b.meetingId));
  await writeFile(STORE, JSON.stringify(store, null, 2) + "\n", "utf8");
}

function textPath(rec: Pick<StatementRecord, "meetingId" | "publishable">, lang: StatementLang): string {
  return path.join(rec.publishable ? PUBLIC_DIR : CACHE_DIR, `${rec.meetingId}.${lang}.txt`);
}

export async function writeStatementText(
  rec: Pick<StatementRecord, "meetingId" | "publishable">,
  lang: StatementLang,
  text: string,
): Promise<void> {
  const file = textPath(rec, lang);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text.trim() + "\n", "utf8");
}

export async function readStatementText(
  rec: Pick<StatementRecord, "meetingId" | "publishable">,
  lang: StatementLang,
): Promise<string | undefined> {
  try {
    return (await readFile(textPath(rec, lang), "utf8")).trim();
  } catch {
    return undefined;
  }
}
