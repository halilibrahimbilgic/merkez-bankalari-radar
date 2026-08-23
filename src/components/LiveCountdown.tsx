"use client";

import { useEffect, useState } from "react";
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
}: {
  meetingAt: string;
  initial: CountdownParts;
}) {
  const [parts, setParts] = useState(initial);

  useEffect(() => {
    const tick = () => setParts(computeCountdownParts(meetingAt));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [meetingAt]);

  if (parts.past) {
    return <p className="text-sm text-muted">Karar açıklandı</p>;
  }

  return (
    <div className="flex gap-2" aria-label="Toplantıya kalan süre">
      <Segment value={parts.days} label="gün" />
      <Segment value={parts.hours} label="saat" />
      <Segment value={parts.minutes} label="dk" />
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
