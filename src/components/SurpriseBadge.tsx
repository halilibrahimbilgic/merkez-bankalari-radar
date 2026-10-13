import type { SurpriseLabel } from "@/lib/expectation-history";
import { fmtBp, type Lang } from "@/lib/i18n";

/**
 * Kararın beklentiden farkı. Renk ikincil ipucu: etiket metni her zaman
 * yanında (WCAG 1.4.1). Şahin = beklenenden sıkı, güvercin = gevşek.
 */
export function surpriseText(label: SurpriseLabel, lang: Lang): string {
  const en = lang === "en";
  switch (label) {
    case "in-line":
      return en ? "in line with expectations" : "beklentiyle uyumlu";
    case "slightly-hawkish":
      return en ? "slightly more hawkish than expected" : "beklentiden biraz şahin";
    case "slightly-dovish":
      return en ? "slightly more dovish than expected" : "beklentiden biraz güvercin";
    case "hawkish":
      return en ? "hawkish surprise" : "şahin sürpriz";
    case "dovish":
      return en ? "dovish surprise" : "güvercin sürpriz";
  }
}

export function surpriseTone(label: SurpriseLabel): string {
  if (label === "hawkish" || label === "slightly-hawkish") return "text-hawk border-hawk/40";
  if (label === "dovish" || label === "slightly-dovish") return "text-dove border-dove/40";
  return "text-muted border-border";
}

export function SurpriseBadge({ label, bp, lang }: { label: SurpriseLabel; bp: number; lang: Lang }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${surpriseTone(label)}`}>
      {surpriseText(label, lang)}
      {bp !== 0 && <span className="tabular"> ({fmtBp(bp)})</span>}
    </span>
  );
}
