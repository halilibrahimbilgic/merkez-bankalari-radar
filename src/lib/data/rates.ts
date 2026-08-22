import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BankCode } from "../types";

const SEED_PATH = path.join(process.cwd(), "data", "seed", "current-rates.json");

export interface CurrentRate {
  bankCode: BankCode;
  rate: number;
  rateLower?: number;
  asOf: string;
  sourceUrl: string;
}

let cache: { fetchedAt: string; rates: CurrentRate[] } | undefined;

async function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(SEED_PATH, "utf8"));
  } catch {
    cache = { fetchedAt: new Date(0).toISOString(), rates: [] };
  }
  return cache!;
}

export async function getCurrentRate(
  bankCode: BankCode,
): Promise<CurrentRate | undefined> {
  return (await load()).rates.find((r) => r.bankCode === bankCode);
}

export async function getCurrentRates(): Promise<CurrentRate[]> {
  return (await load()).rates;
}

/** "%3,50-3,75" ya da "%2,25" */
export function formatCurrentRate(r: CurrentRate): string {
  const num = (v: number) => v.toFixed(2).replace(".", ",");
  return r.rateLower === undefined
    ? `%${num(r.rate)}`
    : `%${num(r.rateLower)}-${num(r.rate)}`;
}
