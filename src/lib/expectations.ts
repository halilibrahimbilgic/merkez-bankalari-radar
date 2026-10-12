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

export interface Expectations {
  fetchedAt: string;
  tcmb?: SurveyExpectations;
  boe?: MarketExpectations;
}
