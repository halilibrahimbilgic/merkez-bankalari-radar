import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ExpectationHistory } from "../expectation-history";

const FILE = path.join(process.cwd(), "data", "history", "expectations.json");

/**
 * Beklentilerin seyri — veritabanı modunda da dosyadan okunur (bkz.
 * expectations.ts): türetilmiş, günlük işin birleştirdiği bir arşiv.
 */
let cache: ExpectationHistory | undefined;

export async function getExpectationHistory(): Promise<ExpectationHistory> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(FILE, "utf8")) as ExpectationHistory;
  } catch {
    cache = { fetchedAt: new Date(0).toISOString(), banks: {} };
  }
  return cache;
}
