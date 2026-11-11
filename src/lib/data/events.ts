import "server-only";
import { readJsonStore } from "./read-store";
import path from "node:path";
import type { CalendarEvent } from "../sources/speaking-calendars";

const FILE = path.join(process.cwd(), "data", "seed", "events.json");

/** Bkz. expectations.ts — günlük yenilenen küçük bir dosya; veritabanı modunda da dosyadan. */
let cache: CalendarEvent[] | undefined;

export async function getEvents(): Promise<CalendarEvent[]> {
  if (cache) return cache;
  cache = (await readJsonStore<{ events: CalendarEvent[] }>(FILE, { events: [] })).events;
  return cache;
}
