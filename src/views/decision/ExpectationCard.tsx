import Link from "next/link";
import { RateOdds, type OddsRow } from "@/components/RateOdds";
import { SurpriseBadge } from "@/components/SurpriseBadge";
import { Term } from "@/components/Term";
import { TimeSeriesFigure } from "@/components/ChartFigures";
import { Card, SectionHeader, Stat } from "@/components/ui";
import { type DecisionView } from "@/lib/data/decisions";
import { formatDecisionRate, formatExpectedRate } from "@/lib/decision-format";
import { fmtBp, fmtPercent, L, localePath, type Lang } from "@/lib/i18n";
import { formatDate, formatDateShort, monthLabel } from "@/lib/time";

export function ExpectationCard({ view, lang }: { view: DecisionView; lang: Lang }) {
  const t = L(lang);
  const m = view.meeting;
  const e = view.expectation;

  if (!e) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">{t("Karardan önceki beklenti", "Expectation before the decision")}</h2>
        <p className="prose-width mt-2 text-muted">
          {view.missing === "no-source"
            ? t(
                "Bu banka için yeniden yayımlanabilir bir beklenti kaynağı yok: piyasa fiyatları vadeli işlem borsalarının lisanslı verisi, ücretsiz bir anket de bulunmuyor. Bu yüzden kararın beklentiden farkı hesaplanmıyor.",
                "There is no expectation source for this bank that can be republished: market prices are the futures exchanges' licensed data and there is no free survey. So the gap between the decision and expectations is not calculated.",
              )
            : t(
                "Karardan önce toplanan anketin sonuçları henüz yayımlanmadı ya da karardan önce oluşmuş bir beklenti kaydı yok. Yayımlanınca burada görünecek.",
                "The results of the survey collected before this decision have not been published yet, or there is no expectation recorded before the decision. They will appear here once published.",
              )}
        </p>
      </Card>
    );
  }

  const oddsRows: OddsRow[] | undefined = e.odds && [
    { direction: "up", label: t("Artırım", "Hike"), pct: e.odds.hike },
    { direction: "flat", label: t("Sabit", "Hold"), pct: e.odds.hold },
    { direction: "down", label: t("İndirim", "Cut"), pct: e.odds.cut },
  ];
  const s = e.surprise;
  const expected = formatExpectedRate(m.bankCode, e.point.rate, lang);

  // Grafik: önceki karardan bu karara beklentinin seyri.
  const chart = view.history.map((pt) => ({ label: formatDateShort(pt.date, lang), expected: pt.rate }));

  return (
    <Card>
      <SectionHeader
        title={t("Karardan önceki beklenti", "Expectation before the decision")}
        description={sourceLine(view, lang)}
      />
      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
        {e.kind === "market" ? t("piyasa fiyatlaması", "market pricing") : t("anket", "survey")}
      </span>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat
          compact
          label={t("Beklenen", "Expected")}
          value={expected}
          note={t(`değişim ${fmtBp(e.expectedChangeBp)}`, `change ${fmtBp(e.expectedChangeBp)}`)}
        />
        <Stat
          compact
          label={t("Karar", "Decision")}
          value={formatDecisionRate(m, lang)}
          note={view.changeBp !== undefined ? t(`değişim ${fmtBp(view.changeBp)}`, `change ${fmtBp(view.changeBp)}`) : undefined}
        />
        <Stat
          compact
          label={t("Fark", "Gap")}
          value={fmtBp(s.bp)}
          tone={s.bp > 0 ? "text-hawk" : s.bp < 0 ? "text-dove" : "text-foreground"}
        />
      </div>

      <p className="prose-width mt-4">
        <SurpriseBadge label={s.label} bp={s.bp} lang={lang} />{" "}
        {s.label === "in-line"
          ? s.bp === 0
            ? t("Karar, karardan önceki beklentiyle aynı.", "The decision matched the expectation before it.")
            : t(
                `Karar beklentiyle uyumlu; fark ${Math.abs(s.bp)} baz puan.`,
                `The decision was in line with expectations; the gap is ${Math.abs(s.bp)} basis points.`,
              )
          : s.bp > 0
            ? t(
                `Karar, beklentiden ${Math.abs(s.bp)} baz puan daha sıkı (faiz beklenenden yüksek).`,
                `The decision was ${Math.abs(s.bp)} basis points tighter than expected (the rate is higher than expected).`,
              )
            : t(
                `Karar, beklentiden ${Math.abs(s.bp)} baz puan daha gevşek (faiz beklenenden düşük).`,
                `The decision was ${Math.abs(s.bp)} basis points looser than expected (the rate is lower than expected).`,
              )}
      </p>

      {oddsRows && (
        <div className="mt-4 max-w-md">
          <div className="mb-2 text-sm text-muted">
            {e.kind === "market"
              ? t("Fiyatlanan olasılıklar (25 bp adım varsayımıyla, yaklaşık)", "Priced probabilities (approximate, assuming 25 bp steps)")
              : t("Katılımcıların ortalama olasılıkları", "Participants' average probabilities")}
          </div>
          <RateOdds rows={oddsRows} lang={lang} />
          {e.actualPct !== undefined && (
            <p className="mt-2 text-sm text-muted">
              {t(
                `Katılımcıların gerçekleşen sonuca verdiği ortalama olasılık: ${fmtPercent(e.actualPct, lang, 0)}.`,
                `Participants' average probability for the actual outcome: ${fmtPercent(e.actualPct, lang, 0)}.`,
              )}
            </p>
          )}
        </div>
      )}

      {chart.length >= 2 && (
        <div className="mt-6">
          <h3 className="text-base font-semibold">{t("Beklentinin seyri", "How the expectation moved")}</h3>
          <p className="prose-width mt-1 text-sm text-muted">
            {t(
              "Önceki karardan bu karara kadar, bu toplantı için beklenen oran. Kesik çizgiler önceki oranı ve kararı gösterir.",
              "The rate expected for this meeting, from the previous decision up to this one. Dashed lines show the previous rate and the decision.",
            )}
          </p>
          <div className="mt-3">
            <TimeSeriesFigure
              label={t("Karara kadar beklenen oranın seyri", "Expected rate ahead of the decision")}
              data={chart}
              series={[{ key: "expected", name: t("Beklenen oran", "Expected rate"), color: "var(--accent)" }]}
              unit="rate"
              lang={lang}
              stepped={e.kind === "survey"}
              // Sabit tutmada iki çizgi aynı yerde, etiketleri üst üste biniyordu: tek çizgi.
              refLines={
                m.previousRate === m.decisionRate
                  ? [{ y: m.decisionRate!, label: t("karar: sabit", "decision: hold"), color: "var(--hawk)" }]
                  : [
                      ...(m.previousRate !== undefined
                        ? [{ y: m.previousRate, label: t("önceki oran", "previous rate"), color: "var(--muted)" }]
                        : []),
                      { y: m.decisionRate!, label: t("karar", "decision"), color: "var(--hawk)" },
                    ]
              }
            />
          </div>
        </div>
      )}

      <p className="prose-width mt-4 text-sm text-muted">
        {lang === "en" ? (
          <>
            A gap below 10{" "}
            <Term id="baz-puan-bp" lang={lang}>
              basis points
            </Term>{" "}
            counts as in line, 25 basis points or more as a{" "}
            <Term id="surpriz" lang={lang}>
              surprise
            </Term>
            , and anything between as &quot;slightly&quot;. Only expectations formed after the previous decision and before
            this one are used.
          </>
        ) : (
          <>
            Fark 10{" "}
            <Term id="baz-puan-bp" lang={lang}>
              baz puanın
            </Term>{" "}
            altındaysa karar beklentiyle uyumlu, 25 baz puan ve üstündeyse{" "}
            <Term id="surpriz" lang={lang}>
              sürpriz
            </Term>{" "}
            sayılır; aradaki fark &quot;biraz&quot; diye gösterilir. Yalnızca önceki karardan sonra ve bu karardan önce
            oluşmuş beklentiler kullanılır.
          </>
        )}{" "}
        <Link href={localePath(lang, "/rehber/beklenti-nasil-olculur")} className="text-accent hover:underline">
          {t("Beklenti nasıl ölçülür?", "How are expectations measured?")}
        </Link>{" "}
        ·{" "}
        <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
          {t("Kaynak", "Source")}
        </a>
      </p>
    </Card>
  );
}

