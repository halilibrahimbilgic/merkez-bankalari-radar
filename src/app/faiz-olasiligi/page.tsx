import type { Metadata } from "next";
import Link from "next/link";
import { ProbabilityChart, type ChartBucket } from "@/components/ProbabilityChart";
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
        <p className="rounded-lg border border-border bg-surface p-5 text-muted">
          Olasılık verisi henüz yüklenmedi.{" "}
          <code className="rounded bg-accent-soft px-1 text-accent">
            npm run fetch:probabilities
          </code>{" "}
          komutunu çalıştırın.
        </p>
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

      <nav className="flex flex-wrap gap-2">
        {snapshot.windows.slice(0, 8).map((w) => {
          const isActive = w.startDate === selected.startDate;
          return (
            <Link
              key={w.startDate}
              href={`/faiz-olasiligi?donem=${w.startDate}`}
              className={
                "rounded-full border px-3 py-1 text-sm tabular " +
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

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">
          {formatDateTr(selected.startDate)} – {formatDateTr(end)} dönemi
        </h2>
        <p className="mt-2 text-muted">{describeWindowTr(selected, target)}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat
            label="İndirim yönünde"
            value={selected.probCutPct}
            tone="text-dove"
          />
          <Stat
            label="Aralık içinde"
            value={
              selected.probHikePct !== undefined && selected.probCutPct !== undefined
                ? Math.max(0, 100 - selected.probHikePct - selected.probCutPct)
                : undefined
            }
            tone="text-foreground"
          />
          <Stat
            label="Artırım yönünde"
            value={selected.probHikePct}
            tone="text-hawk"
          />
        </div>

        <div className="mt-6">
          <ProbabilityChart data={chartData} />
          <p className="mt-1 text-center text-sm text-muted">
            Ortalama SOFR&apos;un 25 baz puanlık bantlara düşme olasılığı
          </p>
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
      </section>

      <Attribution />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number;
  tone: string;
}) {
  return (
    <div className="rounded border border-border p-3">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular ${tone}`}>
        {value === undefined ? "—" : formatPct(value)}
      </div>
    </div>
  );
}

function Caveat() {
  return (
    <div className="rounded-lg border border-border bg-accent-soft p-4 text-sm">
      <p className="font-medium text-accent">Bu rakamlar ne anlama gelir?</p>
      <p className="mt-1 text-muted">
        Buradaki olasılıklar <strong>tek bir FOMC toplantısına ait değildir</strong>.
        Üçer aylık bir dönemde <em>ortalama</em> gecelik faizin hangi bantta
        kalacağını gösterirler. Yani &quot;Eylül toplantısında 25 baz puan indirim
        ihtimali %X&quot; şeklinde okunamaz; &quot;Eylül–Aralık döneminde ortalama
        faizin şu bantta olma ihtimali %X&quot; şeklinde okunur.
      </p>
    </div>
  );
}

function Attribution() {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-5 text-sm text-muted">
      <h2 className="text-base font-semibold text-foreground">Kaynak ve lisans</h2>
      <p>
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
      <p>{LICENSE_NOTICE.atlantaFed}</p>
      <p>{LICENSE_NOTICE.cme}</p>
    </section>
  );
}
