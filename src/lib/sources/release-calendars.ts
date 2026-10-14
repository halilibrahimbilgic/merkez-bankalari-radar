import { zonedWallTimeToUtc } from "../tz";
import type { BankCode } from "../types";
import { decodeEntities, fetchText, UA } from "./shared";
import type { CalendarEvent } from "./speaking-calendars";

/**
 * Enflasyon (TÜFE) açıklama takvimleri — "Bu hafta" bölümü. Ekonomi, o
 * ekonominin merkez bankasının koduyla tutulur (fed = ABD …). Kaynaklar
 * 14 Ekim 2026'da doğrulandı:
 *
 *   ABD        FRED yayın tarihleri, release_id 10 (CPI); 08:30 New York
 *   Türkiye    TÜİK Ulusal Veri Yayımlama Takvimi JSON'u; saat kaynakta
 *   İngiltere  ONS zaman serisi JSON'unda "nextRelease"; 07:00 Londra
 *   Japonya    İstatistik Bürosu takvim tablosu; 08:30 Tokyo
 *   Avustralya ABS TÜFE sayfasındaki "Next Release" tarihleri; 11:30 Sidney
 *
 * Euro bölgesi yok: Eurostat'ın takvimi tarayıcıda JavaScript'le yükleniyor,
 * makinece okunur bir ucu bulunamadı.
 */

function cpiEvent(bankCode: BankCode, at: Date, url: string, period?: string): CalendarEvent {
  const iso = at.toISOString();
  return {
    id: `${bankCode}-cpi-${iso.slice(0, 10)}`,
    bankCode,
    at: iso,
    timeTbd: false,
    kind: "cpi",
    title: period ? `CPI ${period}` : "CPI",
    period,
    url,
  };
}

function wall(day: string, hour: number, minute: number, tz: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return zonedWallTimeToUtc(y, m, d, hour, minute, tz);
}

// ── ABD ──────────────────────────────────────────────────────────────────

export async function fetchUsCpiReleases(from: string, to: string): Promise<CalendarEvent[]> {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error("FRED_API_KEY yok");
  const url = new URL("https://api.stlouisfed.org/fred/release/dates");
  for (const [k, v] of Object.entries({
    release_id: "10",
    api_key: key,
    file_type: "json",
    include_release_dates_with_no_data: "true",
    realtime_start: from,
    sort_order: "asc",
    limit: "10",
  })) url.searchParams.set(k, v);
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`FRED yayın tarihleri → HTTP ${res.status}`);
  const json = (await res.json()) as { release_dates?: { date: string }[] };
  return (json.release_dates ?? [])
    .map((r) => r.date)
    .filter((d) => d >= from && d <= to)
    .map((d) => cpiEvent("fed", wall(d, 8, 30, "America/New_York"), "https://www.bls.gov/schedule/news_release/cpi.htm"));
}

// ── Türkiye ──────────────────────────────────────────────────────────────

/** TÜİK takvimi: yayindaOlmayanlarList → "Tüketici Fiyat Endeksi (TÜFE)", gTarih yerel saat. */
export function parseTuikCalendar(json: unknown, from: string, to: string): CalendarEvent[] {
  const list = (json as { yayindaOlmayanlarList?: { adi?: string; gTarih?: string; donemi?: string; dilId?: number }[] })
    .yayindaOlmayanlarList;
  if (!Array.isArray(list)) throw new Error("TÜİK takvimi: beklenmeyen yanıt biçimi");
  const out: CalendarEvent[] = [];
  for (const r of list) {
    if (r.dilId !== 1 || !/^Tüketici Fiyat Endeksi \(TÜFE\)$/.test(r.adi?.trim() ?? "")) continue;
    const m = r.gTarih?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
    if (!m || m[1] < from || m[1] > to) continue;
    out.push(
      cpiEvent("tcmb", wall(m[1], Number(m[2]), Number(m[3]), "Europe/Istanbul"), "https://www.tuik.gov.tr/Kurumsal/Veri_Takvimi", r.donemi),
    );
  }
  return out;
}

