import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CalendarEvent } from "../sources/speaking-calendars";

const FILE = path.join(process.cwd(), "data", "seed", "events.json");

/** Bkz. expectations.ts — günlük yenilenen küçük bir dosya; veritabanı modunda da dosyadan. */
let cache: CalendarEvent[] | undefined;

export async function getEvents(): Promise<CalendarEvent[]> {
  if (cache) return cache;
  try {
    cache = (JSON.parse(await readFile(FILE, "utf8")) as { events: CalendarEvent[] }).events;
  } catch {
    cache = [];
  }
  return cache;
}
