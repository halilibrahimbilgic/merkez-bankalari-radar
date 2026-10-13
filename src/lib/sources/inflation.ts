import type { BankCode } from "../types";
import { fetchEvdsJson } from "./evds";
import { fetchSeries } from "./fred";
import { fetchText, UA } from "./shared";
import { openWorkbook, readCells } from "./xlsx";

/**
 * Altı ekonominin son yıllık TÜFE enflasyonu — reel faiz tablosu için.
 * Her ülke için resmî istatistik kurumunun ölçüsü, mümkünse kendi kaynağından
 * (13 Ekim 2026'da doğrulandı):
 *
 *   ABD        CPI-U, mevsimsellikten arındırılmamış (BLS → FRED CPIAUCNS, yıllık %)
 *   Euro Bölg. HICP (ECB Data Portal; eski ICP veri seti Aralık 2025'te
 *              durduruldu, yerine HICP geldi). Son ay çoğunlukla öncü tahmindir.
 *   Türkiye    TÜFE 2025=100 (TÜİK → EVDS, yıllık % — TÜİK'in açıkladığı
 *              oranla 2025–2026'nın her ayında birebir aynı)
 *   İngiltere  CPI yıllık oran (ONS, D7G7)
 *   Japonya    TÜFE genel endeks (İstatistik Bürosu → e-Stat Tablo 1-1); yıllık
 *              değişim yayımlanan endeksten hesaplanır. OECD ve FRED'deki Japonya
 *              serileri 2021–2022'de kesildi.
 *   Avustralya Aylık TÜFE (ABS → RBA G4). ABS 2025 sonunda aylık TÜFE'yi
 *              manşet ölçü yaptı; çeyreklik seri artık yıllık değişim vermiyor.
 */

export interface InflationReading {
  bankCode: BankCode;
  /** Referans ay, "2026-09". */
  period: string;
  /** Yıllık % değişim. */
  yoy: number;
  /** Öncü tahmin (yalnızca euro bölgesi HICP). */
  flash?: boolean;
  sourceUrl: string;
}

/** Kaynak adı iki dilde — kurumun adı okurun dilinde yazılır. */
export const INFLATION_SOURCES: Record<BankCode, { tr: string; en: string; url: string }> = {
  fed: { tr: "BLS (FRED)", en: "BLS (FRED)", url: "https://fred.stlouisfed.org/series/CPIAUCNS" },
  ecb: { tr: "Eurostat (ECB Data Portal)", en: "Eurostat (ECB Data Portal)", url: "https://data.ecb.europa.eu/data/datasets/HICP" },
  tcmb: {
    tr: "TÜİK (EVDS)",
    en: "TurkStat (EVDS)",
    url: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Enflasyon+Verileri/Tuketici+Fiyatlari",
  },
  boe: { tr: "ONS", en: "ONS", url: "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23" },
  boj: {
    tr: "Japonya İstatistik Bürosu (e-Stat)",
    en: "Statistics Bureau of Japan (e-Stat)",
    url: "https://www.stat.go.jp/english/data/cpi/index.html",
  },
  rba: { tr: "ABS (RBA G4)", en: "ABS (RBA G4)", url: "https://www.rba.gov.au/statistics/tables/#prices-inflation" },
};

function reading(bankCode: BankCode, period: string, yoy: number, flash?: boolean): InflationReading {
  if (!/^\d{4}-\d{2}$/.test(period) || !Number.isFinite(yoy)) {
    throw new Error(`${bankCode}: geçersiz enflasyon okuması (${period}, ${yoy})`);
  }
  return {
    bankCode,
    period,
    yoy: Math.round(yoy * 100) / 100,
    ...(flash ? { flash } : {}),
    sourceUrl: INFLATION_SOURCES[bankCode].url,
  };
}

export async function fetchUsCpi(): Promise<InflationReading> {
  const start = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  const obs = await fetchSeries("CPIAUCNS", { start, units: "pc1" });
  const last = obs.at(-1);
  if (!last) throw new Error("FRED CPIAUCNS: gözlem yok");
  return reading("fed", last.date.slice(0, 7), last.value);
}

