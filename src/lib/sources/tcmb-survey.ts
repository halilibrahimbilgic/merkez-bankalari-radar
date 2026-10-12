import { fetchEvdsJson } from "./evds";

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
} as const;

export interface TcmbSurvey {
  /** Anket ayı, "2026-09". */
  period: string;
  /** Sırasıyla anket ayından sonraki ilk üç PPK için beklenen politika faizi (%). */
  meetings: number[];
  yearEnd?: number;
  months12?: number;
}

export async function fetchTcmbSurvey(apiKey: string): Promise<TcmbSurvey> {
  const start = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  return parseTcmbSurvey(await fetchEvdsJson(Object.values(SERIES), start, apiKey));
}

/** Aylık yanıtta Tarih "2026-9" biçimindedir. En son dolu ay alınır. */
export function parseTcmbSurvey(json: unknown): TcmbSurvey {
  const items = (json as { items?: Record<string, unknown>[] }).items;
  if (!Array.isArray(items)) throw new Error("EVDS anket: beklenmeyen yanıt biçimi");
  const num = (item: Record<string, unknown>, code: string) => {
    const v = item[code.replace(/\./g, "_")];
    const n = v == null ? NaN : Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  for (const item of [...items].reverse()) {
    const m = String(item.Tarih ?? "").match(/^(\d{4})-(\d{1,2})$/);
    const first = num(item, SERIES.meeting1);
    if (!m || first === undefined) continue;
    const meetings = [first, num(item, SERIES.meeting2), num(item, SERIES.meeting3)].filter(
      (x): x is number => x !== undefined,
    );
    return {
      period: `${m[1]}-${m[2].padStart(2, "0")}`,
      meetings,
      yearEnd: num(item, SERIES.yearEnd),
      months12: num(item, SERIES.months12),
    };
  }
  throw new Error("EVDS anket: dolu ay bulunamadı");
}
