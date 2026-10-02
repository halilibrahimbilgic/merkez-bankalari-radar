import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPool } from "../db";
import type { BankCode } from "../types";

const SEED_PATH = path.join(process.cwd(), "data", "seed", "current-rates.json");

export interface CurrentRate {
  bankCode: BankCode;
  rate: number;
  rateLower?: number;
  asOf: string;
  sourceUrl: string;
}

interface Store {
  fetchedAt: string;
  rates: CurrentRate[];
}

/** Bkz. speeches.ts — yalnızca seed yolu önbelleğe alınır. */
let seedCache: Store | undefined;

async function load(): Promise<Store> {
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query<{
      bank_code: BankCode;
      rate: string;
      rate_lower: string | null;
      as_of: Date;
      source_url: string;
      updated_at: Date;
    }>(
      `select bank_code, rate, rate_lower, as_of, source_url, updated_at
         from current_rates
        order by bank_code`,
    );
    return {
      fetchedAt: (
        rows.reduce<Date | null>(
          (newest, r) => (!newest || r.updated_at > newest ? r.updated_at : newest),
          null,
        ) ?? new Date(0)
      ).toISOString(),
      rates: rows.map((r) => ({
        bankCode: r.bank_code,
        rate: Number(r.rate),
        rateLower: r.rate_lower === null ? undefined : Number(r.rate_lower),
        asOf: r.as_of.toISOString().slice(0, 10),
        sourceUrl: r.source_url,
      })),
    };
  }

  if (seedCache) return seedCache;
  try {
    seedCache = JSON.parse(await readFile(SEED_PATH, "utf8")) as Store;
  } catch {
    seedCache = { fetchedAt: new Date(0).toISOString(), rates: [] };
  }
  return seedCache;
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
