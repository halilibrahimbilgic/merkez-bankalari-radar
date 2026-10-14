import { trtDayKey } from "../time";
import { fetchEvdsJson } from "./evds";
import { UA } from "./shared";

/**
 * TCMB Piyasa Katılımcıları Anketi — politika faizi beklentileri (EVDS,
 * "uygun ortalamalar" tablosu, bie_pkauo). Ekonomist ve piyasa
 * katılımcılarına sorulan bir ankettir; piyasa fiyatlaması DEĞİLDİR ve
 * arayüzde böyle etiketlenmelidir.
 *
 * "İlk/İkinci/Üçüncü toplantı" anket ayının 1'inden sonraki ilk üç PPK'dır.
 * Doğrulama (12 Ekim 2026): Ağustos ve Eylül anketlerinde üçüncü toplantı
 * Aralık PPK'sına düşüyor ve beklentisi yıl sonu beklentisine birebir eşit
 * (35,25 / 35,07); Temmuz'da üçüncü toplantı Ekim'e düşüyor ve eşit değil.
 */
export const TCMB_SURVEY_PAGE_URL =
  "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Egilim+Anketleri/Piyasa+Katilimcilari+Anketi/";

const SERIES = {
  meeting1: "TP.PKAUO.S04.C.U",
  meeting2: "TP.PKAUO.S04.F.U",
  meeting3: "TP.PKAUO.S04.G.U",
  yearEnd: "TP.PKAUO.S04.H.U",
  months12: "TP.PKAUO.S04.D.U",
  /** 12 ay sonrasının yıllık TÜFE beklentisi — ileriye dönük reel faiz için. */
  inflation12: "TP.PKAUO.S01.E.U",
} as const;

export interface TcmbSurvey {
  /** Anket ayı, "2026-09". */
  period: string;
  /** Sırasıyla anket ayından sonraki ilk üç PPK için beklenen politika faizi (%). */
  meetings: number[];
  yearEnd?: number;
  months12?: number;
  /** 12 ay sonrası için beklenen yıllık TÜFE (%). */
  inflation12?: number;
}

export async function fetchTcmbSurvey(apiKey: string): Promise<TcmbSurvey> {
  const start = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  return parseTcmbSurvey(await fetchEvdsJson(Object.values(SERIES), start, apiKey));
}

/** Verilen günden bu yana her ayın anketi (politika faizi serileri 2025-06'dan başlıyor). */
export async function fetchTcmbSurveyHistory(apiKey: string, start: string): Promise<TcmbSurvey[]> {
  return parseTcmbSurveyHistory(await fetchEvdsJson(Object.values(SERIES), start, apiKey));
}

/** Aylık yanıtta Tarih "2026-9" biçimindedir. En son dolu ay alınır. */
export function parseTcmbSurvey(json: unknown): TcmbSurvey {
  const all = parseTcmbSurveyHistory(json);
  if (all.length === 0) throw new Error("EVDS anket: dolu ay bulunamadı");
  return all[all.length - 1];
}

/** Politika faizi beklentisi dolu her ay, eskiden yeniye. */
export function parseTcmbSurveyHistory(json: unknown): TcmbSurvey[] {
  const items = (json as { items?: Record<string, unknown>[] }).items;
  if (!Array.isArray(items)) throw new Error("EVDS anket: beklenmeyen yanıt biçimi");
  const num = (item: Record<string, unknown>, code: string) => {
    const v = item[code.replace(/\./g, "_")];
    const n = v == null ? NaN : Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const out: TcmbSurvey[] = [];
  for (const item of items) {
    const m = String(item.Tarih ?? "").match(/^(\d{4})-(\d{1,2})$/);
    const first = num(item, SERIES.meeting1);
    if (!m || first === undefined) continue;
    const meetings = [first, num(item, SERIES.meeting2), num(item, SERIES.meeting3)].filter(
      (x): x is number => x !== undefined,
    );
    out.push({
      period: `${m[1]}-${m[2].padStart(2, "0")}`,
      meetings,
      yearEnd: num(item, SERIES.yearEnd),
      months12: num(item, SERIES.months12),
      inflation12: num(item, SERIES.inflation12),
    });
  }
  return out.sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Anketin yayım günleri — TCMB veri yayımlama takvimi (sitedeki takvim
 * uygulamasının kendi JSON ucu; yayın kimliği 4 = Piyasa Katılımcıları
 * Anketi). 2025 için kayıt yok; yalnızca içinde bulunulan yıl ve sonrası.
 * Eşleşmeyen dönem için çağıran taraf ilk gördüğü günü kullanır.
 */
export async function fetchPkaReleaseDates(year: number): Promise<Map<string, string>> {
  const url = `https://appg.tcmb.gov.tr/igmvytsms-dis/veriTakvimi/list?yil=${year}&yayinId=4&page=0&size=50&lang=tr`;
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`TCMB veri takvimi → HTTP ${res.status}`);
  return parsePkaReleaseDates(await res.json());
}

const TR_MONTHS: Record<string, string> = {
  ocak: "01", şubat: "02", mart: "03", nisan: "04", mayıs: "05", haziran: "06",
  temmuz: "07", ağustos: "08", eylül: "09", ekim: "10", kasım: "11", aralık: "12",
};

/** {content: [{donem: "Eylül 2026", tarih: "2026-09-11T10:00:00.000Z"}]} → "2026-09" → "2026-09-11" (TRT günü). */
export function parsePkaReleaseDates(json: unknown): Map<string, string> {
  const items = (json as { content?: { donem?: string; tarih?: string }[] }).content;
  if (!Array.isArray(items)) throw new Error("TCMB veri takvimi: beklenmeyen yanıt biçimi");
  const out = new Map<string, string>();
  for (const it of items) {
    const m = it.donem?.trim().match(/^(\S+)\s+(\d{4})$/);
    const month = m && TR_MONTHS[m[1].toLocaleLowerCase("tr-TR")];
    if (!m || !month || !it.tarih) continue;
    out.set(`${m[2]}-${month}`, trtDayKey(it.tarih));
  }
  return out;
}

/**
 * Anketteki "ilk/ikinci/üçüncü toplantı"yı takvimdeki PPK'larla eşler:
 * anket ayının 1'inden itibaren ilk üç toplantı. Takvimde yeterli toplantı
 * yoksa hata — yanlış toplantıya beklenti yazmaktansa hiç yazmamak.
 */
export function mapSurveyMeetings<M extends { id: string; meetingAt: string }>(
  survey: TcmbSurvey,
  meetings: M[],
): { meeting: M; expectedRate: number }[] {
  const from = `${survey.period}-01`;
  const next = [...meetings]
    .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt))
    .filter((m) => m.meetingAt.slice(0, 10) >= from);
  if (next.length < survey.meetings.length) {
    throw new Error(`anket ${survey.meetings.length} toplantı veriyor, takvimde ${next.length} var`);
  }
  return survey.meetings.map((expectedRate, i) => ({ meeting: next[i], expectedRate }));
}
