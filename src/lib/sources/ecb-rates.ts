/**
 * ECB SDMX veri servisi — politika faizi geçmişi.
 *
 * Not: planda geçen `sdw-wsrest.ecb.europa.eu` host'u artık çözümlenmiyor;
 * güncel uç `data-api.ecb.europa.eu`. Kimlik doğrulama gerekmiyor.
 *
 * ECB'nin politika faizi mevduat kolaylığı oranıdır (DFR) — 2019'dan bu yana
 * para politikası duruşunu belirleyen oran budur.
 */

const BASE = "https://data-api.ecb.europa.eu/service/data";

/** Mevduat kolaylığı faizi, günlük seviye. */
export const DEPOSIT_FACILITY_KEY = "FM/D.U2.EUR.4F.KR.DFR.LEV";

export interface RateObservation {
  date: string; // YYYY-MM-DD
  value: number;
}

export async function fetchEcbRates(
  startPeriod: string,
): Promise<RateObservation[]> {
  const url = `${BASE}/${DEPOSIT_FACILITY_KEY}?format=csvdata&startPeriod=${startPeriod}`;
  // SDW aralıklı 504 veriyor (3 Ekim 2026'da iki cron koşusunda gözlendi);
  // 5xx ve ağ hatası birkaç kez yeniden denenir, 4xx denenmez.
  for (let attempt = 1; ; attempt++) {
    let status: number | undefined;
    try {
      const res = await fetch(url, {
        headers: { accept: "text/csv" },
        signal: AbortSignal.timeout(60_000),
      });
      if (res.ok) return parseEcbCsv(await res.text());
      status = res.status;
    } catch (err) {
      if (attempt >= 3) throw err;
    }
    if (status !== undefined && (status < 500 || attempt >= 3)) {
      throw new Error(`ECB SDW → HTTP ${status}`);
    }
    await new Promise((r) => setTimeout(r, 5_000 * attempt));
  }
}

/**
 * CSV'de 40 sütun var; bize yalnızca TIME_PERIOD ve OBS_VALUE lazım.
 * Sütun konumları başlık satırından okunur — ECB alan ekleyip çıkarabiliyor.
 */
export function parseEcbCsv(csv: string): RateObservation[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].split(",");
  const dateIdx = header.indexOf("TIME_PERIOD");
  const valueIdx = header.indexOf("OBS_VALUE");
  if (dateIdx === -1 || valueIdx === -1) {
    throw new Error("ECB CSV: TIME_PERIOD/OBS_VALUE sütunları bulunamadı");
  }

  const out: RateObservation[] = [];
  for (const line of lines.slice(1)) {
    // Aradığımız sütunlar tırnaklı metin alanlarından önce geldiği için
    // basit virgülle bölme yeterli.
    const cols = line.split(",");
    const date = cols[dateIdx];
    const value = Number(cols[valueIdx]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(value)) continue;
    out.push({ date, value });
  }
  return out;
}

/** Verilen tarihte (ya da öncesindeki en yakın gözlemde) geçerli oran. */
export function rateAsOf(obs: RateObservation[], date: string): number | undefined {
  let found: number | undefined;
  for (const o of obs) {
    if (o.date <= date) found = o.value;
    else break;
  }
  return found;
}
