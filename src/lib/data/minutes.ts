import "server-only";
import { readJsonStore } from "./read-store";
import path from "node:path";
import type { MinutesRecord, MinutesStore } from "../minutes";

const STORE = path.join(process.cwd(), "data", "seed", "minutes.json");

/** Bkz. statements.ts — 30 dakikada bir güncellenen dosya; veritabanı modunda da dosyadan. */
let cache: MinutesStore | undefined;

async function load(): Promise<MinutesStore> {
  if (cache) return cache;
  cache = await readJsonStore<MinutesStore>(STORE, { fetchedAt: new Date(0).toISOString(), minutes: [] });
  return cache;
}

export async function getMinutes(meetingId: string): Promise<MinutesRecord | undefined> {
  return (await load()).minutes.find((r) => r.meetingId === meetingId);
}

export async function getAllMinutes(): Promise<MinutesRecord[]> {
  return (await load()).minutes;
}
