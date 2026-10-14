import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TcmbFunding } from "../tcmb-funding";

const FILE = path.join(process.cwd(), "data", "seed", "tcmb-funding.json");

/** Bkz. inflation.ts — küçük, günlük yenilenen bir dosya; veritabanı modunda da dosyadan okunur. */
let cache: TcmbFunding | undefined;

export async function getTcmbFunding(): Promise<TcmbFunding | undefined> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(FILE, "utf8")) as TcmbFunding;
  } catch {
    return undefined;
  }
  return cache;
}
