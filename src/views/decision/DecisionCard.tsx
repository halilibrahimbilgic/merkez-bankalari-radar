import Link from "next/link";
import { Card, Stat } from "@/components/ui";
import { BANKS, bankRateName } from "@/lib/banks";
import { type DecisionView } from "@/lib/data/decisions";
import { formatDecisionRate, formatPreviousRate } from "@/lib/decision-format";
import { fmtBp, fmtPercent, L, localePath, type Lang } from "@/lib/i18n";
import { periodSentence, type DivergencePeriod } from "@/lib/tcmb-funding";

export function DecisionCard({
  view,
  lang,
  funding,
}: {
  view: DecisionView;
  lang: Lang;
  funding?: { periods: DivergencePeriod[]; onDay?: number };
}) {
  const t = L(lang);
  const m = view.meeting;
  const bp = view.changeBp ?? 0;
  return (
    <Card>
      <h2 className="text-lg font-semibold">{t("Karar", "Decision")}</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {m.previousRate !== undefined && (
          <Stat compact label={t("Önceki oran", "Previous rate")} value={formatPreviousRate(m, lang)} />
        )}
        <Stat compact label={t("Yeni oran", "New rate")} value={formatDecisionRate(m, lang)} />
        <Stat
          compact
          label={t("Değişim", "Change")}
          value={bp === 0 ? t("yok", "none") : fmtBp(bp)}
          tone={bp > 0 ? "text-hawk" : bp < 0 ? "text-dove" : "text-foreground"}
        />
      </div>
      <p className="mt-3 text-sm text-muted">{bankRateName(BANKS[m.bankCode], lang)}</p>
      {funding && (
        <div className="mt-3 border-t border-border pt-3 text-sm">
          <p className="font-medium">{t("Fiilî fonlama", "Effective funding")}</p>
          <div className="prose-width mt-1 space-y-1 text-muted">
            {funding.onDay !== undefined && (
              <p className="tabular">
                {t(
                  `Karar günü bankaların fiilen ödediği ortalama faiz ${fmtPercent(funding.onDay, lang)}.`,
                  `On the decision day, banks were paying ${fmtPercent(funding.onDay, lang)} on average.`,
                )}
              </p>
            )}
            {funding.periods.map((p) => (
              <p key={p.start}>{periodSentence(p, lang)}</p>
            ))}
            <p>
              {t(
                "Bu fark politika faizi değiştirilmeden oluştu; yukarıdaki oranlar yalnızca politika faizini gösterir. ",
                "This gap arose without a change in the policy rate; the rates above show the policy rate only. ",
              )}
              <Link href={`${localePath(lang, "/banka/tcmb")}#fiili-fonlama`} className="text-accent hover:underline">
                {t("Ayrıntı", "Details")}
              </Link>
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
