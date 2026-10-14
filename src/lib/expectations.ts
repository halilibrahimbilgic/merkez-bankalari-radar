import type { ImpliedMeeting } from "./implied-path";

/**
 * data/seed/expectations.json şeması — scripts/fetch-expectations.ts yazar,
 * src/lib/data/expectations.ts okur. İki tür beklenti var ve arayüzde
 * karıştırılmamalı: "survey" ekonomistlere sorulan bir ankettir, "market"
 * piyasa fiyatlarından türetilir.
 */
export interface SurveyExpectations {
  kind: "survey";
  /** Anket ayı, "2026-09". */
  period: string;
  sourceUrl: string;
  meetings: { meetingId: string; meetingAt: string; expectedRate: number }[];
  yearEnd?: number;
  months12?: number;
  /** 12 ay sonrası için beklenen yıllık TÜFE (%) — ileriye dönük reel faiz. */
  inflation12?: number;
}

export interface MarketExpectations {
  kind: "market";
  /** Eğrinin ait olduğu gün. */
  asOf: string;
  sourceUrl: string;
  /** Hesapta taban alınan güncel politika faizi. */
  currentRate: number;
  meetings: ImpliedMeeting[];
}

/** ECB analist anketi (SMA): toplantı başına DFR medyanı ve aralığı, ilk iki toplantı için olasılık. */
export interface EcbSurveyExpectations {
  kind: "survey";
  /** Sonuçların yayım günü. */
  publishedOn: string;
  sourceUrl: string;
  meetings: {
    meetingId: string;
    meetingAt: string;
    median: number;
    p25: number;
    p75: number;
    /** Analistlerin ortalama olasılığı (%) — yalnızca anketin ilk iki toplantısı. */
    odds?: { cut: number; hold: number; hike: number };
  }[];
}

export interface Expectations {
  fetchedAt: string;
  tcmb?: SurveyExpectations;
  boe?: MarketExpectations;
  ecb?: EcbSurveyExpectations;
}
