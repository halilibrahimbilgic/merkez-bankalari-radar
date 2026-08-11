export type BankCode = "fed" | "ecb" | "tcmb" | "boe" | "boj" | "rba";

export interface CentralBank {
  code: BankCode;
  nameTr: string;
  nameEn: string;
  countryTr: string;
  timezone: string;
  rateNameTr: string;
  websiteUrl: string;
  sortOrder: number;
}

export type MeetingType = "rate_decision" | "minutes" | "projections";
export type MeetingStatus = "scheduled" | "done" | "cancelled";

export interface Meeting {
  id: string;
  bankCode: BankCode;
  /** Karar anı, UTC ISO-8601. Saat belli değilse gün başı + timeTbd=true. */
  meetingAt: string;
  timeTbd: boolean;
  type: MeetingType;
  status: MeetingStatus;
  decisionRate?: number;
  previousRate?: number;
  decisionNoteTr?: string;
  sourceUrl?: string;
}

export interface Speech {
  id: string;
  bankCode: BankCode;
  speakerName: string;
  speakerRoleTr?: string;
  title: string;
  /** YYYY-MM-DD */
  speechDate: string;
  sourceUrl: string;
  summaryTr?: string;
  /** -10 (çok güvercin) .. +10 (çok şahin) */
  hawkDoveScore?: number;
  scoreRationaleTr?: string;
  model?: string;
}

export interface RateProbability {
  bankCode: BankCode;
  meetingId: string;
  /** Baz puan: -50, -25, 0, 25 ... */
  scenarioBps: number;
  probabilityPct: number;
  calculatedAt: string;
  sourceNoteTr?: string;
}
