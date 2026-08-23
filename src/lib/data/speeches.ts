import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BankCode, Speech } from "../types";

const SEED_PATH = path.join(process.cwd(), "data", "seed", "speeches.json");

interface Store {
  fetchedAt: string;
  speeches: Speech[];
}

let cache: Store | null | undefined;

async function load(): Promise<Store> {
  if (cache !== undefined && cache !== null) return cache;
  try {
    cache = JSON.parse(await readFile(SEED_PATH, "utf8")) as Store;
  } catch {
    cache = { fetchedAt: new Date(0).toISOString(), speeches: [] };
  }
  return cache;
}

/**
 * Arayüze giden kayıtlardan tam metin çıkarılır: sayfada gösterilmiyor,
 * yalnızca skorlamaya girdi. Taşımak sunucu→istemci yükünü büyütürdü.
 */
function withoutRawText(s: Speech): Speech {
  const copy = { ...s };
  delete copy.rawText;
  return copy;
}

/** Tüm konuşmalar, en yeni önce. */
export async function getSpeeches(
  opts: { bankCode?: BankCode; limit?: number; scoredOnly?: boolean } = {},
): Promise<Speech[]> {
  const { speeches } = await load();
  const rows = speeches
    .filter((s) => !opts.bankCode || s.bankCode === opts.bankCode)
    .filter((s) => !opts.scoredOnly || s.hawkDoveScore !== undefined)
    .sort((a, b) => b.speechDate.localeCompare(a.speechDate))
    .map(withoutRawText);
  return opts.limit ? rows.slice(0, opts.limit) : rows;
}

export async function getSpeech(id: string): Promise<Speech | undefined> {
  const { speeches } = await load();
  const found = speeches.find((s) => s.id === id);
  return found ? withoutRawText(found) : undefined;
}

export async function getSpeechIds(): Promise<string[]> {
  const { speeches } = await load();
  return speeches.map((s) => s.id);
}

export interface BankScoreSummary {
  bankCode: BankCode;
  /** Yalnızca para politikası sinyali taşıyan konuşmaların ortalaması. */
  averageScore: number;
  /** Ortalamaya giren konuşma sayısı. */
  speechCount: number;
  /** Arşivdeki ama sinyal taşımadığı için ortalamaya girmeyen konuşma sayısı. */
  noSignalCount: number;
  latestDate: string;
}

/**
 * Banka bazında ortalama eğilim — /skor sayfası için.
 *
 * Ortalamaya yalnızca para politikası sinyali taşıyan konuşmalar girer.
 * Düzenleme/denetim konuşmaları 0 puan alır ama bu "nötr duruş" değil
 * "sinyal yok" demektir; ortalamaya katılsalardı skoru yapay olarak
 * sıfıra çekerlerdi.
 */
export async function getBankScoreSummaries(): Promise<BankScoreSummary[]> {
  const scored = await getSpeeches({ scoredOnly: true });

  const byBank = new Map<BankCode, Speech[]>();
  for (const s of scored) {
    const list = byBank.get(s.bankCode);
    if (list) list.push(s);
    else byBank.set(s.bankCode, [s]);
  }

  return [...byBank.entries()]
    .map(([bankCode, list]) => {
      const signal = list.filter((s) => s.hasPolicySignal !== false);
      return {
        bankCode,
        averageScore:
          signal.length === 0
            ? 0
            : Math.round(
                (signal.reduce((sum, s) => sum + (s.hawkDoveScore ?? 0), 0) /
                  signal.length) * 10,
              ) / 10,
        speechCount: signal.length,
        noSignalCount: list.length - signal.length,
        latestDate: (signal[0] ?? list[0]).speechDate,
      };
    })
    .filter((s) => s.speechCount > 0)
    .sort((a, b) => b.averageScore - a.averageScore);
}

/** Arşivde konuşması bulunan bankalar — filtre çiplerini pasifleştirmek için. */
export async function getBankCodesWithSpeeches(): Promise<BankCode[]> {
  const { speeches } = await load();
  return [...new Set(speeches.map((s) => s.bankCode))];
}

/** Arşivin son güncellenme zamanı. */
export async function getSpeechesFetchedAt(): Promise<string | null> {
  const store = await load();
  return store.speeches.length > 0 ? store.fetchedAt : null;
}
