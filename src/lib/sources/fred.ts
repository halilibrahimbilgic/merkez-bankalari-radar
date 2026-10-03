/**
 * FRED (St. Louis Fed) istemcisi.
 *
 * FRED'de Fed Funds *vadeli işlem* fiyatı YOKTUR — yalnızca gerçekleşmiş
 * faiz serileri bulunur. Bu yüzden burası faiz olasılığı değil, geçmiş
 * karar oranlarını doldurmak için kullanılır.
 */

const BASE = "https://api.stlouisfed.org/fred";

/** Fed hedef aralığının üst ve alt sınırı (günlük). */
export const SERIES = {
  targetUpper: "DFEDTARU",
  targetLower: "DFEDTARL",
  effective: "EFFR",
} as const;

export interface Observation {
  date: string; // YYYY-MM-DD
  value: number;
}

function apiKey(): string {
  const key = process.env.FRED_API_KEY;
  if (!key) {
    throw new Error(
      "FRED_API_KEY tanımlı değil. .env.local dosyasına ekleyin " +
        "(https://fred.stlouisfed.org/docs/api/api_key.html).",
    );
  }
  return key;
}

export async function fetchSeries(
  seriesId: string,
  opts: { start?: string; end?: string } = {},
): Promise<Observation[]> {
  const url = new URL(`${BASE}/series/observations`);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("file_type", "json");
  if (opts.start) url.searchParams.set("observation_start", opts.start);
  if (opts.end) url.searchParams.set("observation_end", opts.end);

  const res = await fetchWithRetry(url, seriesId);

  const json = (await res.json()) as {
    observations: { date: string; value: string }[];
  };

  // FRED eksik gözlemleri "." ile işaretler.
  return json.observations
    .filter((o) => o.value !== ".")
    .map((o) => ({ date: o.date, value: Number(o.value) }));
}

/**
 * FRED ara sıra 502 veriyor (3 Ekim 2026 cron'unda DFEDTARL). 5xx ve ağ
 * hatası yeniden denenir; 4xx (ör. geçersiz anahtar) denenmez.
 */
async function fetchWithRetry(url: URL, seriesId: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    let status: number | undefined;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (res.ok) return res;
      status = res.status;
    } catch (err) {
      if (attempt >= 3) throw err;
    }
    if (status !== undefined && (status < 500 || attempt >= 3)) {
      throw new Error(`FRED ${seriesId} → HTTP ${status}`);
    }
    await new Promise((r) => setTimeout(r, 5_000 * attempt));
  }
}

/** Verilen tarihte (ya da ondan önceki en yakın gözlemde) geçerli değer. */
export function valueAsOf(obs: Observation[], date: string): number | undefined {
  let found: number | undefined;
  for (const o of obs) {
    if (o.date <= date) found = o.value;
    else break;
  }
  return found;
}
