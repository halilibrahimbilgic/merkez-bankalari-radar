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
    code: BankCode;
    meeting_at: Date;
    time_tbd: boolean;
    type: Meeting["type"];
    status: Meeting["status"];
    decision_rate: string | null;
    previous_rate: string | null;
    decision_note_tr: string | null;
    source_url: string | null;
  }>(
    `select m.id::text, b.code, m.meeting_at, m.time_tbd, m.type, m.status,
            m.decision_rate, m.previous_rate, m.decision_note_tr, m.source_url
       from meetings m
       join central_banks b on b.id = m.bank_id
      order by m.meeting_at asc`,
  );

  return rows.map((r) => ({
    id: r.id,
    bankCode: r.code,
    meetingAt: r.meeting_at.toISOString(),
    timeTbd: r.time_tbd,
    type: r.type,
    status: r.status,
    decisionRate: r.decision_rate === null ? undefined : Number(r.decision_rate),
    previousRate: r.previous_rate === null ? undefined : Number(r.previous_rate),
    decisionNoteTr: r.decision_note_tr ?? undefined,
    sourceUrl: r.source_url ?? undefined,
  }));
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

/** Verinin en son ne zaman tazelendiği — /hakkinda sayfasındaki şeffaflık notu. */
export async function getMeetingsFetchedAt(): Promise<string | null> {
  if (getPool()) return null;
  const seed = await loadSeed();
  return seed.meetings.length > 0 ? seed.fetchedAt : null;
}
