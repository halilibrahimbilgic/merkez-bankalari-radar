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
    // RBA takvimi aralıkları "2&ndash;3 February" diye yazıyor.
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/**
 * Bir oran serisinde son değerin yürürlüğe girdiği gün.
 *
 * Güncel faizin asOf'u son gözlem günü olsaydı her gün değişir, dosyayı her
 * gün farklılaştırıp boş commit ve gereksiz dağıtım üretirdi. "Şu tarihten
 * beri" hem sabit hem de okuyucu için daha bilgilendirici. Seri penceresi
 * içinde hiç değişiklik yoksa pencerenin ilk günü döner (en azından o günden
 * beri) — pencere bu yüzden geniş tutulur.
 */
export function effectiveSince(obs: { date: string; value: number }[]): string | undefined {
  if (obs.length === 0) return undefined;
  let i = obs.length - 1;
  while (i > 0 && obs[i - 1].value === obs[i].value) i--;
  return obs[i].date;
}
