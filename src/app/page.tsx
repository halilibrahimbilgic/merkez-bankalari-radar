import Link from "next/link";
import { BankCard } from "@/components/BankCard";
import { BankTag, ScoreBadge } from "@/components/ScoreBadge";
import type { OddsRow } from "@/components/RateOdds";
import { MVP_BANK_CODES } from "@/lib/banks";
import { getUpcomingMeetings } from "@/lib/data/meetings";
import { getCurrentRates } from "@/lib/data/rates";
import { getProbabilitySnapshot } from "@/lib/data/probabilities";
import { getBankScoreSummaries, getSpeeches } from "@/lib/data/speeches";
import { formatDateTr } from "@/lib/time";

export const revalidate = 3600;

export default async function HomePage() {
  const now = new Date();

  const [upcoming, rates, scores, probability, recentSpeeches] = await Promise.all([
    getUpcomingMeetings({ now }),
    getCurrentRates(),
    getBankScoreSummaries(),
    getProbabilitySnapshot(),
    getSpeeches({ scoredOnly: true, limit: 4 }),
  ]);

  // Fed olasılıkları yalnızca Fed kartında gösterilir — kaynağımız
  // Fed Funds/SOFR üzerinedir, diğer bankalar için karşılığı yok.
  const window = probability?.windows[0];
  const fedOdds: OddsRow[] | undefined =
    window && window.probHikePct !== undefined && window.probCutPct !== undefined
      ? [
          { direction: "up", label: "Aralığın üzeri", pct: window.probHikePct },
          {
            direction: "flat",
            label: "Aralık içinde",
            pct: Math.max(0, 100 - window.probHikePct - window.probCutPct),
          },
          { direction: "down", label: "Aralığın altı", pct: window.probCutPct },
        ]
      : undefined;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Merkez bankası faiz kararlarını Türkçe takip et
        </h1>
        <p className="prose-width mt-2 text-muted">
          Fed, ECB ve TCMB toplantı takvimi Türkiye saatiyle; piyasanın
          fiyatladığı beklentiler ve yetkili konuşmalarının şahin/güvercin skoru
          tek yerde.
        </p>
        {probability && (
          <p className="mt-2 text-sm text-muted tabular">
            Piyasa verisi {formatDateTr(probability.asOf)} kapanışı itibarıyla.
          </p>
        )}
      </section>

      <section aria-labelledby="bankalar-baslik">
        <h2 id="bankalar-baslik" className="sr-only">
          Bankalara genel bakış
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MVP_BANK_CODES.map((code) => (
            <BankCard
              key={code}
              bankCode={code}
              nextMeeting={upcoming.find((m) => m.bankCode === code)}
              currentRate={rates.find((r) => r.bankCode === code)}
              score={scores.find((s) => s.bankCode === code)}
              odds={code === "fed" ? fedOdds : undefined}
              oddsNote={
                code === "fed" && window
                  ? `${formatDateTr(window.startDate)} itibarıyla başlayan üç aylık dönem için ortalama faiz`
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Yaklaşan toplantılar</h2>
          <Link
            href="/takvim"
            className="inline-flex min-h-9 items-center text-sm text-accent hover:underline"
          >
            Tüm takvim →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-5 text-muted">
            Takvim verisi henüz yüklenmedi.{" "}
            <code className="rounded bg-accent-soft px-1 text-accent">
              npm run fetch:meetings
            </code>{" "}
            komutunu çalıştırın.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border bg-surface">
            {upcoming.slice(0, 6).map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 last:border-b-0"
              >
                <BankTag code={m.bankCode} />
                <span className="tabular flex-1">{formatDateTr(m.meetingAt)}</span>
                <span className="text-sm text-muted">
                  {daysLabel(m.meetingAt, now)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recentSpeeches.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Son skorlanan konuşmalar</h2>
            <Link
              href="/konusmalar"
              className="inline-flex min-h-9 items-center text-sm text-accent hover:underline"
            >
              Konuşma arşivi →
            </Link>
          </div>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface">
            {recentSpeeches.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 last:border-b-0"
              >
                <BankTag code={s.bankCode} />
                <Link
                  href={`/konusma/${s.id}`}
                  className="flex-1 hover:text-accent"
                >
                  {s.speakerName} — {s.title}
                </Link>
                <ScoreBadge score={s.hawkDoveScore} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function daysLabel(meetingAt: string, now: Date): string {
  const days = Math.ceil(
    (new Date(meetingAt).getTime() - now.getTime()) / 86_400_000,
  );
  return days <= 0 ? "bugün" : `${days} gün`;
}