/** Kaynağın okura gösterilen adı ve turu. */
function sourceLine(view: DecisionView, lang: Lang): string {
  const t = L(lang);
  const e = view.expectation!;
  const round = e.point.round ? monthLabel(`${e.point.round}-15T12:00:00Z`, lang) : "";
  switch (e.source) {
    case "boe-ois":
      return t(
        `BoE'nin OIS faiz eğrisi, ${formatDate(e.point.date, lang)} kapanışı (karardan önceki son iş günü)`,
        `Bank of England OIS curve, close of ${formatDate(e.point.date, lang)} (last business day before the decision)`,
      );
    case "ecb-sma":
      return t(
        `ECB analist anketi (Survey of Monetary Analysts), ${round} turu — yanıtlar karardan önce toplandı, sonuçlar ${formatDate(e.point.publishedOn!, lang)} tarihinde yayımlandı`,
        `ECB Survey of Monetary Analysts, ${round} round — responses collected before the decision, results published on ${formatDate(e.point.publishedOn!, lang)}`,
      );
    case "tcmb-pka":
      return t(
        `TCMB Piyasa Katılımcıları Anketi, ${round} — ${formatDate(e.point.date, lang)} tarihinde yayımlandı; katılımcıların ortalaması`,
        `CBRT Survey of Market Participants, ${round} — published on ${formatDate(e.point.date, lang)}; participants' average`,
      );
    case "nyfed-sme":
      return t(
        `New York Fed Piyasa Beklentileri Anketi (Survey of Market Expectations), ${round} turu — yanıtlar ${formatDate(e.point.date, lang)} tarihine kadar, karardan önce toplandı; medyan beklenti`,
        `New York Fed Survey of Market Expectations, ${round} round — responses collected by ${formatDate(e.point.date, lang)}, before the decision; median expectation`,
      );
  }
}
