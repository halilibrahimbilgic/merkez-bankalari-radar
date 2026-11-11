import { Term } from "@/components/Term";
import { TimeSeriesFigure } from "@/components/ChartFigures";
import { Stat } from "@/components/ui";
import { fmtNum, fmtPercent, fmtPercentRange, L, type Lang } from "@/lib/i18n";
import { formatDateShort } from "@/lib/time";
import { EVDS_URL } from "@/lib/sources/evds";
import { divergencePeriods, periodSentence, valueAt, type DivergencePeriod, type FundingNow, type TcmbFunding } from "@/lib/tcmb-funding";

/**
 * TCMB: politika faizi, fiilî fonlama (AOFM) ve faiz koridoru, son 12 ay.
 * Ayrışma olmasa da durur: okur iki oranın aynı olduğunu da görsün.
 */
export function FundingSection({
  funding,
  state,
  today,
  now,
  lang,
}: {
  funding: TcmbFunding;
  state: FundingNow;
  today: string;
  now: Date;
  lang: Lang;
}) {
  const t = L(lang);
  // Pencere /kararlar'daki faiz döngüsüyle aynı: on iki ay önceki ayın başı.
  const from = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const past = divergencePeriods(funding, today).filter((p): p is DivergencePeriod & { end: string } => !!p.end && p.end > from);
  const diff = Math.round((state.aofm - state.policy) * 100) / 100;

  // Günlük satırlar: kategorik x ekseni zamanı eşit aralıklı göstersin.
  const rows: Record<string, string | number | null>[] = [];
  for (let ms = Date.parse(`${from}T00:00:00Z`); ms <= Date.parse(`${today}T00:00:00Z`); ms += 86_400_000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    rows.push({
      label: formatDateShort(`${date}T12:00:00Z`, lang),
      lower: valueAt(funding.lower, date) ?? null,
      upper: valueAt(funding.upper, date) ?? null,
      aofm: valueAt(funding.aofm, date) ?? null,
      policy: valueAt(funding.policy, date) ?? null,
    });
  }

  return (
    <section aria-labelledby="fiili-fonlama" className="card p-5">
      <h2 id="fiili-fonlama" className="scroll-mt-4 text-lg font-semibold">
        {t("Fiilî fonlama ve faiz koridoru", "Effective funding and the rate corridor")}
      </h2>
      <p className="prose-width mt-1 text-sm text-muted">
        {t(
          "Politika faizi, TCMB'nin bir hafta vadeli repo ihalesindeki faizdir. Bankaların fiilen ödediği ortalama faiz ise ",
          "The policy rate is the rate at the CBRT's one-week repo auction. The rate banks actually pay on average is the ",
        )}
        <Term id="agirlikli-ortalama-fonlama-maliyeti-aofm" lang={lang}>
          {t("ağırlıklı ortalama fonlama maliyetidir (AOFM)", "weighted average cost of funding")}
        </Term>
        {t(
          ". TCMB ihaleye ara verip bankaları ",
          ". When the CBRT suspends the auction and funds banks at the top of the ",
        )}
        <Term id="faiz-koridoru" lang={lang}>
          {t("faiz koridorunun", "rate corridor")}
        </Term>
        {t(
          " üst bandından fonladığında AOFM politika faizinin üstüne çıkar: faiz değiştirilmeden yapılan bir sıkılaştırmadır.",
          ", the funding cost rises above the policy rate: tightening without a rate change.",
        )}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat compact label={t("Politika faizi", "Policy rate")} value={fmtPercent(state.policy, lang)} />
        <Stat
          compact
          label={t("Fiilî fonlama (AOFM)", "Average funding cost")}
          value={fmtPercent(state.aofm, lang)}
          note={
            diff === 0
              ? t("politika faiziyle aynı", "same as the policy rate")
              : t(
                  `politika faizinin ${fmtNum(Math.abs(diff), lang)} puan ${diff > 0 ? "üstünde" : "altında"}`,
                  `${fmtNum(Math.abs(diff), lang)} points ${diff > 0 ? "above" : "below"} the policy rate`,
                )
          }
        />
        {state.lower !== undefined && state.upper !== undefined && (
          <Stat
            compact
            label={t("Faiz koridoru", "Rate corridor")}
            value={fmtPercentRange(state.lower, state.upper, lang)}
            note={t("gecelik borç alma–verme", "overnight borrowing–lending")}
          />
        )}
      </div>

      {state.divergence && <p className="prose-width mt-3 text-sm font-medium">{periodSentence(state.divergence, lang, state)}</p>}
      {past.length > 0 && (
        <div className="prose-width mt-3 space-y-1 text-sm text-muted">
          <p className="font-medium text-foreground">{t("Son 12 ayda", "In the last 12 months")}</p>
          {past.map((p) => (
            <p key={p.start}>{periodSentence(p, lang)}</p>
          ))}
        </div>
      )}

      <div className="mt-4">
        <TimeSeriesFigure
          label={t("Politika faizi, fiilî fonlama maliyeti (AOFM) ve faiz koridoru", "Policy rate, average funding cost and the rate corridor")}
          data={rows}
          // Politika faizi en son çizilir: iki oran aynıyken AOFM onun altında kalır, ayrışınca görünür.
          series={[
            { key: "lower", name: t("Alt bant", "Lower band"), color: "var(--muted)", dashed: true },
            { key: "upper", name: t("Üst bant", "Upper band"), color: "var(--muted)", dashed: true },
            { key: "aofm", name: t("Fiilî fonlama (AOFM)", "Average funding cost"), color: "var(--series-2)" },
            { key: "policy", name: t("Politika faizi", "Policy rate"), color: "var(--series-1)" },
          ]}
          unit="rate"
          lang={lang}
          stepped
          dots={false}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        {t("Kaynak: ", "Source: ")}
        <a href={EVDS_URL} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
          TCMB EVDS
        </a>
        {t(
          " — bir hafta vadeli repo faizi, AOFM, gecelik borç alma ve borç verme faizleri. Karar günü AOFM o günün fonlamasını eski oranla gösterir, yeni orana ertesi iş günü geçer.",
          " — one-week repo rate, average funding cost, overnight borrowing and lending rates. On decision days the funding cost still reflects the old rate and moves to the new one the next business day.",
        )}
      </p>
    </section>
  );
}