/** ECB Data Portal CSV: TIME_PERIOD, OBS_VALUE, OBS_STATUS (E = tahmin, öncü veri). */
export function parseHicpCsv(csv: string): { period: string; value: number; flash: boolean } {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const [t, v, s] = ["TIME_PERIOD", "OBS_VALUE", "OBS_STATUS"].map((c) => header.indexOf(c));
  if (t === -1 || v === -1) throw new Error("HICP CSV: TIME_PERIOD/OBS_VALUE yok");
  const rows = lines
    .slice(1)
    .map((l) => l.split(","))
    .filter((c) => /^\d{4}-\d{2}$/.test(c[t]) && c[v] !== "")
    .sort((a, b) => a[t].localeCompare(b[t]));
  const last = rows.at(-1);
  if (!last) throw new Error("HICP CSV: gözlem yok");
  return { period: last[t], value: Number(last[v]), flash: s !== -1 && last[s] === "E" };
}

export async function fetchEuroAreaHicp(): Promise<InflationReading> {
  // Tarayıcı türü Accept başlığına (fetchText) API 406 döndürüyor.
  const res = await fetch(
    "https://data-api.ecb.europa.eu/service/data/HICP/M.U2.N.000000.4D0.ANR?format=csvdata&lastNObservations=3",
    { headers: { "user-agent": UA, accept: "text/csv" }, signal: AbortSignal.timeout(60_000) },
  );
  if (!res.ok) throw new Error(`ECB HICP → HTTP ${res.status}`);
  const r = parseHicpCsv(await res.text());
  return reading("ecb", r.period, r.value, r.flash);
}

export async function fetchTurkeyCpi(apiKey: string): Promise<InflationReading> {
  const start = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  const json = (await fetchEvdsJson(["TP.TUKFIY2025.GENEL"], start, apiKey, 3)) as {
    items?: Record<string, unknown>[];
  };
  const items = (json.items ?? [])
    .map((it) => ({ m: String(it.Tarih ?? "").match(/^(\d{4})-(\d{1,2})$/), v: Number(it["TP_TUKFIY2025_GENEL-3"]) }))
    .filter((x) => x.m && Number.isFinite(x.v));
  const last = items.at(-1);
  if (!last?.m) throw new Error("EVDS TÜFE: dolu ay yok");
  return reading("tcmb", `${last.m[1]}-${last.m[2].padStart(2, "0")}`, last.v);
}

const EN_MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

/** ONS zaman serisi JSON'u: months: [{ date: "2026 AUG", value: "3.1" }]. */
export function parseOnsSeries(json: unknown): { period: string; value: number } {
  const months = (json as { months?: { date?: string; value?: string }[] }).months;
  if (!Array.isArray(months)) throw new Error("ONS: months alanı yok");
  for (const m of [...months].reverse()) {
    const d = m.date?.match(/^(\d{4}) ([A-Z]{3})$/);
    const v = Number(m.value);
    if (d && EN_MONTHS[d[2]] && m.value?.trim() && Number.isFinite(v)) return { period: `${d[1]}-${EN_MONTHS[d[2]]}`, value: v };
  }
  throw new Error("ONS: dolu ay yok");
}

export async function fetchUkCpi(): Promise<InflationReading> {
  const res = await fetch("https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23/data", {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`ONS → HTTP ${res.status}`);
  const r = parseOnsSeries(await res.json());
  return reading("boe", r.period, r.value);
}

/** RBA G4 CSV: tarih satırları "31/08/2026,…"; sütun "Series ID" satırındaki GCPIAGYPM. */
export function parseRbaG4(csv: string): { period: string; value: number } {
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/);
  const ids = lines.find((l) => l.startsWith("Series ID"))?.split(",");
  const col = ids?.indexOf("GCPIAGYPM") ?? -1;
  if (col === -1) throw new Error("RBA G4: GCPIAGYPM sütunu yok — biçim değişmiş olabilir");
  for (const line of [...lines].reverse()) {
    const c = line.split(",");
    const d = c[0]?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (d && c[col]?.trim() && Number.isFinite(Number(c[col]))) return { period: `${d[3]}-${d[2]}`, value: Number(c[col]) };
  }
  throw new Error("RBA G4: dolu ay yok");
}

