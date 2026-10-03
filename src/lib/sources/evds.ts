import type { RateObservation } from "./ecb-rates";

/**
 * TCMB EVDS veri servisi (EVDS3).
 *
 * EVDS 2025'te evds2'den evds3'e taşındı; eski `evds2.../service/evds`
 * adresi artık 302 ile giriş sayfasına yönleniyor. Anahtar sorgu dizesinde
 * değil `key` başlığında gider.
 *
 * Anahtar: https://evds3.tcmb.gov.tr (profil → API anahtarı), EVDS_API_KEY.
 */
const BASE = "https://evds3.tcmb.gov.tr/igmevdsms-dis";

/**
 * Bir hafta vadeli repo ihale faiz oranı — politika faizi.
 * Doğrulama (3 Ekim 2026): seri bilinen kararlarla birebir örtüşüyor
 * (21.03.2024 → 50, 26.12.2024 → 47,5, 17.04.2025 ara toplantı → 46,
 * 22.01.2026 → 37). Değişiklik karar gününün kendisinde görünür. Seri
 * Aralık 2022'den öncesini içermiyor.
 */
export const TCMB_POLICY_RATE = "TP.PY.P02.1H";

export const TCMB_RATES_PAGE_URL =
  "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Temel+Faaliyetler/Para+Politikasi/Merkez+Bankasi+Faiz+Oranlari/1+Hafta+Repo";

export async function fetchEvdsSeries(
  code: string,
  start: string,
  apiKey: string,
): Promise<RateObservation[]> {
  const url =
    `${BASE}/series=${code}&startDate=${toEvdsDate(start)}` +
    `&endDate=${toEvdsDate(new Date().toISOString().slice(0, 10))}&type=json`;

  for (let attempt = 1; ; attempt++) {
    let status: number | undefined;
    try {
      const res = await fetch(url, {
        headers: { key: apiKey, accept: "application/json" },
        signal: AbortSignal.timeout(60_000),
      });
      if (res.ok) return parseEvds(await res.json(), code);
      status = res.status;
    } catch (err) {
      if (attempt >= 3) throw err;
    }
    if (status !== undefined && (status < 500 || attempt >= 3)) {
      throw new Error(`EVDS → HTTP ${status}`);
    }
    await new Promise((r) => setTimeout(r, 5_000 * attempt));
  }
}

/**
 * Yanıt `{ items: [{ Tarih: "dd-mm-yyyy", "TP_PY_P02_1H": "37.00000000" }] }`
 * biçimindedir; alan adı seri kodundaki noktaların alt çizgiye dönmüş halidir.
 * Tatil ve hafta sonları null gelir, atlanır.
 */
export function parseEvds(json: unknown, code: string): RateObservation[] {
  const items = (json as { items?: Record<string, unknown>[] }).items;
  if (!Array.isArray(items)) throw new Error("EVDS: beklenmeyen yanıt biçimi");

  const field = code.replace(/\./g, "_");
  const out: RateObservation[] = [];
  for (const item of items) {
    const raw = item[field];
    const m = String(item.Tarih ?? "").match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (raw == null || !m) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) out.push({ date: `${m[3]}-${m[2]}-${m[1]}`, value });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** YYYY-MM-DD → dd-mm-yyyy */
function toEvdsDate(iso: string): string {
  const [y, mo, d] = iso.split("-");
  return `${d}-${mo}-${y}`;
}
