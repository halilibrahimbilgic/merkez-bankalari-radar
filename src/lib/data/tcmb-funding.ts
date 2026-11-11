import "server-only";
import { readJsonStore } from "./read-store";
import path from "node:path";
import type { TcmbFunding } from "../tcmb-funding";

const FILE = path.join(process.cwd(), "data", "seed", "tcmb-funding.json");

/** Bkz. inflation.ts — küçük, günlük yenilenen bir dosya; veritabanı modunda da dosyadan okunur. */
let cache: TcmbFunding | undefined;

export async function getTcmbFunding(): Promise<TcmbFunding | undefined> {
  if (cache) return cache;
  cache = await readJsonStore<TcmbFunding | undefined>(FILE, undefined);
  return cache;
}
