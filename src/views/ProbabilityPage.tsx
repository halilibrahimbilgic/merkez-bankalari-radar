import type { Metadata } from "next";
import Link from "next/link";
import { ExpectedPathChart, type PathPoint } from "@/components/ExpectedPathChart";
import { ProbabilityChart, type ChartBucket } from "@/components/ProbabilityChart";
import { RateOdds, type OddsRow } from "@/components/RateOdds";
import { Callout, Card, EmptyState, SectionHeader, Stat } from "@/components/ui";
import { getUpcomingMeetings } from "@/lib/data/meetings";
import {
  bpsRange,
  describeWindow,
  formatPct,
  getProbabilitySnapshot,
  windowEndDate,
} from "@/lib/data/probabilities";
import { INTL_LOCALE, L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { LICENSE_NOTICE, LICENSE_NOTICE_EN, MPT_PAGE_URL } from "@/lib/sources/mpt";
import { formatDate } from "@/lib/time";

export function probabilityMetadata(lang: Lang): Metadata {
  const t = L(lang);
  return {
    title: t("Fed faiz olasılıkları", "Fed rate probabilities"),
    description: t(
      "Piyasanın fiyatladığı Fed faiz beklentileri — Atlanta Fed Market Probability Tracker verisiyle, Türkçe açıklamalı.",
      "Market-implied Fed rate expectations — from the Atlanta Fed Market Probability Tracker, with explanations.",
    ),
    alternates: languageAlternates(lang, "/faiz-olasiligi"),
  };
}

export async function ProbabilityPage({
  lang,
  searchParams,
}: {
  lang: Lang;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = L(lang);
  const snapshot = await getProbabilitySnapshot();
  const title = t("Fed faiz olasılıkları", "Fed rate probabilities");

  if (!snapshot || snapshot.windows.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <EmptyState>{t("Olasılık verisi henüz yüklenmedi.", "Probability data has not been loaded yet.")}</EmptyState>
      </div>
    );
  }

  const requested = typeof searchParams.donem === "string" ? searchParams.donem : undefined;
  const selected =
    snapshot.windows.find((w) => w.startDate === requested) ?? snapshot.windows[0];

  const target = snapshot.targetRange;
  const chartData: ChartBucket[] = selected.buckets.map((b) => ({
    label: bpsRange(b.lowerBps, b.upperBps, lang),
    probabilityPct: b.probabilityPct,
    position: !target
      ? "inside"
      : b.upperBps <= target.lowerBps
        ? "below"
        : b.lowerBps >= target.upperBps
          ? "above"
          : "inside",
  }));

  // Atlanta Fed uçtaki küçük bantları ayrı yayımlamıyor; toplam %100'e
  // tamamlanmıyor. Eksik payı gizlemek grafiği olduğundan kesin gösterirdi.
  const tailPct = Math.max(0, 100 - selected.buckets.reduce((s, b) => s + b.probabilityPct, 0));

  const hold =
    selected.probHikePct !== undefined && selected.probCutPct !== undefined
      ? Math.max(0, 100 - selected.probHikePct - selected.probCutPct)
      : undefined;

  // Yön oklu özet — seçili pencere için.
  const odds: OddsRow[] | undefined =
    selected.probHikePct !== undefined && selected.probCutPct !== undefined
      ? [
          { direction: "up", label: t("Aralığın üzeri", "Above range"), pct: selected.probHikePct },
          { direction: "flat", label: t("Aralık içinde", "Within range"), pct: hold! },
          { direction: "down", label: t("Aralığın altı", "Below range"), pct: selected.probCutPct },
        ]
      : undefined;

  // Beklenen faiz patikası — tüm pencereler boyunca ortalama ve
  // 25.-75. yüzdelik bandı.
  const path: PathPoint[] = snapshot.windows
    .filter((w) => w.meanBps !== undefined && w.p25Bps !== undefined && w.p75Bps !== undefined)
    .map((w) => ({
      label: shortPeriodLabel(w.startDate, lang),
      band: [w.p25Bps!, w.p75Bps!] as [number, number],
      mean: w.meanBps!,
    }));

  // Bu pencereye denk gelen FOMC toplantıları — okuyucuya bağlam verir.
  const end = windowEndDate(selected.startDate);
  const fomc = (await getUpcomingMeetings({ bankCode: "fed" })).filter(
    (m) => m.meetingAt.slice(0, 10) >= selected.startDate && m.meetingAt.slice(0, 10) < end,
  );
  const pct = (v?: number) => (v === undefined ? "—" : formatPct(v, lang));
  const notice = lang === "en" ? LICENSE_NOTICE_EN : LICENSE_NOTICE;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {t(
            `Piyasanın opsiyon fiyatlarına yansıyan faiz beklentileri. Veri ${formatDate(snapshot.asOf, lang)} kapanışına aittir.`,
            `Rate expectations reflected in option prices. Data as of the close of ${formatDate(snapshot.asOf, lang)}.`,
          )}
        </p>
      </header>

      <Callout title={t("Bu rakamlar ne anlama gelir?", "What do these numbers mean?")}>
        {lang === "en" ? (
          <>
            These probabilities <strong>do not belong to a single FOMC meeting</strong>. They show
            which band the <em>average</em> overnight rate is likely to fall into over a
            three-month period. So they cannot be read as &quot;the probability of a 25 basis
            point cut at the September meeting is X%&quot;, but as &quot;the probability that the
            average rate over September–December is in this band is X%&quot;.
          </>
        ) : (
          <>
            Buradaki olasılıklar <strong>tek bir FOMC toplantısına ait değildir</strong>. Üçer
            aylık bir dönemde <em>ortalama</em> gecelik faizin hangi bantta kalacağını
            gösterirler. Yani &quot;Eylül toplantısında 25 baz puan indirim ihtimali %X&quot;
            şeklinde okunamaz; &quot;Eylül–Aralık döneminde ortalama faizin şu bantta olma
            ihtimali %X&quot; şeklinde okunur.
          </>
        )}
      </Callout>

      {path.length > 1 && (
        <Card>
          <SectionHeader
            title={t("Beklenen faiz patikası", "Expected rate path")}
            description={t(
              "Piyasanın her üç aylık dönem için fiyatladığı ortalama faiz ve 25.–75. yüzdelik aralığı. Gölgeli yatay bant bugünkü hedef aralığı gösterir.",
              "The average rate the market prices for each three-month period, with the 25th–75th percentile range. The shaded horizontal band shows the current target range.",
            )}
          />
          <div className="mt-4">
            <ExpectedPathChart
              data={path}
              targetRange={target}
              labels={{
                mean: t("Ortalama beklenti", "Mean expectation"),
                band: t("Olası aralık (25.–75. yüzdelik)", "Likely range (25th–75th percentile)"),
                target: t("Bugünkü hedef aralık", "Current target range"),
                period: t("Dönem", "Period"),
                lang,
              }}
            />
          </div>
          <p className="mt-1 text-sm text-muted">
            {t(
              "Bandın ileri dönemlerde açılması, ortalama beklenti benzer kalsa bile belirsizliğin arttığı anlamına gelir.",
              "A band that widens in later periods means uncertainty is rising, even if the average expectation stays similar.",
            )}
          </p>
        </Card>
      )}

      <nav aria-label={t("Dönem seçimi", "Period selection")} className="flex flex-wrap gap-2">
        {snapshot.windows.slice(0, 8).map((w) => {
          const isActive = w.startDate === selected.startDate;
          return (
            <Link
              key={w.startDate}
              href={`${localePath(lang, "/faiz-olasiligi")}?donem=${w.startDate}`}
              className={
                "inline-flex min-h-9 items-center rounded-full border px-3 text-sm tabular " +
                (isActive
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-muted hover:border-accent hover:text-accent")
              }
            >
              {formatDate(w.startDate, lang)}
            </Link>
          );
        })}
      </nav>

      <Card>
        <h2 className="text-lg font-semibold">
          {t(
            `${formatDate(selected.startDate, lang)} – ${formatDate(end, lang)} dönemi`,
            `Period ${formatDate(selected.startDate, lang)} – ${formatDate(end, lang)}`,
          )}
        </h2>
        <p className="prose-width mt-2 text-muted">{describeWindow(selected, target, lang)}</p>

        {odds && (
          <div className="mt-4">
            <RateOdds rows={odds} lang={lang} />
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label={t("İndirim yönünde", "Towards a cut")} value={pct(selected.probCutPct)} tone="text-dove" />
          <Stat label={t("Aralık içinde", "Within range")} value={pct(hold)} />
          <Stat label={t("Artırım yönünde", "Towards a hike")} value={pct(selected.probHikePct)} tone="text-hawk" />
        </div>

        <div className="mt-6">
          <ProbabilityChart
            data={chartData}
            labels={{ probability: t("Olasılık", "Probability"), band: t("Bant", "Band"), lang }}
          />
          <p className="mt-1 text-center text-sm text-muted">
            {t(
              "Ortalama SOFR'un 25 baz puanlık bantlara düşme olasılığı",
              "Probability of average SOFR falling into each 25 basis point band",
            )}
          </p>
          {tailPct >= 0.5 && (
            <p className="mt-1 text-center text-sm text-muted">
              {t(
                `Gösterilen bantların toplamı ${formatPct(100 - tailPct, lang)}; kalan ${formatPct(tailPct, lang)} kaynakta ayrı bant olarak yayımlanmayan uç değerlere aittir. Yön olasılıkları bu payı içerir.`,
                `The bands shown add up to ${formatPct(100 - tailPct, lang)}; the remaining ${formatPct(tailPct, lang)} belongs to tail values the source does not publish as separate bands. The direction probabilities include this share.`,
              )}
            </p>
          )}
        </div>

        {fomc.length > 0 && (
          <p className="mt-4 text-sm text-muted">
            {t("Bu döneme denk gelen FOMC toplantıları:", "FOMC meetings in this period:")}{" "}
            {fomc.map((m, i) => (
              <span key={m.id}>
                {i > 0 && ", "}
                <Link href={localePath(lang, "/banka/fed")} className="text-accent hover:underline">
                  {formatDate(m.meetingAt, lang)}
                </Link>
              </span>
            ))}
          </p>
        )}
      </Card>

      <Card className="space-y-3 text-sm text-muted">
        <h2 className="text-base font-semibold text-foreground">{t("Kaynak ve lisans", "Source and licence")}</h2>
        <p className="prose-width">
          {t("Veri", "Data")}:{" "}
          <a
            href={MPT_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-accent hover:underline"
          >
            Federal Reserve Bank of Atlanta — Market Probability Tracker
          </a>
          .{" "}
          {t(
            "Dağılımlar CME 3 aylık SOFR opsiyon fiyatlarından türetilmiştir.",
            "The distributions are derived from CME three-month SOFR option prices.",
          )}
        </p>
        <p className="prose-width">{notice.atlantaFed}</p>
        <p className="prose-width">{notice.cme}</p>
      </Card>
    </div>
  );
}

/** "16 Eylül 2026" yerine grafikte sığan "Eyl 26" / "Sept 26" biçimi. */
function shortPeriodLabel(startDate: string, lang: Lang): string {
  const d = new Date(`${startDate}T00:00:00Z`);
  const month = new Intl.DateTimeFormat(INTL_LOCALE[lang], { timeZone: "UTC", month: "short" }).format(d);
  return `${month} ${String(d.getUTCFullYear()).slice(2)}`;
}
