"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { computeCountdownParts, type CountdownParts } from "@/lib/time";

/**
 * Bölmeli geri sayım (gün / saat / dakika) — bu kategorinin yerleşik gösterimi.
 *
 * Sunucuda hesaplanan değer prop olarak gelir ve ilk istemci render'ında
 * aynısı kullanılır; böylece hidrasyon uyuşmazlığı olmaz. Sayaç mount
 * sonrasında çalışmaya başlar.
 */
export function LiveCountdown({
  meetingAt,
  initial,
  lang,
}: {
  meetingAt: string;
  initial: CountdownParts;
  lang: Lang;
}) {
  const en = lang === "en";
  const [parts, setParts] = useState(initial);

  useEffect(() => {
    const tick = () => setParts(computeCountdownParts(meetingAt));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [meetingAt]);

  // Sayfa karar saatinden önce üretilmiş olabilir (ISR); saat geçince sonuç
  // birkaç dakikadan yarım saate kadar gecikmeyle gelir.
  if (parts.past) {
    return (
      <p className="text-sm font-medium">
        {en ? "Decision announced: the result will be here shortly." : "Karar açıklandı: sonuç kısa süre içinde burada."}
      </p>
    );
  }

  return (
    <div className="flex gap-2" aria-label={en ? "Time until the meeting" : "Toplantıya kalan süre"}>
      <Segment value={parts.days} label={en ? "days" : "gün"} />
      <Segment value={parts.hours} label={en ? "hrs" : "saat"} />
      <Segment value={parts.minutes} label={en ? "min" : "dk"} />
    </div>
  );
}

function Segment({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-14 flex-col items-center rounded-md border border-border bg-background px-2 py-1.5">
      <span className="tabular text-xl font-semibold leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[11px] uppercase tracking-wide text-muted">
        {label}
      </span>
    </div>
  );
}
