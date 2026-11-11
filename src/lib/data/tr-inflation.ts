import "server-only";
import { readJsonStore } from "./read-store";
import path from "node:path";
import type { TrInflation } from "../tr-inflation";

const FILE = path.join(process.cwd(), "data", "seed", "tr-inflation.json");

/** Bkz. inflation.ts — küçük, günlük yenilenen bir dosya; veritabanı modunda da dosyadan okunur. */
let cache: TrInflation | undefined;

export async function getTrInflation(): Promise<TrInflation | undefined> {
  if (cache) return cache;
  cache = await readJsonStore<TrInflation | undefined>(FILE, undefined);
  return cache;
}
