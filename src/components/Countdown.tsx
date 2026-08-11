"use client";

import { useEffect, useState } from "react";
import { countdownLabelTr } from "@/lib/time";

/**
 * Geri sayım sunucuda da render edilir (SEO + JS'siz görünüm); istemcide
 * mount sonrası tazelenir. Toplantıya 48 saatten az kaldıysa saat:dakika
 * hassasiyetine geçer.
 */
export function Countdown({
  meetingAt,
  initialLabel,
}: {
  meetingAt: string;
  initialLabel: string;
}) {
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    const tick = () => setLabel(liveLabel(meetingAt));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [meetingAt]);

  return <span className="tabular">{label}</span>;
}

function liveLabel(meetingAt: string): string {
  const diffMs = new Date(meetingAt).getTime() - Date.now();
  if (diffMs <= 0) return countdownLabelTr(meetingAt);
  if (diffMs > 48 * 3600_000) return countdownLabelTr(meetingAt);

  const hours = Math.floor(diffMs / 3600_000);
  const minutes = Math.floor((diffMs % 3600_000) / 60_000);
  if (hours === 0) return `${minutes} dk kaldı`;
  return `${hours} sa ${minutes} dk kaldı`;
}
