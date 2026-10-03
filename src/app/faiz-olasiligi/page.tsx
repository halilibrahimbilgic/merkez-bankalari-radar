import type { Metadata } from "next";
import Link from "next/link";
import { ProbabilityChart, type ChartBucket } from "@/components/ProbabilityChart";
import { ExpectedPathChart, type PathPoint } from "@/components/ExpectedPathChart";
import { RateOdds, type OddsRow } from "@/components/RateOdds";
import { Callout, Card, EmptyState, SectionHeader, Stat } from "@/components/ui";
import {
  bpsRangeTr,
  describeWindowTr,
  formatPct,
  getProbabilitySnapshot,
  windowEndDate,
} from "@/lib/data/probabilities";
import { getUpcomingMeetings } from "@/lib/data/meetings";
import { LICENSE_NOTICE, MPT_PAGE_URL } from "@/lib/sources/mpt";
import { formatDateTr } from "@/lib/time";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fed faiz olasılıkları",
  description:
    "Piyasanın fiyatladığı Fed faiz beklentileri — Atlanta Fed Market Probability Tracker verisiyle, Türkçe açıklamalı.",
};

export default async function ProbabilityPage({
  searchParams,
}: PageProps<"/faiz-olasiligi">) {
  const snapshot = await getProbabilitySnapshot();

  if (!snapshot || snapshot.windows.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Fed faiz olasılıkları</h1>
        <EmptyState command="npm run fetch:probabilities">
          Olasılık verisi henüz yüklenmedi.
        </EmptyState>
      </div>
    );
  }

  const params = await searchParams;
  const requested = typeof params.donem === "string" ? params.donem : undefined;
  const selected =
    snapshot.windows.find((w) => w.startDate === requested) ?? snapshot.windows[0];

  const target = snapshot.targetRange;
  const chartData: ChartBucket[] = selected.buckets.map((b) => ({
    label: bpsRangeTr(b.lowerBps, b.upperBps),
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
  const tailPct = Math.max(
    0,
    100 - selected.buckets.reduce((s, b) => s + b.probabilityPct, 0),
  );

  // Yön oklu özet — seçili pencere için.
  const odds: OddsRow[] | undefined =
    selected.probHikePct !== undefined && selected.probCutPct !== undefined
      ? [
          { direction: "up", label: "Aralığın üzeri", pct: selected.probHikePct },
          {
            direction: "flat",
            label: "Aralık içinde",
            pct: Math.max(0, 100 - selected.probHikePct - selected.probCutPct),
          },
          { direction: "down", label: "Aralığın altı", pct: selected.probCutPct },
        ]
      : undefined;

  // Beklenen faiz patikası — tüm pencereler boyunca ortalama ve
  // 25.-75. yüzdelik bandı.
  const path: PathPoint[] = snapshot.windows
    .filter((w) => w.meanBps !== undefined && w.p25Bps !== undefined && w.p75Bps !== undefined)
    .map((w) => ({
      label: shortPeriodLabel(w.startDate),
      band: [w.p25Bps!, w.p75Bps!] as [number, number],
      mean: w.meanBps!,
    }));

  // Bu pencereye denk gelen FOMC toplantıları — okuyucuya bağlam verir.
  const end = windowEndDate(selected.startDate);
  const fomc = (await getUpcomingMeetings({ bankCode: "fed" })).filter(
    (m) => m.meetingAt.slice(0, 10) >= selected.startDate && m.meetingAt.slice(0, 10) < end,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Fed faiz olasılıkları</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Piyasanın opsiyon fiyatlarına yansıyan faiz beklentileri. Veri{" "}
          {formatDateTr(snapshot.asOf)} kapanışına aittir.
        </p>
      </header>

      <Caveat />

      {path.length > 1 && (
        <Card>
          <SectionHeader
            title="Beklenen faiz patikası"
            description="Piyasanın her üç aylık dönem için fiyatladığı ortalama faiz ve 25.–75. yüzdelik aralığı. Gölgeli yatay bant bugünkü hedef aralığı gösterir."
          />
          <div className="mt-4">
            <ExpectedPathChart data={path} targetRange={target} />
          </div>
          <p className="mt-1 text-sm text-muted">
            Bandın ileri dönemlerde açılması, ortalama beklenti benzer kalsa
            bile belirsizliğin arttığı anlamına gelir.
          </p>
        </Card>
      )}

      <nav aria-label="Dönem seçimi" className="flex flex-wrap gap-2">
        {snapshot.windows.slice(0, 8).map((w) => {
          const isActive = w.startDate === selected.startDate;
          return (
            <Link
              key={w.startDate}
              href={`/faiz-olasiligi?donem=${w.startDate}`}
              className={
                "inline-flex min-h-9 items-center rounded-full border px-3 text-sm tabular " +
                (isActive
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-muted hover:border-accent hover:text-accent")
              }
            >
              {formatDateTr(w.startDate)}
            </Link>
          );
        })}
      </nav>

      <Card>
        <h2 className="text-lg font-semibold">
          {formatDateTr(selected.startDate)} – {formatDateTr(end)} dönemi
        </h2>
        <p className="prose-width mt-2 text-muted">
          {describeWindowTr(selected, target)}
        </p>

        {odds && (
          <div className="mt-4">
            <RateOdds rows={odds} />
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat
            label="İndirim yönünde"
            value={pct(selected.probCutPct)}
            tone="text-dove"
          />
          <Stat
            label="Aralık içinde"
            value={pct(
              selected.probHikePct !== undefined && selected.probCutPct !== undefined
                ? Math.max(0, 100 - selected.probHikePct - selected.probCutPct)
                : undefined,
            )}
          />
          <Stat
            label="Artırım yönünde"
            value={pct(selected.probHikePct)}
            tone="text-hawk"
          />
        </div>

        <div className="mt-6">
          <ProbabilityChart data={chartData} />
          <p className="mt-1 text-center text-sm text-muted">
            Ortalama SOFR&apos;un 25 baz puanlık bantlara düşme olasılığı
          </p>
          {tailPct >= 0.5 && (
            <p className="mt-1 text-center text-sm text-muted">
              Gösterilen bantların toplamı {formatPct(100 - tailPct)}; kalan{" "}
              {formatPct(tailPct)} kaynakta ayrı bant olarak yayımlanmayan uç
              değerlere aittir. Yön olasılıkları bu payı içerir.
            </p>
          )}
        </div>

        {fomc.length > 0 && (
          <p className="mt-4 text-sm text-muted">
            Bu döneme denk gelen FOMC toplantıları:{" "}
            {fomc.map((m, i) => (
              <span key={m.id}>
                {i > 0 && ", "}
                <Link href="/banka/fed" className="text-accent hover:underline">
                  {formatDateTr(m.meetingAt)}
                </Link>
              </span>
            ))}
          </p>
        )}
      </Card>

      <Attribution />
    </div>
  );
}

/** "16 Eylül 2026" yerine grafikte sığan "Eyl 26" biçimi. */
function shortPeriodLabel(startDate: string): string {
  const d = new Date(`${startDate}T00:00:00Z`);
  const month = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "UTC",
    month: "short",
  }).format(d);
  return `${month} ${String(d.getUTCFullYear()).slice(2)}`;
}

/** Eksik veri tire ile gösterilir — 0 ile karıştırılmasın. */
function pct(value?: number): string {
  return value === undefined ? "—" : formatPct(value);
}

function Caveat() {
  return (
    <Callout title="Bu rakamlar ne anlama gelir?">
      Buradaki olasılıklar <strong>tek bir FOMC toplantısına ait değildir</strong>.
      Üçer aylık bir dönemde <em>ortalama</em> gecelik faizin hangi bantta
      kalacağını gösterirler. Yani &quot;Eylül toplantısında 25 baz puan indirim
      ihtimali %X&quot; şeklinde okunamaz; &quot;Eylül–Aralık döneminde ortalama
      faizin şu bantta olma ihtimali %X&quot; şeklinde okunur.
    </Callout>
  );
}

function Attribution() {
  return (
    <Card className="space-y-3 text-sm text-muted">
      <h2 className="text-base font-semibold text-foreground">Kaynak ve lisans</h2>
      <p className="prose-width">
        Veri:{" "}
        <a
          href={MPT_PAGE_URL}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-accent hover:underline"
        >
          Federal Reserve Bank of Atlanta — Market Probability Tracker
        </a>
        . Dağılımlar CME 3 aylık SOFR opsiyon fiyatlarından türetilmiştir.
      </p>
      <p className="prose-width">{LICENSE_NOTICE.atlantaFed}</p>
      <p className="prose-width">{LICENSE_NOTICE.cme}</p>
    </Card>
  );
}
