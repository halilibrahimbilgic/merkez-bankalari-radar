import { cpiReferenceMonth } from "../cpi-release";
import type { TrCpiMonth, TrSurveyRound } from "../tr-inflation";
import { fetchEvdsJson } from "./evds";
import { fetchTrCpiReleases } from "./release-calendars";
import { fetchPkaReleaseDates } from "./tcmb-survey";

/**
 * Türkiye enflasyonu sayfası için kaynaklar:
 *   TÜFE    EVDS TP.TUKFIY2025.GENEL — formül 1 aylık, 3 yıllık değişim.
 *           2025=100 serisi TÜİK'in zincirlediği geçmişle Ocak 2024'ten
 *           başlıyor (doğrulama 7 Kasım 2026: Ocak 2024 yıllık %64,86,
 *           Ekim 2026 aylık %2,58, yıllık %29,77).
 *   Anket   TP.PKAUO.S01.A–E.U: cari ay, 1 ve 2 ay sonrasının aylık TÜFE
 *           beklentisi, cari yıl sonu ve 12 ay sonrası yıllık (EVDS seri
 *           adlarıyla doğrulandı).
 *   Takvim  TÜİK'in yayımlanmamış bültenler listesi (release-calendars.ts).
 */

const CPI = "TP.TUKFIY2025.GENEL";
const SURVEY = ["A", "B", "C", "D", "E"].map((x) => `TP.PKAUO.S01.${x}.U`);

type EvdsItem = Record<string, unknown>;

const period = (it: EvdsItem) => {
  const m = String(it.Tarih ?? "").match(/^(\d{4})-(\d{1,2})$/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}` : undefined;
};
const value = (it: EvdsItem, key: string) => {
  const raw = it[key];
  const v = raw === null || raw === undefined || raw === "" ? NaN : Number(raw);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : undefined;
};
const items = (json: unknown) => ((json as { items?: EvdsItem[] }).items ?? []) as EvdsItem[];

/** İki EVDS yanıtı (formül 1 ve 3) → aylık ve yıllık değişim, ikisi de dolu aylar. */
export function parseCpiHistory(momJson: unknown, yoyJson: unknown): TrCpiMonth[] {
  const key = CPI.replace(/\./g, "_");
  const yoy = new Map(items(yoyJson).map((it) => [period(it), value(it, `${key}-3`)]));
  const out: TrCpiMonth[] = [];
  for (const it of items(momJson)) {
    const p = period(it);
    const mom = value(it, `${key}-1`);
    const y = p ? yoy.get(p) : undefined;
    if (p && mom !== undefined && y !== undefined) out.push({ period: p, mom, yoy: y });
  }
  if (out.length === 0) throw new Error("EVDS TÜFE geçmişi boş");
  return out;
}

export function parseSurveyRounds(json: unknown, published: Map<string, string>): TrSurveyRound[] {
  const k = SURVEY.map((s) => s.replace(/\./g, "_"));
  return items(json)
    .map((it): TrSurveyRound | undefined => {
      const round = period(it);
      if (!round) return undefined;
      const monthly: TrSurveyRound["monthly"] = [value(it, k[0]), value(it, k[1]), value(it, k[2])];
      if (monthly.every((v) => v === undefined)) return undefined;
      return { round, publishedOn: published.get(round), monthly, yearEnd: value(it, k[3]), months12: value(it, k[4]) };
    })
    .filter((r): r is TrSurveyRound => !!r);
}

export async function fetchTrCpiHistory(apiKey: string, start = "2024-01-01"): Promise<TrCpiMonth[]> {
  const [mom, yoy] = await Promise.all([fetchEvdsJson([CPI], start, apiKey, 1), fetchEvdsJson([CPI], start, apiKey, 3)]);
  return parseCpiHistory(mom, yoy);
}

export async function fetchTrSurveyRounds(apiKey: string, start = "2024-01-01"): Promise<TrSurveyRound[]> {
  const json = await fetchEvdsJson(SURVEY, start, apiKey);
  // Yayım günü yalnızca bilgi: takvim okunamazsa turlar yine yazılır.
  const published = new Map<string, string>();
  const year = new Date().getUTCFullYear();
  for (const y of [year - 1, year]) {
    try {
      for (const [k, v] of await fetchPkaReleaseDates(y)) published.set(k, v);
    } catch {
      // 2025 için kayıt yok; geçici hata da turları engellemesin.
    }
  }
  return parseSurveyRounds(json, published);
}

/** Bugünden 14 ay ilerisine TÜİK takvimi; dönem açıklama gününden türetilir (ayın bir öncesi). */
export async function fetchTrCpiCalendar(now = new Date()): Promise<{ at: string; period: string }[]> {
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 425 * 86_400_000).toISOString().slice(0, 10);
  return (await fetchTrCpiReleases(from, to))
    .map((e) => ({ at: e.at, period: cpiReferenceMonth(e.at) }))
    .sort((a, b) => a.at.localeCompare(b.at));
}
