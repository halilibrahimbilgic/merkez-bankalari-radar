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
  /** Fed için hedef aralığın üst sınırı; tek oranlı bankalarda oranın kendisi. */
  decisionRate?: number;
  /** Yalnızca aralık ilan eden bankalarda (Fed) dolu. */
  decisionRateLower?: number;
  previousRate?: number;
  decisionNoteTr?: string;
  sourceUrl?: string;
}

export type ScoredVia = "api" | "session" | "claude-code";

export interface Speech {
  id: string;
  bankCode: BankCode;
  speakerName: string;
  speakerRoleTr?: string;
  title: string;
  /** YYYY-MM-DD */
  speechDate: string;
  sourceUrl: string;
  /** Skorlamaya girdi olan tam metin; arayüzde gösterilmez. */
  rawText?: string;
  summaryTr?: string;
  /** -10 (çok güvercin) .. +10 (çok şahin) */
  hawkDoveScore?: number;
  /**
   * Konuşma para politikası duruşuna dair sinyal taşıyor mu?
   * Düzenleme/denetim konuşmaları 0 puan alır ama bu "nötr duruş" değildir —
   * banka ortalamalarına katılmazlar.
   */
  hasPolicySignal?: boolean;
  scoreRationaleTr?: string;
  model?: string;
  /** Skorun hangi prompt sürümüyle üretildiği — karşılaştırılabilirlik için. */
  promptVersion?: string;
  scoredAt?: string;
  /**
   * Skorun nasıl üretildiği. "api" = score:speeches script'i,
   * "session" = Claude Code oturumunda elle üretildi (API kredisi yokken),
   * "claude-code" = günlük cron'da Claude aboneliğiyle (claude-code-action).
   */
  scoredVia?: ScoredVia;
  /** BIS bazı konuşmaların yalnızca girişini HTML'de yayımlar; tam metin PDF'tedir. */
  textIsExcerpt?: boolean;
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
