import "server-only";
import { readJsonStore } from "./read-store";
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
  cache = await readJsonStore<Store>(FILE, { fetchedAt: new Date(0).toISOString() });
  return cache;
}
