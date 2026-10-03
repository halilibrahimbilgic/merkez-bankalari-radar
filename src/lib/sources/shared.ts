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

/**
 * Ağ hatasında ve 5xx'te iki kez yeniden dener. BIS bağlantıyı ara sıra
 * sıfırlıyor; tek bir "fetch failed" günlük işin tamamını düşürüyordu.
 * 4xx yeniden denenmez — o kalıcı bir değişikliktir ve görünür olmalı.
 */
export async function fetchText(url: string, attempts = 3): Promise<string> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return res.text();
      const err = new Error(`${url} → HTTP ${res.status}`);
      if (res.status < 500 || i >= attempts) throw Object.assign(err, { final: true });
      throw err;
    } catch (err) {
      if ((err as { final?: boolean }).final || i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 2_000 * i));
    }
  }
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
