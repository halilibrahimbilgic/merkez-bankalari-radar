import type { BankCode, CentralBank } from "./types";

/**
 * Banka meta verisi kodda sabit tutulur: nadiren değişir, her sayfada gerekir
 * ve veritabanı olmadan da arayüzün çalışmasını sağlar.
 */
export const BANKS: Record<BankCode, CentralBank> = {
  fed: {
    code: "fed",
    nameTr: "Fed",
    nameEn: "Federal Reserve",
    countryTr: "ABD",
    timezone: "America/New_York",
    rateNameTr: "Fed Funds hedef aralığı",
    websiteUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    sortOrder: 10,
  },
  ecb: {
    code: "ecb",
    nameTr: "ECB",
    nameEn: "European Central Bank",
    countryTr: "Euro Bölgesi",
    timezone: "Europe/Berlin",
    rateNameTr: "Mevduat kolaylığı faizi",
    websiteUrl: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html",
    sortOrder: 20,
  },
  tcmb: {
    code: "tcmb",
    nameTr: "TCMB",
    nameEn: "Central Bank of the Republic of Türkiye",
    countryTr: "Türkiye",
    timezone: "Europe/Istanbul",
    rateNameTr: "1 hafta vadeli repo (politika) faizi",
    websiteUrl: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Duyuru+Takvimi",
    sortOrder: 30,
  },
  boe: {
    code: "boe",
    nameTr: "BoE",
    nameEn: "Bank of England",
    countryTr: "Birleşik Krallık",
    timezone: "Europe/London",
    rateNameTr: "Banka faizi (Bank Rate)",
    websiteUrl: "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates",
    sortOrder: 40,
  },
  boj: {
    code: "boj",
    nameTr: "BoJ",
    nameEn: "Bank of Japan",
    countryTr: "Japonya",
    timezone: "Asia/Tokyo",
    rateNameTr: "Kısa vadeli politika faizi",
    websiteUrl: "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm",
    sortOrder: 50,
  },
  rba: {
    code: "rba",
    nameTr: "RBA",
    nameEn: "Reserve Bank of Australia",
    countryTr: "Avustralya",
    timezone: "Australia/Sydney",
    rateNameTr: "Nakit faiz oranı (Cash Rate)",
    websiteUrl: "https://www.rba.gov.au/schedules-events/",
    sortOrder: 60,
  },
};

/** MVP'de canlı olan bankalar (plan: Faz 1 → Fed, ECB, TCMB). */
export const MVP_BANK_CODES: BankCode[] = ["fed", "ecb", "tcmb"];

export const ALL_BANKS: CentralBank[] = Object.values(BANKS).sort(
  (a, b) => a.sortOrder - b.sortOrder,
);

export function getBank(code: string): CentralBank | undefined {
  return BANKS[code as BankCode];
}

export function isBankCode(code: string): code is BankCode {
  return code in BANKS;
}
