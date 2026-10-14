import type { Metadata } from "next";
import Link from "next/link";
import { BankTag } from "@/components/ScoreBadge";
import { Callout, TableFrame, Th } from "@/components/ui";
import { ALL_BANKS, BANKS, bankCountry } from "@/lib/banks";
import { getInflation } from "@/lib/data/inflation";
import { formatCurrentRate, getCurrentRates } from "@/lib/data/rates";
import { fmtPercent, fmtSignedPercent, L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { realRate, type RealRate } from "@/lib/real-rates";
import { INFLATION_SOURCES } from "@/lib/sources/inflation";
import { monthLabel } from "@/lib/time";

export function realRatesMetadata(lang: Lang): Metadata {
  const t = L(lang);
  return {
    title: t("Reel faiz tablosu: politika faizi eksi enflasyon", "Real interest rates: policy rate minus inflation"),
    description: t(
      "Fed, ECB, TCMB, BoE, BoJ ve RBA politika faizlerinin son yıllık enflasyona göre reel değeri — TL'de reel getiri var mı?",
      "The Fed, ECB, CBRT, BoE, BoJ and RBA policy rates adjusted for the latest annual inflation.",
    ),
    alternates: languageAlternates(lang, "/reel-faiz"),
  };
}

export async function RealRatesPage({ lang }: { lang: Lang }) {
  const t = L(lang);
  const [rates, inflation] = await Promise.all([getCurrentRates(), getInflation()]);
  const rows: RealRate[] = ALL_BANKS.flatMap((b) => {
    const rate = rates.find((r) => r.bankCode === b.code);
    const infl = inflation.find((i) => i.bankCode === b.code);
    return rate && infl ? [realRate(rate, infl)] : [];
  });
  const high = rows.filter((r) => Math.abs(r.real - r.fisher) >= 0.5);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Reel faiz", "Real interest rates")}</h1>
        <p className="prose-width mt-2 text-muted">
          {t(
            "Politika faizinden son açıklanan yıllık enflasyon çıkarıldığında kalan getiri. Pozitif reel faiz, faizin fiyat artışlarının üzerinde olduğunu; negatif reel faiz, altında kaldığını gösterir.",
            "What remains of the policy rate after subtracting the latest annual inflation. A positive real rate means the rate is above price growth; a negative one means it is below.",
          )}{" "}
          <Link href={localePath(lang, "/rehber/reel-faiz-nedir")} className="text-accent hover:underline">
            {t("Reel faiz nedir?", "What is the real interest rate?")}
          </Link>
        </p>
      </header>

      <TableFrame minWidth="36rem">
        <thead>
          <tr className="border-b border-border-strong text-left text-muted">
            <Th>{t("Banka", "Bank")}</Th>
            <Th align="right">{t("Politika faizi", "Policy rate")}</Th>
            <Th align="right">{t("Yıllık enflasyon", "Annual inflation")}</Th>
            <Th align="right">{t("Reel faiz", "Real rate")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const bank = BANKS[r.bankCode];
            const rate = rates.find((x) => x.bankCode === r.bankCode)!;
            return (
              <tr key={r.bankCode} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5">
                  <Link href={localePath(lang, `/banka/${r.bankCode}`)} className="inline-flex items-center gap-2 hover:text-accent">
                    <BankTag code={r.bankCode} lang={lang} />
                    <span className="hidden text-muted sm:inline">{bankCountry(bank, lang)}</span>
                  </Link>
                </td>
                <td className="tabular px-4 py-2.5 text-right">
                  {formatCurrentRate(rate, lang)}
                  {rate.rateLower !== undefined && (
                    <div className="text-xs text-muted">
                      {t(`orta nokta ${fmtPercent(r.policy, lang, 3)}`, `midpoint ${fmtPercent(r.policy, lang, 3)}`)}
                    </div>
                  )}
                </td>
                <td className="tabular px-4 py-2.5 text-right">
                  {fmtPercent(r.inflation.yoy, lang, r.bankCode === "tcmb" ? 2 : 1)}
                  <div className="text-xs text-muted">
                    {monthLabel(`${r.inflation.period}-15T12:00:00Z`, lang)}
                    {r.inflation.flash && t(", öncü", ", flash")}
                  </div>
                </td>
                {/* Renk yok: sitede kırmızı/yeşil şahin/güvercin demek; pozitif reel faiz
                    "sıkı" ama tasarruf sahibi için "iyi" — renk iki okumayı karıştırırdı. */}
                <td className="tabular px-4 py-2.5 text-right font-semibold">
                  {fmtSignedPercent(r.real, lang)}
                  <div className="text-xs font-normal text-muted">
                    {r.real > 0 ? t("pozitif", "positive") : r.real < 0 ? t("negatif", "negative") : t("sıfır", "zero")}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableFrame>

      {high.length > 0 && (
        <Callout title={t("Yüksek enflasyonda kesin hesap", "The exact calculation when inflation is high")}>
          {high.map((r) => (
            <span key={r.bankCode}>
              {t(
                `Basit fark yüksek enflasyonda getiriyi abartır. Kesin (Fisher) hesapla ${BANKS[r.bankCode].nameTr} için reel faiz ${fmtSignedPercent(r.real, lang)} değil ${fmtSignedPercent(r.fisher, lang)}: (1 + ${fmtPercent(r.policy, lang)}) ÷ (1 + ${fmtPercent(r.inflation.yoy, lang)}) − 1. `,
                `The simple difference overstates the return when inflation is high. With the exact (Fisher) calculation, the real rate for the ${BANKS[r.bankCode].shortEn} is ${fmtSignedPercent(r.fisher, lang)} rather than ${fmtSignedPercent(r.real, lang)}: (1 + ${fmtPercent(r.policy, lang)}) ÷ (1 + ${fmtPercent(r.inflation.yoy, lang)}) − 1. `,
              )}
            </span>
          ))}
        </Callout>
      )}

      <section className="prose-width space-y-2 text-sm text-muted">
        <h2 className="text-base font-semibold text-foreground">{t("Yöntem ve sınırlar", "Method and limits")}</h2>
        <p>
          {t(
            "Reel faiz burada politika faizi ile son açıklanan yıllık tüketici enflasyonunun farkıdır (geçmişe dönük ölçü). Fed bir aralık ilan ettiği için aralığın orta noktası alınır. Enflasyon geçmiş bir ayı anlatır ve birkaç gün ile birkaç hafta gecikmeyle açıklanır; politika faizi ise bugünkü düzeydir. Merkez bankaları çoğunlukla beklenen enflasyona göre bakar (ileriye dönük reel faiz) — o, buradaki rakamdan farklı olabilir.",
            "The real rate here is the policy rate minus the latest published annual consumer inflation (a backward-looking measure). As the Fed announces a range, its midpoint is used. Inflation describes a past month and is published with a lag of days to weeks, while the policy rate is today's level. Central banks often look at expected inflation instead (the forward-looking real rate), which can differ from the figure here.",
          )}
        </p>
        <p>
          {t(
            "Mevduat ve kredi faizleri politika faizinden farklıdır; vergi ve masraflar hesaba katılmaz. Bu tablo yatırım tavsiyesi değildir.",
            "Deposit and loan rates differ from the policy rate, and taxes and fees are not taken into account. This table is not investment advice.",
          )}
        </p>
        <p>
          {t("Enflasyon kaynakları:", "Inflation sources:")}{" "}
          {rows.map((r, i) => (
            <span key={r.bankCode}>
              {i > 0 && " · "}
              <a href={r.inflation.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
                {INFLATION_SOURCES[r.bankCode][lang]}
              </a>
            </span>
          ))}
          .{" "}
          {t(
            "Euro bölgesinde son ay çoğunlukla Eurostat'ın öncü tahminidir; kesin veriyle değişebilir.",
            "For the euro area the latest month is usually Eurostat's flash estimate and may be revised.",
          )}
        </p>
      </section>
    </div>
  );
}
