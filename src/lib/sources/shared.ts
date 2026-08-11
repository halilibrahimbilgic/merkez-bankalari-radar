import type { BankCode, MeetingType } from "../types";

/** Kaynaklardan çıkan ham toplantı kaydı — henüz veritabanı kimliği yok. */
export interface ScrapedMeeting {
  bankCode: BankCode;
  /** UTC ISO-8601 */
  meetingAt: string;
  timeTbd: boolean;
  type: MeetingType;
  sourceUrl: string;
}

const UA =
  "Mozilla/5.0 (compatible; MerkezBankalariRadar/0.1; +https://github.com/) Node";

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`${url} → HTTP ${res.status}`);
  }
  return res.text();
}

/** Etiketleri söküp metin içeriğini döndürür. */
export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}
