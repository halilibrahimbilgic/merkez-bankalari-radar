import { BANKS, bankColorVar } from "@/lib/banks";
import type { BankCode } from "@/lib/types";

/** Skorun rengi ve etiketi — ölçek her yerde aynı okunsun diye tek yerde. */
export function scoreToneClass(score: number): string {
  if (score >= 3) return "text-hawk";
  if (score <= -3) return "text-dove";
  return "text-muted";
}

export function scoreLabelTr(score: number): string {
  if (score >= 7) return "çok şahin";
  if (score >= 3) return "şahin";
  if (score >= 1) return "hafif şahin";
  if (score > -1) return "nötr";
  if (score > -3) return "hafif güvercin";
  if (score > -7) return "güvercin";
  return "çok güvercin";
}

export function formatScore(score: number): string {
  const s = score.toFixed(1).replace(".", ",");
  return score > 0 ? `+${s}` : s;
}

export function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined) {
    return (
      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
        skorlanmadı
      </span>
    );
  }
  return (
    <span className={`tabular font-semibold ${scoreToneClass(score)}`}>
      {formatScore(score)}{" "}
      <span className="text-xs font-normal">({scoreLabelTr(score)})</span>
    </span>
  );
}

/**
 * Banka etiketi: kimlik rengi bir nokta olarak, ad her zaman metin olarak.
 * Renk tek başına anlam taşımaz — noktayı ayırt edemeyen okuyucu için ad
 * yeterlidir.
 */
export function BankTag({ code }: { code: BankCode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-border px-1.5 py-0.5 text-xs font-medium">
      <span
        aria-hidden
        className="inline-block size-2 shrink-0 rounded-full"
        style={{ backgroundColor: bankColorVar(code) }}
      />
      {BANKS[code].nameTr}
    </span>
  );
}
