/**
 * Tutanakların deposu: data/seed/minutes.json (kayıtlar ve özetler). Metin
 * sitede gösterilmediği için git'e girmez; .cache/minutes'te durur ve
 * yalnızca model girdisidir — CI'da yoksa kaynaktan yeniden alınır.
 * Bkz. src/lib/minutes.ts.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MinutesStore } from "../src/lib/minutes";

const STORE = path.join(process.cwd(), "data", "seed", "minutes.json");
const CACHE_DIR = path.join(process.cwd(), ".cache", "minutes");

export async function loadMinutes(): Promise<MinutesStore> {
  try {
    return JSON.parse(await readFile(STORE, "utf8")) as MinutesStore;
  } catch {
    return { fetchedAt: new Date(0).toISOString(), minutes: [] };
  }
}

export async function saveMinutes(store: MinutesStore): Promise<void> {
  store.fetchedAt = new Date().toISOString();
  store.minutes.sort((a, b) => a.meetingId.localeCompare(b.meetingId));
  await writeFile(STORE, JSON.stringify(store, null, 2) + "\n", "utf8");
}

export async function writeMinutesText(meetingId: string, text: string): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(path.join(CACHE_DIR, `${meetingId}.txt`), text.trim() + "\n", "utf8");
}

export async function readMinutesText(meetingId: string): Promise<string | undefined> {
  try {
    return (await readFile(path.join(CACHE_DIR, `${meetingId}.txt`), "utf8")).trim();
  } catch {
    return undefined;
  }
}
