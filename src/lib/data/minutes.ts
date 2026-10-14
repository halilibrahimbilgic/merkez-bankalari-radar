import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MinutesRecord, MinutesStore } from "../minutes";

const STORE = path.join(process.cwd(), "data", "seed", "minutes.json");

/** Bkz. statements.ts — 30 dakikada bir güncellenen dosya; veritabanı modunda da dosyadan. */
let cache: MinutesStore | undefined;

async function load(): Promise<MinutesStore> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(STORE, "utf8")) as MinutesStore;
  } catch {
    cache = { fetchedAt: new Date(0).toISOString(), minutes: [] };
  }
  return cache;
}

export async function getMinutes(meetingId: string): Promise<MinutesRecord | undefined> {
  return (await load()).minutes.find((r) => r.meetingId === meetingId);
}

export async function getAllMinutes(): Promise<MinutesRecord[]> {
  return (await load()).minutes;
}
