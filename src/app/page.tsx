import Link from "next/link";
import { BankCard } from "@/components/BankCard";
import { BankTag, ScoreBadge } from "@/components/ScoreBadge";
import { EmptyState, Row, Rows, SectionHeader } from "@/components/ui";
import type { OddsRow } from "@/components/RateOdds";
import { CALENDAR_BANK_CODES } from "@/lib/banks";
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
          Fed, ECB, TCMB, BoE, BoJ ve RBA toplantı takvimi Türkiye saatiyle; piyasanın
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
          {CALENDAR_BANK_CODES.map((code) => (
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
        <SectionHeader
          title="Yaklaşan toplantılar"
          action={{ href: "/takvim", label: "Tüm takvim" }}
        />
        {upcoming.length === 0 ? (
          <EmptyState command="npm run fetch:meetings">
            Takvim verisi henüz yüklenmedi.
          </EmptyState>
        ) : (
          <Rows>
            {upcoming.slice(0, 6).map((m) => (
              <Row key={m.id}>
                <BankTag code={m.bankCode} />
                <span className="tabular flex-1">{formatDateTr(m.meetingAt)}</span>
                <span className="text-sm text-muted">
                  {daysLabel(m.meetingAt, now)}
                </span>
              </Row>
            ))}
          </Rows>
        )}
      </section>

      {recentSpeeches.length > 0 && (
        <section>
          <SectionHeader
            title="Son skorlanan konuşmalar"
            action={{ href: "/konusmalar", label: "Konuşma arşivi" }}
          />
          <Rows>
            {recentSpeeches.map((s) => (
              <Row key={s.id}>
                <BankTag code={s.bankCode} />
                <Link
                  href={`/konusma/${s.id}`}
                  className="flex-1 hover:text-accent"
                >
                  {s.speakerName} — {s.title}
                </Link>
                <ScoreBadge score={s.hawkDoveScore} />
              </Row>
            ))}
          </Rows>
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
