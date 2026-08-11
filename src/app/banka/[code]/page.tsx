import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MeetingRow } from "@/components/MeetingRow";
import { ALL_BANKS, getBank } from "@/lib/banks";
import { getPastMeetings, getUpcomingMeetings } from "@/lib/data/meetings";
import { formatMeetingTr } from "@/lib/time";

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

      {next ? (
        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="text-sm text-muted">Sıradaki toplantı</div>
          <div className="mt-1 text-lg font-semibold tabular">
            {formatMeetingTr(next.meetingAt, next.timeTbd)}
          </div>
        </section>
      ) : (
        <p className="rounded-lg border border-border bg-surface p-5 text-muted">
          Bu banka için henüz takvim verisi yok. MVP&apos;de Fed, ECB ve TCMB canlıdır.
        </p>
      )}

      {upcoming.length > 1 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Yaklaşan toplantılar</h2>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface">
            {upcoming.slice(1).map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Geçmiş toplantılar</h2>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface opacity-80">
            {past.map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} />
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">
            Karar oranları Faz 2&apos;de FRED / EVDS / ECB SDW API&apos;lerinden doldurulacak.
          </p>
        </section>
      )}

      <Link href="/takvim" className="inline-block text-sm text-accent hover:underline">
        ← Tüm takvim
      </Link>
    </div>
  );
}
