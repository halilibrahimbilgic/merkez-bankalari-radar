import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { StatementLang, StatementRecord, StatementStore } from "../statements";
import type { BankCode } from "../types";

const STORE = path.join(process.cwd(), "data", "seed", "statements.json");
const TEXT_DIR = path.join(process.cwd(), "data", "statements");

/** Bkz. news.ts — 30 dakikada bir güncellenen dosya; veritabanı modunda da dosyadan. */
let cache: StatementStore | undefined;

async function load(): Promise<StatementStore> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(STORE, "utf8")) as StatementStore;
  } catch {
    cache = { fetchedAt: new Date(0).toISOString(), statements: [] };
  }
  return cache;
}

export async function getStatements(): Promise<StatementRecord[]> {
  return (await load()).statements;
}

export async function getStatement(meetingId: string): Promise<StatementRecord | undefined> {
  return (await load()).statements.find((s) => s.meetingId === meetingId);
}

/** Her bankanın puanlanmış en son karar metni (konuşma skoruyla aynı ölçek). */
export async function getLatestStatementScores(): Promise<Partial<Record<BankCode, { meetingId: string; score: number }>>> {
  const out: Partial<Record<BankCode, { meetingId: string; score: number }>> = {};
  for (const rec of (await load()).statements) {
    const score = rec.summary?.score;
    if (score === undefined) continue;
    const prev = out[rec.bankCode];
    // Kimlik "<banka>-YYYY-AA-GG": aynı bankada metin sırası tarih sırasıdır.
    if (!prev || rec.meetingId > prev.meetingId) out[rec.bankCode] = { meetingId: rec.meetingId, score };
  }
  return out;
}

/** Yalnızca yayımlanabilen metin; dosya adı kimlikten türediği için kimlik denetlenir. */
export async function getStatementText(rec: StatementRecord, lang: StatementLang): Promise<string | null> {
  if (!rec.publishable || !rec.langs.includes(lang) || !/^[\w-]+$/.test(rec.meetingId)) return null;
  try {
    return (await readFile(path.join(TEXT_DIR, `${rec.meetingId}.${lang}.txt`), "utf8")).trim();
  } catch {
    return null;
  }
}
