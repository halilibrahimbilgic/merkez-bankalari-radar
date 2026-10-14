import { INTL_LOCALE, type Lang } from "./i18n";

export const TRT = "Europe/Istanbul";

/**
 * Biçimlendiriciler dil başına bir kez kurulur (her çağrıda yeni Intl nesnesi
 * pahalı). Saat dilimi iki dilde de TRT: site Türkiye saatini gösterir,
 * İngilizce sürüm de "Turkey time" diye açıkça yazar.
 */
function perLang(options: Intl.DateTimeFormatOptions): Record<Lang, Intl.DateTimeFormat> {
  return {
    tr: new Intl.DateTimeFormat(INTL_LOCALE.tr, { timeZone: TRT, ...options }),
    en: new Intl.DateTimeFormat(INTL_LOCALE.en, { timeZone: TRT, ...options }),
  };
}

const dateFmt = perLang({ day: "2-digit", month: "long", year: "numeric" });
const dateShortFmt = perLang({ day: "2-digit", month: "short", year: "numeric" });
const weekdayFmt = perLang({ weekday: "long" });
const monthFmt = perLang({ month: "long", year: "numeric" });
const monthShortFmt = perLang({ month: "short" });

const timeFmt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TRT,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "14 Eylül 2026" / "14 September 2026" */
export function formatDate(iso: string, lang: Lang = "tr"): string {
  return dateFmt[lang].format(new Date(iso));
}

/** "14 Eyl 2026" / "14 Sept 2026" */
export function formatDateShort(iso: string, lang: Lang = "tr"): string {
  return dateShortFmt[lang].format(new Date(iso));
}

/** "21:00" — her zaman Türkiye saati, iki dilde de 24 saat. */
export function formatTimeTrt(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** "Pazartesi" / "Monday" */
export function formatWeekday(iso: string, lang: Lang = "tr"): string {
  return weekdayFmt[lang].format(new Date(iso));
}

/**
 * Toplantı anını tek satırda sunar. Saat açıklanmamışsa saat kısmı düşer.
 * "14 Eylül 2026, Pazartesi · 21:00 TRT"
 */
export function formatMeeting(iso: string, timeTbd: boolean, lang: Lang = "tr"): string {
  const base = `${formatDate(iso, lang)}, ${formatWeekday(iso, lang)}`;
  if (timeTbd) return `${base} · ${lang === "en" ? "time not announced" : "saat açıklanmadı"}`;
  return `${base} · ${formatTimeTrt(iso)} TRT`;
}

/** Aynı anın kaynak bankanın yerel saatindeki karşılığı: "14:00" */
export function formatTimeInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** TRT takvim gününe göre tam gün farkı. Bugün → 0, yarın → 1, dün → -1. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const a = trtMidnightUtcMs(now);
  const b = trtMidnightUtcMs(new Date(iso));
  return Math.round((b - a) / 86_400_000);
}

/** "3 gün kaldı" / "Bugün" / "Yarın" / "2 gün önce" — ve İngilizce karşılıkları. */
export function countdownLabel(iso: string, now: Date = new Date(), lang: Lang = "tr"): string {
  const d = daysUntil(iso, now);
  if (lang === "en") {
    if (d === 0) return "Today";
    if (d === 1) return "Tomorrow";
    if (d === -1) return "Yesterday";
    return d > 0 ? `in ${d} days` : `${Math.abs(d)} days ago`;
  }
  if (d === 0) return "Bugün";
  if (d === 1) return "Yarın";
  if (d === -1) return "Dün";
  return d > 0 ? `${d} gün kaldı` : `${Math.abs(d)} gün önce`;
}

/**
 * Verilen anın Türkiye saatiyle gece yarısını UTC ms olarak döndürür.
 * Gün farkını DST'den bağımsız saymak için kullanılır.
 */
function trtMidnightUtcMs(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TRT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return Date.parse(`${parts}T00:00:00Z`);
}

/** TRT takvim günü anahtarı: "2026-09-14" — gruplama için. */
export function trtDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TRT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** "Eylül 2026" / "September 2026" — takvimde ay başlıkları için. */
export function monthLabel(iso: string, lang: Lang = "tr"): string {
  return monthFmt[lang].format(new Date(iso));
}

/** "Eki" / "Oct" — dar tablo başlıkları için. */
export function monthShortLabel(iso: string, lang: Lang = "tr"): string {
  return monthShortFmt[lang].format(new Date(iso));
}

/** Bölmeli geri sayım parçaları — sunucu ve istemcide aynı hesap. */
export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  past: boolean;
}

export function computeCountdownParts(
  meetingAt: string,
  now: number = Date.now(),
): CountdownParts {
  const diff = new Date(meetingAt).getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, past: true };
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    past: false,
  };
}

/**
 * Geçmiş bir anı "3 saat önce" biçiminde anlatır.
 *
 * Veri tazeliği göstergesi için: mutlak zaman damgası ("29 Eylül 11:32")
 * okuyucuya verinin bayat olup olmadığını söylemiyor, kafadan çıkarma
 * gerektiriyor. Göreli ifade bunu doğrudan verir.
 */
export function relativeTime(iso: string, now: Date = new Date(), lang: Lang = "tr"): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const en = lang === "en";
  const unit = (n: number, tr: string, enOne: string) =>
    en ? `${n} ${enOne}${n === 1 ? "" : "s"} ago` : `${n} ${tr} önce`;

  if (minutes < 1) return en ? "just now" : "az önce";
  if (minutes < 60) return unit(minutes, "dakika", "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return unit(hours, "saat", "hour");

  const days = Math.floor(hours / 24);
  if (days === 1) return en ? "yesterday" : "dün";
  if (days < 30) return unit(days, "gün", "day");

  const months = Math.floor(days / 30);
  return months < 12 ? unit(months, "ay", "month") : unit(Math.floor(months / 12), "yıl", "year");
}
