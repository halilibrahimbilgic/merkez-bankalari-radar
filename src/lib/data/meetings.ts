import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPool } from "../db";
import type { BankCode, Meeting } from "../types";

interface SeedFile {
  fetchedAt: string;
  meetings: Meeting[];
}

const SEED_PATH = path.join(process.cwd(), "data", "seed", "meetings.json");

let seedCache: SeedFile | null = null;

async function loadSeed(): Promise<SeedFile> {
  if (seedCache) return seedCache;
  try {
    seedCache = JSON.parse(await readFile(SEED_PATH, "utf8")) as SeedFile;
  } catch {
    seedCache = { fetchedAt: new Date(0).toISOString(), meetings: [] };
  }
  return seedCache;
}

/** Tüm toplantılar, tarihe göre artan. */
export async function getAllMeetings(): Promise<Meeting[]> {
  const pool = getPool();
  if (!pool) return (await loadSeed()).meetings;

  const { rows } = await pool.query<{
    id: string;
    bank_code: BankCode;
    meeting_at: Date;
    time_tbd: boolean;
    type: Meeting["type"];
    status: Meeting["status"];
    decision_rate: string | null;
    decision_rate_lower: string | null;
    previous_rate: string | null;
    decision_note_tr: string | null;
    source_url: string | null;
  }>(
    `select id, bank_code, meeting_at, time_tbd, type, status,
            decision_rate, decision_rate_lower, previous_rate,
            decision_note_tr, source_url
       from meetings
      order by meeting_at asc`,
  );

  // numeric kolonlar pg'den string gelir — Number() ile çevrilmezse
  // oran aritmetiği (baz puan farkı) metin birleştirmeye dönüşür.
  return rows.map((r) => ({
    id: r.id,
    bankCode: r.bank_code,
    meetingAt: r.meeting_at.toISOString(),
    timeTbd: r.time_tbd,
    type: r.type,
    status: r.status,
    decisionRate: num(r.decision_rate),
    decisionRateLower: num(r.decision_rate_lower),
    previousRate: num(r.previous_rate),
    decisionNoteTr: r.decision_note_tr ?? undefined,
    sourceUrl: r.source_url ?? undefined,
  }));
}

function num(value: string | null): number | undefined {
  return value === null ? undefined : Number(value);
}

/** Bugünden itibaren yaklaşan toplantılar. */
export async function getUpcomingMeetings(
  opts: { bankCode?: BankCode; limit?: number; now?: Date } = {},
): Promise<Meeting[]> {
  const now = opts.now ?? new Date();
  const all = await getAllMeetings();
  const rows = all
    .filter((m) => new Date(m.meetingAt) >= now)
    .filter((m) => !opts.bankCode || m.bankCode === opts.bankCode);
  return opts.limit ? rows.slice(0, opts.limit) : rows;
}

/** Geçmiş toplantılar, en yeni önce. */
export async function getPastMeetings(
  opts: { bankCode?: BankCode; limit?: number; now?: Date } = {},
): Promise<Meeting[]> {
  const now = opts.now ?? new Date();
  const all = await getAllMeetings();
  const rows = all
    .filter((m) => new Date(m.meetingAt) < now)
    .filter((m) => !opts.bankCode || m.bankCode === opts.bankCode)
    .reverse();
  return opts.limit ? rows.slice(0, opts.limit) : rows;
}

/** Yaklaşan toplantısı bulunan bankalar — filtre çiplerini pasifleştirmek için. */
export async function getBankCodesWithMeetings(now = new Date()): Promise<BankCode[]> {
  const all = await getAllMeetings();
  return [
    ...new Set(
      all.filter((m) => new Date(m.meetingAt) >= now).map((m) => m.bankCode),
    ),
  ];
}

/** Verinin en son ne zaman tazelendiği — /hakkinda sayfasındaki şeffaflık notu. */
export async function getMeetingsFetchedAt(): Promise<string | null> {
  const pool = getPool();
  if (pool) {
    const { rows } = await pool.query<{ updated_at: Date | null }>(
      "select max(updated_at) as updated_at from meetings",
    );
    return rows[0]?.updated_at?.toISOString() ?? null;
  }
  const seed = await loadSeed();
  return seed.meetings.length > 0 ? seed.fetchedAt : null;
}
