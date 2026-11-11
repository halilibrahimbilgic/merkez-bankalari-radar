import { TableFrame, Th } from "@/components/ui";
import { Term } from "@/components/Term";
import { getInflationFor } from "@/lib/data/inflation";
import { fmtNum, fmtPercent, L, type Lang } from "@/lib/i18n";
import { getExpectations } from "@/lib/data/expectations";
import { formatDate, monthLabel } from "@/lib/time";
import { getProjections } from "@/lib/data/projections";

/**
 * TCMB'nin enflasyon ara hedefi ve tahmini (Enflasyon Raporu) ile piyasa
 * katılımcılarının yıl sonu beklentisi ve son gerçekleşen — Türk okurun
 * "TCMB'ye inanılıyor mu?" sorusu.
 */
export async function TcmbInflationOutlook({ lang }: { lang: Lang }) {
  const t = L(lang);
  const [{ tcmb: er }, expectations, inflation] = await Promise.all([
    getProjections(),
    getExpectations(),
    getInflationFor("tcmb"),
  ]);
  if (!er) return null;
  const survey = expectations.tcmb;
  const years = [...new Set([...Object.keys(er.targets), ...Object.keys(er.forecasts)])].sort();
  const surveyYear = survey?.period.slice(0, 4);
  const surveyValue = (year: string) => (year === surveyYear ? survey?.inflationYearEnd : undefined);
  const pct = (v: number | undefined, digits: number) => (v === undefined ? "—" : fmtPercent(v, lang, digits));
  const [y0] = years;
  // "1,6 puan yüksek" — fark yönüyle birlikte söylenir.
  const gap = (a?: number, b?: number) =>
    a === undefined || b === undefined
      ? undefined
      : `${fmtNum(Math.abs(a - b), lang, 1)} ${a >= b ? t("puan yüksek", "points higher") : t("puan düşük", "points lower")}`;
  const vsForecast = gap(surveyValue(y0), er.forecasts[y0]);
  const vsTarget = gap(surveyValue(y0), er.targets[y0]);
  const reportDate = formatDate(er.publishedOn, lang);

  return (
    <section aria-labelledby="enflasyon-gorunumu" className="space-y-3">
      <div>
        <h2 id="enflasyon-gorunumu" className="text-lg font-semibold">
          {t("Enflasyon: hedef, tahmin ve beklenti", "Inflation: target, forecast and expectations")}
        </h2>
        <p className="prose-width mt-1 text-sm text-muted">
          {t("TCMB'nin ", "The CBRT's ")}
          <Term id="ara-hedef-tcmb" lang={lang}>
            {t("ara hedefi", "interim target")}
          </Term>
          {t(
            ` ve yıl sonu tahmini (Enflasyon Raporu ${er.report}, ${reportDate}) ile piyasa katılımcılarının beklentisi yan yana.`,
            ` and year-end forecast (Inflation Report ${er.report}, ${reportDate}) next to market participants' expectations.`,
          )}
        </p>
      </div>
      <TableFrame minWidth="30rem">
        <thead>
          <tr className="border-b border-border-strong text-left text-muted">
            <Th>
              <span className="sr-only">{t("Ölçü", "Measure")}</span>
            </Th>
            {years.map((y) => (
              <Th key={y} align="right">
                {t(`${y} sonu`, `End-${y}`)}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th scope="row" className="px-4 py-2.5 text-left font-normal">{t("Ara hedef", "Interim target")}</th>
            {years.map((y) => (
              <td key={y} className="tabular px-4 py-2.5 text-right">{pct(er.targets[y], 0)}</td>
            ))}
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="px-4 py-2.5 text-left font-normal">{t("TCMB tahmini", "CBRT forecast")}</th>
            {years.map((y) => (
              <td key={y} className="tabular px-4 py-2.5 text-right font-semibold">{pct(er.forecasts[y], 0)}</td>
            ))}
          </tr>
          {survey?.inflationYearEnd !== undefined && (
            <tr>
              <th scope="row" className="px-4 py-2.5 text-left font-normal">
                {t("Piyasa katılımcıları", "Market participants")}
                <span className="block text-xs text-muted">
                  {t(
                    `${monthLabel(`${survey.period}-15T12:00:00Z`, lang)} anketi`,
                    `${monthLabel(`${survey.period}-15T12:00:00Z`, lang)} survey`,
                  )}
                </span>
              </th>
              {years.map((y) => (
                <td key={y} className="tabular px-4 py-2.5 text-right">{pct(surveyValue(y), 2)}</td>
              ))}
            </tr>
          )}
        </tbody>
      </TableFrame>
      <div className="prose-width space-y-1 text-sm text-muted">
        {vsForecast !== undefined && vsTarget !== undefined && (
          <p className="tabular">
            {t(
              `Piyasa katılımcılarının ${y0} sonu beklentisi TCMB'nin tahmininden ${vsForecast}, ara hedefinden ${vsTarget}.`,
              `Market participants' end-${y0} expectation is ${vsForecast} than the CBRT's forecast and ${vsTarget} than its interim target.`,
            )}
          </p>
        )}
        {inflation && (
          <p className="tabular">
            {t(
              `Son gerçekleşen yıllık enflasyon: ${fmtPercent(inflation.yoy, lang)} (${monthLabel(`${inflation.period}-15T12:00:00Z`, lang)}).`,
              `Latest annual inflation: ${fmtPercent(inflation.yoy, lang)} (${monthLabel(`${inflation.period}-15T12:00:00Z`, lang)}).`,
            )}
          </p>
        )}
        <p>
          {t("Kaynak: ", "Sources: ")}
          <a href={er.url} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
            {t(`TCMB Enflasyon Raporu ${er.report}`, `CBRT Inflation Report ${er.report}`)}
          </a>
          {t(
            " (Genel Değerlendirme); piyasa katılımcıları: TCMB Piyasa Katılımcıları Anketi, cari yıl sonu yıllık TÜFE beklentisi. Rapor yılda dört kez yayımlanır.",
            " (Overview); market participants: CBRT Survey of Market Participants, current year-end annual CPI expectation. The report is published four times a year.",
          )}
        </p>
      </div>
    </section>
  );
}
