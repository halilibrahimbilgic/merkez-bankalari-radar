/**
 * Konuşma tam metni deposu.
 *
 * Tam metin üçüncü taraf içeriktir. Yayımcının şartları sitede yeniden
 * yayıma izin veriyorsa (src/lib/text-license.ts) metin depoya,
 * data/speech-text/<id>.txt'ye yazılır ve /konusma/<id> sayfasında
 * okunabilir. İzin yoksa git'e girmeyen .cache/speech-text/ önbelleğine
 * yazılır ve yalnızca skorlamanın girdisi olur.
 *
 * Her kaydın sourceUrl'i olduğu için metin her zaman kaynaktan yeniden
 * üretilebilir: iki yerde de yoksa (temiz CI checkout'u) indirilir.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchSpeechText } from "../src/lib/sources/bis";
import type { Speech } from "../src/lib/types";

const PUBLIC_DIR = path.join(process.cwd(), "data", "speech-text");
const CACHE_DIR = path.join(process.cwd(), ".cache", "speech-text");

export async function saveSpeechText(id: string, text: string, publishable: boolean): Promise<void> {
  const dir = publishable ? PUBLIC_DIR : CACHE_DIR;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${id}.txt`), text, "utf8");
}

export async function loadSpeechText(
  speech: Pick<Speech, "id" | "sourceUrl" | "textLicense">,
): Promise<string> {
  for (const dir of [PUBLIC_DIR, CACHE_DIR]) {
    try {
      return await readFile(path.join(dir, `${speech.id}.txt`), "utf8");
    } catch {
      // sıradakine bak
    }
  }
  const text = await fetchSpeechText(speech.sourceUrl);
  await saveSpeechText(speech.id, text, speech.textLicense !== undefined);
  return text;
}