export async function fetchAustraliaCpi(): Promise<InflationReading> {
  const r = parseRbaG4(await fetchText("https://www.rba.gov.au/statistics/tables/csv/g4-data.csv"));
  return reading("rba", r.period, r.value);
}

/**
 * Japonya: e-Stat'ta her ayın dosyaları ayrı bir sayfada. Liste sayfasından
 * en yeni ayın sayfası, oradan "Table 1-1 Subgroup Index for Japan" Excel'i
 * indirilir; genel endeks (I sütunu) sırasıyla aylardır. Yıllık değişim
 * yayımlanan (bir ondalıklı) endeksten hesaplanır — Bürounun yöntemiyle aynı.
 */
const ESTAT = "https://www.e-stat.go.jp";
const ESTAT_LIST =
  `${ESTAT}/en/stat-search/files?page=1&layout=datalist&toukei=00200573&tstat=000001243876&cycle=1&tclass1=000001243877&tclass2val=0`;

export async function fetchJapanCpi(): Promise<InflationReading> {
  const list = await fetchText(ESTAT_LIST);
  const months = [...list.matchAll(/href="(\/en\/stat-search\/files\?[^"]*?year=(\d+)&(?:amp;)?month=(\d+)[^"]*)"/g)]
    .map((m) => ({ href: m[1].replaceAll("&amp;", "&"), key: `${m[2]}${m[3]}` }))
    .sort((a, b) => b.key.localeCompare(a.key));
  if (months.length === 0) throw new Error("e-Stat: ay sayfası bağlantısı bulunamadı");
  const page = await fetchText(ESTAT + months[0].href);
  // Tablo numarası satırından sonraki ilk Excel bağlantısı.
  const at = page.search(/Subgroup Index for Japan/);
  const id = at === -1 ? undefined : page.slice(at).match(/file-download\?statInfId=(\d+)&(?:amp;)?fileKind=4/)?.[1];
  if (!id) throw new Error("e-Stat: Tablo 1-1 Excel bağlantısı bulunamadı");
  const res = await fetch(`${ESTAT}/en/stat-search/file-download?statInfId=${id}&fileKind=4`, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`e-Stat → HTTP ${res.status}`);
  const r = parseJapanCpiWorkbook(new Uint8Array(await res.arrayBuffer()));
  return reading("boj", r.period, r.yoy);
}

/** Sayfanın H sütunu "2025年 1月" ile yılı başlatır, sonraki satırlar yalnızca ay ("2  "). */
export function parseJapanCpiWorkbook(xlsx: Uint8Array): { period: string; yoy: number } {
  const wb = openWorkbook(xlsx);
  const rows = readCells(wb.sheet("am01-1"), wb.strings);
  const series: { period: string; value: number }[] = [];
  let year = 0;
  for (const r of rows) {
    const label = (r.H ?? "").trim();
    const value = Number(r.I);
    const ym = label.match(/^(\d{4})年\s*(\d{1,2})月/);
    const mOnly = label.match(/^(\d{1,2})$/);
    if (ym) year = Number(ym[1]);
    const month = ym ? Number(ym[2]) : mOnly && year ? Number(mOnly[1]) : 0;
    if (!month || !Number.isFinite(value) || !r.I) continue;
    series.push({ period: `${year}-${String(month).padStart(2, "0")}`, value });
  }
  const last = series.at(-1);
  const yearAgo = last && series.find((s) => s.period === `${Number(last.period.slice(0, 4)) - 1}${last.period.slice(4)}`);
  if (!last || !yearAgo) throw new Error("e-Stat: genel endeks serisi okunamadı");
  return { period: last.period, yoy: Math.round((last.value / yearAgo.value - 1) * 1000) / 10 };
}
