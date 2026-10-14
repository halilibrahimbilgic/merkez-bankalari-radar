"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { countdownLabel } from "@/lib/time";

/**
 * Geri sayım sunucuda da render edilir (SEO + JS'siz görünüm); istemcide
 * mount sonrası tazelenir. Toplantıya 48 saatten az kaldıysa saat:dakika
 * hassasiyetine geçer.
 */
export function Countdown({
  meetingAt,
  initialLabel,
  lang,
}: {
  meetingAt: string;
  initialLabel: string;
  lang: Lang;
}) {
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    const tick = () => setLabel(liveLabel(meetingAt, lang));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [meetingAt, lang]);

  return <span className="tabular">{label}</span>;
}

function liveLabel(meetingAt: string, lang: Lang): string {
  const diffMs = new Date(meetingAt).getTime() - Date.now();
  // Yalnızca saati belli toplantılarda kullanılır; saat geçtiyse karar açıklanmıştır.
  if (diffMs <= 0) return lang === "en" ? "decision announced" : "karar açıklandı";
  if (diffMs > 48 * 3600_000) return countdownLabel(meetingAt, undefined, lang);

  const hours = Math.floor(diffMs / 3600_000);
  const minutes = Math.floor((diffMs % 3600_000) / 60_000);
  if (lang === "en") return hours === 0 ? `${minutes} min left` : `${hours} h ${minutes} min left`;
  return hours === 0 ? `${minutes} dk kaldı` : `${hours} sa ${minutes} dk kaldı`;
}
