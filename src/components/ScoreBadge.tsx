import { BANKS, bankColorVar, bankName } from "@/lib/banks";
import { fmtNum, type Lang } from "@/lib/i18n";
import type { BankCode } from "@/lib/types";

/** Skorun rengi ve etiketi — ölçek her yerde aynı okunsun diye tek yerde. */
export function scoreToneClass(score: number): string {
  if (score >= 3) return "text-hawk";
  if (score <= -3) return "text-dove";
  return "text-muted";
}

export function scoreLabel(score: number, lang: Lang = "tr"): string {
  const en = lang === "en";
  if (score >= 7) return en ? "very hawkish" : "çok şahin";
  if (score >= 3) return en ? "hawkish" : "şahin";
  if (score >= 1) return en ? "slightly hawkish" : "hafif şahin";
  if (score > -1) return en ? "neutral" : "nötr";
  if (score > -3) return en ? "slightly dovish" : "hafif güvercin";
  if (score > -7) return en ? "dovish" : "güvercin";
  return en ? "very dovish" : "çok güvercin";
}

export function formatScore(score: number, lang: Lang = "tr"): string {
  const s = fmtNum(score, lang, 1);
  return score > 0 ? `+${s}` : s;
}

/** İki puanın farkı, işaretli: "+1,5", "−0,5", "±0,0". */
export function formatScoreDelta(score: number, previous: number, lang: Lang = "tr"): string {
  const d = Math.round((score - previous) * 10) / 10;
  return `${d > 0 ? "+" : d < 0 ? "−" : "±"}${fmtNum(Math.abs(d), lang, 1)}`;
}

/** İki puan arasındaki yön, sade dille. Yarım puandan küçük fark gürültüdür (skorlar ±1 oynayabiliyor). */
export function scoreShift(score: number, previous: number, lang: Lang = "tr"): string {
  const en = lang === "en";
  const d = score - previous;
  if (Math.abs(d) < 0.5) return en ? "about the same" : "aynı kaldı";
  const more = d > 0 ? (en ? "more hawkish" : "daha şahin") : en ? "more dovish" : "daha güvercin";
  return Math.abs(d) < 2 ? (en ? `slightly ${more}` : `biraz ${more}`) : more;
}

/**
 * Konuşma skoru rozeti. Sinyalsiz konuşmanın 0'ı "nötr" diye gösterilmez:
 * listede "0,0 (nötr)" okuyan kullanıcı onu dengeli bir duruş — ya da
 * skorlanmamış bir kayıt — sanıyordu. Ortalamaya da katılmaz
 * (ARCHITECTURE.md §4).
 */
export function ScoreBadge({
  score,
  hasPolicySignal,
  lang = "tr",
}: {
  score?: number;
  hasPolicySignal?: boolean;
  lang?: Lang;
}) {
  if (score === undefined) {
    return <Pill>{lang === "en" ? "not scored yet" : "skorlanmadı"}</Pill>;
  }
  if (hasPolicySignal === false) {
    return (
      <Pill
        title={
          lang === "en"
            ? "This speech does not address the monetary policy stance; it is not included in the average."
            : "Konuşma para politikası duruşuna değinmiyor; ortalamaya katılmaz."
        }
      >
        {lang === "en" ? "no policy signal" : "politika sinyali yok"}
      </Pill>
    );
  }
  return (
    <span className={`tabular font-semibold ${scoreToneClass(score)}`}>
      {formatScore(score, lang)}{" "}
      <span className="text-xs font-normal">({scoreLabel(score, lang)})</span>
    </span>
  );
}

function Pill({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-xs text-muted"
    >
      {children}
    </span>
  );
}

/**
 * Banka etiketi: kimlik rengi bir nokta olarak, ad her zaman metin olarak.
 * Renk tek başına anlam taşımaz — noktayı ayırt edemeyen okuyucu için ad
 * yeterlidir.
 */
export function BankTag({ code, lang = "tr" }: { code: BankCode; lang?: Lang }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-border px-1.5 py-0.5 text-xs font-medium">
      <span
        aria-hidden
        className="inline-block size-2 shrink-0 rounded-full"
        style={{ backgroundColor: bankColorVar(code) }}
      />
      {bankName(BANKS[code], lang)}
    </span>
  );
}
