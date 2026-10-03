import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MeetingRow } from "@/components/MeetingRow";
import { ALL_BANKS, getBank } from "@/lib/banks";
import { getPastMeetings, getUpcomingMeetings } from "@/lib/data/meetings";
import { formatCurrentRate, getCurrentRate } from "@/lib/data/rates";
import { getBankScoreSummaries, getSpeeches } from "@/lib/data/speeches";
import { ScoreBadge } from "@/components/ScoreBadge";
import { formatDateTr, formatMeetingTr } from "@/lib/time";

export const revalidate = 3600;

export function generateStaticParams() {
  return ALL_BANKS.map((b) => ({ code: b.code }));
}

export async function generateMetadata({
  params,
}: PageProps<"/banka/[code]">): Promise<Metadata> {
  const { code } = await params;
  const bank = getBank(code);
  if (!bank) return {};
  return {
    title: `${bank.nameTr} faiz toplantıları`,
    description: `${bank.nameTr} (${bank.nameEn}) toplantı takvimi ve faiz kararları — Türkiye saatiyle.`,
  };
}

export default async function BankPage({ params }: PageProps<"/banka/[code]">) {
  const { code } = await params;
  const bank = getBank(code);
  if (!bank) notFound();

  const now = new Date();
  const upcoming = await getUpcomingMeetings({ bankCode: bank.code, now });
  const past = await getPastMeetings({ bankCode: bank.code, limit: 12, now });
  const next = upcoming[0];
  const currentRate = await getCurrentRate(bank.code);
  const speeches = await getSpeeches({ bankCode: bank.code, limit: 5 });
  const scoreSummary = (await getBankScoreSummaries()).find(
    (s) => s.bankCode === bank.code,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {bank.nameTr}{" "}
          <span className="text-base font-normal text-muted">({bank.nameEn})</span>
        </h1>
        <p className="mt-1 text-muted">
          {bank.countryTr} · {bank.rateNameTr}
        </p>
        <a
          href={bank.websiteUrl}
          rel="noopener noreferrer nofollow"
          target="_blank"
          className="mt-1 inline-block text-sm text-accent hover:underline"
        >
          Resmî takvim sayfası →
        </a>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {currentRate && (
          <section className="card p-5">
            <div className="text-sm text-muted">Güncel politika faizi</div>
            <div className="mt-1 text-2xl font-semibold tabular">
              {formatCurrentRate(currentRate)}
            </div>
            <div className="mt-1 text-sm text-muted tabular">
              {formatDateTr(currentRate.asOf)} itibarıyla
            </div>
          </section>
        )}
        {scoreSummary && (
          <section className="card p-5">
            <div className="text-sm text-muted">Şahin/güvercin eğilimi</div>
            <div className="mt-1 text-2xl">
              <ScoreBadge score={scoreSummary.averageScore} />
            </div>
            <div className="mt-1 text-sm text-muted tabular">
              {scoreSummary.speechCount} sinyalli konuşmanın ortalaması
            </div>
          </section>
        )}
      </div>

      {next ? (
        <section className="card p-5">
          <div className="text-sm text-muted">Sıradaki toplantı</div>
          <div className="mt-1 text-lg font-semibold tabular">
            {formatMeetingTr(next.meetingAt, next.timeTbd)}
          </div>
        </section>
      ) : (
        <p className="card p-5 text-muted">
          Bu banka için henüz takvim verisi yok.
        </p>
      )}

      {upcoming.length > 1 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Yaklaşan toplantılar</h2>
          <ul className="overflow-hidden card">
            {upcoming.slice(1).map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Geçmiş toplantılar</h2>
          <ul className="overflow-hidden card opacity-80">
            {past.map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} />
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">
            Karar oranları Fed için FRED, ECB için ECB Data Portal, TCMB için
            EVDS, BoE için MPC oylama geçmişinden, RBA için F1 tablosundan, BoJ
            için karar metinlerinden doldurulur.
          </p>
        </section>
      )}

      {speeches.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Son konuşmalar</h2>
            <Link
              href={`/konusmalar?banka=${bank.code}`}
              className="text-sm text-accent hover:underline"
            >
              Tümü →
            </Link>
          </div>
          <ul className="overflow-hidden card">
            {speeches.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="text-sm text-muted tabular">
                  {formatDateTr(s.speechDate)}
                </span>
                <Link href={`/konusma/${s.id}`} className="flex-1 hover:text-accent">
                  {s.speakerName} — {s.title}
                </Link>
                <ScoreBadge score={s.hawkDoveScore} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/takvim" className="inline-block text-sm text-accent hover:underline">
        ← Tüm takvim
      </Link>
    </div>
  );
}
