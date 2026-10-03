/**
 * Konuşma tam metni için git'e girmeyen önbellek.
 *
 * Tam metin üçüncü taraf telifli içeriktir ve yalnızca skorlamanın girdisidir;
 * public depoda tutulmaz. Her kaydın sourceUrl'i olduğu için metin her zaman
 * kaynaktan yeniden üretilebilir: önbellekte yoksa (temiz CI checkout'u,
 * önceki gün skorlanamamış kayıt) indirilir ve önbelleğe yazılır.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchSpeechText } from "../src/lib/sources/bis";
import type { Speech } from "../src/lib/types";

const CACHE_DIR = path.join(process.cwd(), ".cache", "speech-text");

function file(id: string): string {
  return path.join(CACHE_DIR, `${id}.txt`);
}

export async function saveSpeechText(id: string, text: string): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file(id), text, "utf8");
}

export async function loadSpeechText(speech: Pick<Speech, "id" | "sourceUrl">): Promise<string> {
  try {
    return await readFile(file(speech.id), "utf8");
  } catch {
    const text = await fetchSpeechText(speech.sourceUrl);
    await saveSpeechText(speech.id, text);
    return text;
  }
}
