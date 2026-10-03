import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPool } from "../db";
import type { BankCode, ScoredVia, Speech } from "../types";
import type { TextLicense } from "../text-license";
import { toParagraphs } from "../speech-format";

const SEED_PATH = path.join(process.cwd(), "data", "seed", "speeches.json");

interface Store {
  fetchedAt: string;
  speeches: Speech[];
}

/**
 * Yalnızca seed dosyası önbelleğe alınır. Veritabanı yolu her istekte
 * yeniden sorgulanır: dosya ancak yeni bir dağıtımla değişir, veritabanı
 * ise günlük iş çalıştıkça değişir — onu süreç ömrü boyunca önbelleğe
 * almak taze veriyi sonsuza dek eskitirdi. Tazelik sınırını sayfa
 * düzeyindeki `revalidate` belirler.
 */
let seedCache: Store | undefined;

async function load(): Promise<Store> {
  const pool = getPool();
  if (pool) {
    // raw_text kasıtlı olarak seçilmez. Sitede gösterilen tam metin yalnızca
    // lisansı izin verenlerdir ve iki modda da data/speech-text'ten okunur.
    const { rows } = await pool.query<SpeechRow>(
      `select id, bank_code, speaker_name, speaker_role_tr, title,
              speech_date, source_url, text_is_excerpt, summary_tr,
              hawk_dove_score, has_policy_signal, score_rationale_tr,
              model, prompt_version, scored_at, scored_via,
              context_en, text_license,
              max(created_at) over () as store_fetched_at
         from speeches
        order by speech_date desc`,
    );
    return {
      fetchedAt: (rows[0]?.store_fetched_at ?? new Date(0)).toISOString(),
      speeches: rows.map(toSpeech),
    };
  }

  if (seedCache) return seedCache;
  try {
    seedCache = JSON.parse(await readFile(SEED_PATH, "utf8")) as Store;
  } catch {
    seedCache = { fetchedAt: new Date(0).toISOString(), speeches: [] };
  }
  return seedCache;
}

interface SpeechRow {
  id: string;
  bank_code: BankCode;
  speaker_name: string;
  speaker_role_tr: string | null;
  title: string;
  speech_date: Date;
  source_url: string;
  text_is_excerpt: boolean;
  summary_tr: string | null;
  hawk_dove_score: number | null;
  has_policy_signal: boolean | null;
  score_rationale_tr: string | null;
  model: string | null;
  prompt_version: string | null;
  scored_at: Date | null;
  scored_via: ScoredVia | null;
  context_en: string | null;
  text_license: TextLicense | null;
  store_fetched_at: Date | null;
}

function toSpeech(r: SpeechRow): Speech {
  return {
    id: r.id,
    bankCode: r.bank_code,
    speakerName: r.speaker_name,
    speakerRoleTr: r.speaker_role_tr ?? undefined,
    title: r.title,
    speechDate: r.speech_date.toISOString().slice(0, 10),
    sourceUrl: r.source_url,
    textIsExcerpt: r.text_is_excerpt,
    summaryTr: r.summary_tr ?? undefined,
    hawkDoveScore: r.hawk_dove_score ?? undefined,
    hasPolicySignal: r.has_policy_signal ?? undefined,
    scoreRationaleTr: r.score_rationale_tr ?? undefined,
    model: r.model ?? undefined,
    promptVersion: r.prompt_version ?? undefined,
    scoredAt: r.scored_at?.toISOString(),
    scoredVia: r.scored_via ?? undefined,
    contextEn: r.context_en ?? undefined,
    textLicense: r.text_license ?? undefined,
  };
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

const TEXT_DIR = path.join(process.cwd(), "data", "speech-text");

/**
 * Konuşmanın tam metni, paragraflara bölünmüş — yalnızca yayımcısı yeniden
 * yayıma izin veriyorsa (textLicense). Lisansı olmayan bir kaydın dosyası
 * yanlışlıkla depoda olsa bile gösterilmez.
 */
export async function getSpeechParagraphs(speech: Speech): Promise<string[] | null> {
  if (!speech.textLicense || !/^[\w-]+$/.test(speech.id)) return null;
  try {
    return toParagraphs(await readFile(path.join(TEXT_DIR, `${speech.id}.txt`), "utf8"));
  } catch {
    return null;
  }
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

export interface BankCoverage {
  bankCode: BankCode;
  speakers: string[];
  speechCount: number;
}

/**
 * Hangi bankada kimlerin konuşmalarını izlediğimiz — kapsamı şeffaf kılar.
 * Sabit bir liste tutmuyoruz; arşivde fiilen görülen konuşmacılardan türer,
 * yani vaat değil gerçekleşen kapsamı gösterir.
 */
export async function getCoverage(): Promise<BankCoverage[]> {
  const { speeches } = await load();
  const byBank = new Map<BankCode, Set<string>>();
  const counts = new Map<BankCode, number>();

  for (const s of speeches) {
    const set = byBank.get(s.bankCode) ?? new Set<string>();
    set.add(s.speakerName);
    byBank.set(s.bankCode, set);
    counts.set(s.bankCode, (counts.get(s.bankCode) ?? 0) + 1);
  }

  return [...byBank.entries()]
    .map(([bankCode, names]) => ({
      bankCode,
      speakers: [...names].sort((a, b) => a.localeCompare(b, "tr")),
      speechCount: counts.get(bankCode) ?? 0,
    }))
    .sort((a, b) => b.speechCount - a.speechCount);
}

/** Arşivde konuşması bulunan bankalar — filtre çiplerini pasifleştirmek için. */
export async function getBankCodesWithSpeeches(): Promise<BankCode[]> {
  const { speeches } = await load();
  return [...new Set(speeches.map((s) => s.bankCode))];
}

export interface ScoringStatus {
  total: number;
  scored: number;
  unscored: number;
  /** Skorlanmış kayıtların en yenisinin tarihi. */
  latestScoredDate?: string;
  /** Skorsuz kayıtların en yenisinin tarihi — boşluğun ne kadar taze olduğu. */
  latestUnscoredDate?: string;
}

/**
 * Skorlama boşluğunun büyüklüğü.
 *
 * Skorlama otomatik değil (bkz. /hakkinda); arşive yeni konuşma girdikçe
 * skorsuz kayıt birikir. Bunu gizlemek yerine sayıp gösteriyoruz — yoksa
 * banka ortalamaları eskimiş bir örneklemi temsil ederken güncel görünür.
 */
export async function getScoringStatus(): Promise<ScoringStatus> {
  const { speeches } = await load();
  const scored = speeches.filter((s) => s.hawkDoveScore !== undefined);
  const unscored = speeches.filter((s) => s.hawkDoveScore === undefined);
  const newest = (list: Speech[]) =>
    list.length === 0
      ? undefined
      : list.reduce((a, b) => (a.speechDate > b.speechDate ? a : b)).speechDate;

  return {
    total: speeches.length,
    scored: scored.length,
    unscored: unscored.length,
    latestScoredDate: newest(scored),
    latestUnscoredDate: newest(unscored),
  };
}

/** Arşivin son güncellenme zamanı. */
export async function getSpeechesFetchedAt(): Promise<string | null> {
  const store = await load();
  return store.speeches.length > 0 ? store.fetchedAt : null;
}
