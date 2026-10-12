import type { Lang } from "./i18n";
import type { BankCode, CentralBank } from "./types";

/**
 * Banka meta verisi kodda sabit tutulur: nadiren değişir, her sayfada gerekir
 * ve veritabanı olmadan da arayüzün çalışmasını sağlar.
 */
export const BANKS: Record<BankCode, CentralBank> = {
  fed: {
    code: "fed",
    nameTr: "Fed",
    shortEn: "Fed",
    fullTr: "Federal Rezerv",
    nameEn: "Federal Reserve",
    countryTr: "ABD",
    countryEn: "United States",
    timezone: "America/New_York",
    rateNameTr: "Fed Funds hedef aralığı",
    rateNameEn: "Fed funds target range",
    websiteUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    sortOrder: 10,
  },
  ecb: {
    code: "ecb",
    nameTr: "ECB",
    shortEn: "ECB",
    fullTr: "Avrupa Merkez Bankası",
    nameEn: "European Central Bank",
    countryTr: "Euro Bölgesi",
    countryEn: "Euro area",
    timezone: "Europe/Berlin",
    rateNameTr: "Mevduat kolaylığı faizi",
    rateNameEn: "Deposit facility rate",
    websiteUrl: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html",
    sortOrder: 20,
  },
  tcmb: {
    code: "tcmb",
    nameTr: "TCMB",
    shortEn: "CBRT",
    fullTr: "Türkiye Cumhuriyet Merkez Bankası",
    nameEn: "Central Bank of the Republic of Türkiye",
    countryTr: "Türkiye",
    countryEn: "Türkiye",
    timezone: "Europe/Istanbul",
    rateNameTr: "1 hafta vadeli repo (politika) faizi",
    rateNameEn: "One-week repo (policy) rate",
    websiteUrl: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Duyuru+Takvimi",
    sortOrder: 30,
  },
  boe: {
    code: "boe",
    nameTr: "BoE",
    shortEn: "BoE",
    fullTr: "İngiltere Merkez Bankası",
    nameEn: "Bank of England",
    countryTr: "Birleşik Krallık",
    countryEn: "United Kingdom",
    timezone: "Europe/London",
    rateNameTr: "Banka faizi (Bank Rate)",
    rateNameEn: "Bank Rate",
    websiteUrl: "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates",
    sortOrder: 40,
  },
  boj: {
    code: "boj",
    nameTr: "BoJ",
    shortEn: "BoJ",
    fullTr: "Japonya Merkez Bankası",
    nameEn: "Bank of Japan",
    countryTr: "Japonya",
    countryEn: "Japan",
    timezone: "Asia/Tokyo",
    rateNameTr: "Kısa vadeli politika faizi",
    rateNameEn: "Short-term policy interest rate",
    websiteUrl: "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm",
    sortOrder: 50,
  },
  rba: {
    code: "rba",
    nameTr: "RBA",
    shortEn: "RBA",
    fullTr: "Avustralya Merkez Bankası",
    nameEn: "Reserve Bank of Australia",
    countryTr: "Avustralya",
    countryEn: "Australia",
    timezone: "Australia/Sydney",
    rateNameTr: "Nakit faiz oranı (Cash Rate)",
    rateNameEn: "Cash rate target",
    websiteUrl: "https://www.rba.gov.au/schedules-events/",
    sortOrder: 60,
  },
};

/** Takvimi canlı olan bankalar — ana sayfa kartları. */
export const CALENDAR_BANK_CODES: BankCode[] = ["fed", "ecb", "tcmb", "boe", "boj", "rba"];

export const ALL_BANKS: CentralBank[] = Object.values(BANKS).sort(
  (a, b) => a.sortOrder - b.sortOrder,
);

/** Arayüz dilindeki kısa ad: "TCMB" / "CBRT". */
export function bankName(bank: CentralBank, lang: Lang): string {
  return lang === "en" ? bank.shortEn : bank.nameTr;
}

/** Tam resmî ad. */
export function bankFullName(bank: CentralBank, lang: Lang): string {
  return lang === "en" ? bank.nameEn : bank.fullTr;
}

export function bankCountry(bank: CentralBank, lang: Lang): string {
  return lang === "en" ? bank.countryEn : bank.countryTr;
}

export function bankRateName(bank: CentralBank, lang: Lang): string {
  return lang === "en" ? bank.rateNameEn : bank.rateNameTr;
}

export function getBank(code: string): CentralBank | undefined {
  return BANKS[code as BankCode];
}

export function isBankCode(code: string): code is BankCode {
  return code in BANKS;
}

/**
 * Bankanın kimlik rengi (CSS değişkeni).
 *
 * Renk yalnızca tarama hızını artıran ikincil bir ipucudur; banka adı
 * metni her zaman yanında bulunur. Tek başına anlam taşımaz.
 */
export function bankColorVar(code: BankCode): string {
  return `var(--bank-${code})`;
}
