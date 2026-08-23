export const TRT = "Europe/Istanbul";

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TRT,
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateShortFmt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TRT,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TRT,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const weekdayFmt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TRT,
  weekday: "long",
});

/** "14 Eylül 2026" */
export function formatDateTr(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** "14 Eyl 2026" */
export function formatDateShortTr(iso: string): string {
  return dateShortFmt.format(new Date(iso));
}

/** "21:00" — her zaman Türkiye saati. */
export function formatTimeTrt(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** "Pazartesi" */
export function formatWeekdayTr(iso: string): string {
  return weekdayFmt.format(new Date(iso));
}

/**
 * Toplantı anını tek satırda sunar. Saat açıklanmamışsa saat kısmı düşer.
 * "14 Eylül 2026, Pazartesi · 21:00 TRT"
 */
export function formatMeetingTr(iso: string, timeTbd: boolean): string {
  const base = `${formatDateTr(iso)}, ${formatWeekdayTr(iso)}`;
  return timeTbd ? `${base} · saat açıklanmadı` : `${base} · ${formatTimeTrt(iso)} TRT`;
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

/** "3 gün kaldı" / "Bugün" / "Yarın" / "2 gün önce" */
export function countdownLabelTr(iso: string, now: Date = new Date()): string {
  const d = daysUntil(iso, now);
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

/** "Eylül 2026" — takvimde ay başlıkları için. */
export function trtMonthLabel(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TRT,
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
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