export async function fetchTrCpiReleases(from: string, to: string): Promise<CalendarEvent[]> {
  const years = [...new Set([from.slice(0, 4), to.slice(0, 4)])];
  const out: CalendarEvent[] = [];
  for (const y of years) {
    const res = await fetch(`https://www.tuik.gov.tr/Kurumsal/GetYillikHaberBulteniListesi?yil=${y}`, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`TÜİK takvimi → HTTP ${res.status}`);
    out.push(...parseTuikCalendar(await res.json(), from, to));
  }
  return out;
}

// ── İngiltere ────────────────────────────────────────────────────────────

const EN_MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** ONS: description.nextRelease = "21 October 2026". */
export function parseOnsNextRelease(json: unknown): string | undefined {
  const next = (json as { description?: { nextRelease?: string } }).description?.nextRelease;
  const m = next?.trim().match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  const month = m && EN_MONTHS[m[2].toLowerCase()];
  return m && month ? `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}` : undefined;
}

export async function fetchUkCpiReleases(from: string, to: string): Promise<CalendarEvent[]> {
  const res = await fetch("https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23/data", {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`ONS → HTTP ${res.status}`);
  const day = parseOnsNextRelease(await res.json());
  if (!day) throw new Error("ONS: nextRelease okunamadı");
  return day >= from && day <= to
    ? [cpiEvent("boe", wall(day, 7, 0, "Europe/London"), "https://www.ons.gov.uk/releasecalendar")]
    : [];
}

// ── Japonya ──────────────────────────────────────────────────────────────

/**
 * Takvim tablosu: satır = [Japonya anket ayı, yayım günü, Tokyo ayı, Tokyo
 * günü, not]. Yıl yalnızca ilk satırlarda yazılıyor ("January 23, 2026");
 * sonrası "February 20" — ay geriye dönünce yıl artar.
 */
export function parseJapanSchedule(html: string): string[] {
  const days: string[] = [];
  let year = 0;
  let lastMonth = 0;
  for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) =>
      decodeEntities(c[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(),
    );
    const m = cells[1]?.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
    const month = m && EN_MONTHS[m[1].toLowerCase()];
    if (!m || !month) continue;
    if (m[3]) year = Number(m[3]);
    else if (year && month < lastMonth) year++;
    if (!year) continue;
    lastMonth = month;
    days.push(`${year}-${String(month).padStart(2, "0")}-${m[2].padStart(2, "0")}`);
  }
  return days;
}

export async function fetchJpCpiReleases(from: string, to: string): Promise<CalendarEvent[]> {
  const days = parseJapanSchedule(await fetchText("https://www.stat.go.jp/english/data/cpi/1582.html"));
  if (days.length === 0) throw new Error("Japonya TÜFE takvimi okunamadı");
  return days
    .filter((d) => d >= from && d <= to)
    .map((d) => cpiEvent("boj", wall(d, 8, 30, "Asia/Tokyo"), "https://www.stat.go.jp/english/data/cpi/1582.html"));
}

// ── Avustralya ───────────────────────────────────────────────────────────

/** ABS TÜFE sayfası: "Next Release 28/10/2026" (birden çok gelecek tarih). */
export function parseAbsNextReleases(html: string): string[] {
  const text = decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  const days = [...text.matchAll(/Next Release (\d{1,2})\/(\d{2})\/(\d{4})/gi)].map(
    (m) => `${m[3]}-${m[2]}-${m[1].padStart(2, "0")}`,
  );
  return [...new Set(days)].sort();
}

export async function fetchAuCpiReleases(from: string, to: string): Promise<CalendarEvent[]> {
  const url = "https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release";
  const days = parseAbsNextReleases(await fetchText(url));
  if (days.length === 0) throw new Error("ABS: sonraki yayın tarihi okunamadı");
  return days.filter((d) => d >= from && d <= to).map((d) => cpiEvent("rba", wall(d, 11, 30, "Australia/Sydney"), url));
}
