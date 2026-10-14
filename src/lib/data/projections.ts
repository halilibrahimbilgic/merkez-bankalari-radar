import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FedProjections, TcmbForecast } from "../sources/projections";

const FILE = path.join(process.cwd(), "data", "seed", "projections.json");

interface Store {
  fetchedAt: string;
  fed?: FedProjections;
  tcmb?: TcmbForecast;
}

/** Bkz. inflation.ts — günlük yenilenen küçük bir dosya; veritabanı modunda da dosyadan okunur. */
let cache: Store | undefined;

export async function getProjections(): Promise<Store> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(FILE, "utf8")) as Store;
  } catch {
    cache = { fetchedAt: new Date(0).toISOString() };
  }
  return cache;
}
