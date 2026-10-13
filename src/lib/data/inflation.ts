import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { InflationReading } from "../sources/inflation";
import type { BankCode } from "../types";

const FILE = path.join(process.cwd(), "data", "seed", "inflation.json");

interface Store {
  fetchedAt: string;
  readings: InflationReading[];
}

/** Bkz. expectations.ts — küçük, günlük yenilenen bir anlık görüntü; dosyadan okunur. */
let cache: Store | undefined;

async function load(): Promise<Store> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(FILE, "utf8")) as Store;
  } catch {
    cache = { fetchedAt: new Date(0).toISOString(), readings: [] };
  }
  return cache;
}

export async function getInflation(): Promise<InflationReading[]> {
  return (await load()).readings;
}

export async function getInflationFor(bankCode: BankCode): Promise<InflationReading | undefined> {
  return (await load()).readings.find((r) => r.bankCode === bankCode);
}
