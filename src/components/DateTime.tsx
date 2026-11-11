import type { ReactNode } from "react";
import { trtDayKey } from "@/lib/time";

/**
 * Tarihi makine okunur yapar (<time dateTime>): ekran okuyucu ve arama
 * motoru tarihi metinden tahmin etmek zorunda kalmaz. Saati duyurulmayan
 * karar (timeTbd) yalnızca gün olarak işaretlenir — yer tutucu saat,
 * saat gibi sunulmaz.
 */
export function DateTime({ iso, timeTbd = false, children }: { iso: string; timeTbd?: boolean; children: ReactNode }) {
  return <time dateTime={timeTbd ? trtDayKey(iso) : iso}>{children}</time>;
}
