import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Expectations } from "../expectations";

const SEED_PATH = path.join(process.cwd(), "data", "seed", "expectations.json");

/**
 * Fed dışı faiz beklentileri. Veritabanı modunda da seed dosyasından okunur:
 * küçük, türetilmiş ve günlük tamamen yenilenen bir anlık görüntü; ayrı bir
 * tabloya taşımak yalnızca ikinci bir kayma kaynağı eklerdi.
 */
let cache: Expectations | undefined;

export async function getExpectations(): Promise<Expectations> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(SEED_PATH, "utf8")) as Expectations;
  } catch {
    cache = { fetchedAt: new Date(0).toISOString() };
  }
  return cache;
}
