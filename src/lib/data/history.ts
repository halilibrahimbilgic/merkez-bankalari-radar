import "server-only";
import { readJsonStore } from "./read-store";
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
  cache = await readJsonStore<ExpectationHistory>(FILE, { fetchedAt: new Date(0).toISOString(), banks: {} });
  return cache;
}
