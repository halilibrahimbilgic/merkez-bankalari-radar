import { BANKS, bankName } from "./banks";
import { localePath, type Lang } from "./i18n";
import { SITE_URL } from "./site";
import type { BankCode, Meeting } from "./types";

/**
 * Takvime ekleme bağlantıları. Abonelik bütün toplantıları getirir; çoğu
 * okur yalnızca sıradaki kararı istiyor, o yüzden toplantının yanında tek
 * etkinlik de sunulur (Google Takvim ya da .ics).
 */

/** Toplantı günü, bankanın kendi saat diliminde ("2026-10-30"). */
export function meetingDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

const basic = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * Google Takvim'in etkinlik oluşturma adresi: bir saatlik blok; saati
 * duyurulmayan kararda (BoJ) tüm gün — aboneliktekiyle aynı mantık.
 */
export function googleCalendarUrl(m: Meeting, lang: Lang): string {
  const bank = BANKS[m.bankCode];
  let dates: string;
  if (m.timeTbd) {
    const day = meetingDay(m.meetingAt, bank.timezone);
    const next = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    dates = `${day.replace(/-/g, "")}/${next.replace(/-/g, "")}`;
  } else {
    const start = new Date(m.meetingAt);
    dates = `${basic(start.toISOString())}/${basic(new Date(start.getTime() + 3600_000).toISOString())}`;
  }
  const name = bankName(bank, lang);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: lang === "en" ? `${name} rate decision` : `${name} faiz kararı`,
    dates,
    details: `${SITE_URL}${localePath(lang, `/banka/${m.bankCode}`)}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Tek toplantının .ics dosyası. UID abonelikteki ile aynı: ikisi birden eklenirse takvim tek etkinlik gösterir. */
export function meetingIcsHref(m: Meeting): string {
  return `/takvim/takvim.ics?toplanti=${encodeURIComponent(m.id)}`;
}

/**
 * Takvim aboneliği (webcal): indirilen dosyadan farklı olarak takvim
 * uygulamasınca düzenli yenilenir, ertelenen ya da yeni eklenen toplantılar
 * kendiliğinden düşer.
 */
export function subscribeHref(bankCode?: BankCode): string {
  const path = bankCode ? `/takvim/takvim.ics?banka=${bankCode}` : "/takvim/takvim.ics";
  return `${SITE_URL.replace(/^https?:/, "webcal:")}${path}`;
}
