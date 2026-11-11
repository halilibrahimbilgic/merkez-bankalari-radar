import { SectionHeader, TableFrame, Th } from "@/components/ui";
import { getProjections } from "@/lib/data/projections";
import { Term } from "@/components/Term";
import { type StoredSnapshot } from "@/lib/data/probabilities";
import { fmtNum, fmtPercent, fmtPercentRange, L, type Lang } from "@/lib/i18n";
import { monthLabel } from "@/lib/time";

/**
 * Fed'in kendi patikası (SEP medyanı, "nokta grafiği") ile piyasanın
 * fiyatladığı: fark, piyasanın Fed'e inanıp inanmadığını gösterir.
 * Piyasa tarafı Atlanta Fed'in o yılın Aralık ayında başlayan üç aylık
 * dönemi — yıl sonuna en yakın gözlem.
 */
export async function FedVsMarket({ windows, lang }: { windows: StoredSnapshot["windows"]; lang: Lang }) {
  const t = L(lang);
  const sep = (await getProjections()).fed;
  if (!sep) return null;
  const market = (year: number) => {
    const w = windows.find((x) => x.startDate.startsWith(`${year}-12`));
    return w?.meanBps === undefined ? undefined : w.meanBps / 100;
  };
  const pp = (n: number) => `${n > 0.004 ? "+" : n < -0.004 ? "−" : "±"}${fmtNum(Math.abs(n), lang)}`;
  const released = monthLabel(`${sep.releasedOn}T12:00:00Z`, lang);

  return (
    <section aria-labelledby="fed-sep" className="space-y-3">
      <SectionHeader
        id="fed-sep"
        title={t("Fed'in kendi tahmini ve piyasa", "The Fed's own projection and the market")}
        description={
          <>
            {t("FOMC katılımcılarının yıl sonu faiz tahminlerinin medyanı (", "The median of FOMC participants' year-end rate projections (")}
            <Term id="nokta-grafigi" lang={lang}>
              {t("nokta grafiği", "dot plot")}
            </Term>
            {t(
              `, ${released}) ile piyasanın aynı dönem için fiyatladığı ortalama faiz. Fark pozitifse piyasa Fed'in kendi patikasından daha yüksek faiz bekliyor.`,
              `, ${released}) next to the average rate the market prices for the same period. A positive gap means the market expects higher rates than the Fed's own path.`,
            )}
          </>
        }
      />
      <TableFrame minWidth="34rem">
        <thead>
          <tr className="border-b border-border-strong text-left text-muted">
            <Th>{t("Yıl sonu", "Year-end")}</Th>
            <Th align="right">{t("Fed medyanı", "Fed median")}</Th>
            {/* Telefonda beş sütun sığmıyor: aralık gizlenir. */}
            <Th align="right" className="max-sm:hidden">
              {t("Katılımcı aralığı", "Participants' range")}
            </Th>
            <Th align="right">{t("Piyasa", "Market")}</Th>
            <Th align="right">{t("Fark (puan)", "Gap (pts)")}</Th>
          </tr>
        </thead>
        <tbody>
          {sep.years.map((y) => {
            const m = market(y.year);
            return (
              <tr key={y.year} className="border-b border-border last:border-b-0">
                <td className="tabular px-4 py-2.5">{y.year}</td>
                <td className="tabular px-4 py-2.5 text-right font-semibold">{fmtPercent(y.median, lang)}</td>
                <td className="tabular px-4 py-2.5 text-right text-muted max-sm:hidden">
                  {y.low !== undefined && y.high !== undefined ? fmtPercentRange(y.low, y.high, lang) : "—"}
                </td>
                <td className="tabular px-4 py-2.5 text-right">{m === undefined ? "—" : fmtPercent(m, lang)}</td>
                <td className="tabular px-4 py-2.5 text-right">
                  {m === undefined ? "—" : pp(m - y.median)}
                </td>
              </tr>
            );
          })}
          {sep.longerRun !== undefined && (
            <tr className="border-b border-border last:border-b-0">
              <td className="px-4 py-2.5">{t("Uzun dönem", "Longer run")}</td>
              <td className="tabular px-4 py-2.5 text-right font-semibold">{fmtPercent(sep.longerRun, lang)}</td>
              <td className="px-4 py-2.5 text-right text-muted max-sm:hidden">—</td>
              <td className="px-4 py-2.5 text-right text-muted">—</td>
              <td className="px-4 py-2.5 text-right text-muted">—</td>
            </tr>
          )}
        </tbody>
      </TableFrame>
      <p className="prose-width text-sm text-muted">
        {t(
          "Fed'in tahmini hedef aralığın orta noktasıdır ve yılda dört kez, projeksiyonlu toplantılarda güncellenir (kaynak: FRED). Piyasa: Atlanta Fed verisinde o yılın Aralık ayında başlayan üç aylık dönemin ortalama faizi — yıl sonuna en yakın gözlem, tam aynı an değil.",
          "The Fed's projection is the midpoint of the target range and is updated four times a year at meetings with projections (source: FRED). Market: the average rate over the three-month period starting in December of that year in the Atlanta Fed data — the closest observation to year-end, not the exact same moment.",
        )}
      </p>
    </section>
  );
}
