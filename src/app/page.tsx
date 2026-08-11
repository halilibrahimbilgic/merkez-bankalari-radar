import Link from "next/link";
import { MeetingRow } from "@/components/MeetingRow";
import { MVP_BANK_CODES, BANKS } from "@/lib/banks";
import { getUpcomingMeetings } from "@/lib/data/meetings";
import { countdownLabelTr, formatMeetingTr } from "@/lib/time";

export const revalidate = 3600;

export default async function HomePage() {
  const now = new Date();
  const upcoming = await getUpcomingMeetings({ limit: 8, now });
  const next = upcoming[0];

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Merkez bankası faiz kararlarını Türkçe takip et
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Fed, ECB ve TCMB toplantı takvimi Türkiye saatiyle tek yerde. Faiz
          olasılıkları ve yetkili konuşmalarının şahin/güvercin skoru sırada.
        </p>
      </section>

      {next && (
        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="text-sm text-muted">Sıradaki karar</div>
          <div className="mt-1 text-xl font-semibold">
            {BANKS[next.bankCode].nameTr} · {countdownLabelTr(next.meetingAt, now)}
          </div>
          <div className="mt-1 text-muted tabular">
            {formatMeetingTr(next.meetingAt, next.timeTbd)}
          </div>
          <div className="mt-1 text-sm text-muted">
            {BANKS[next.bankCode].rateNameTr}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Yaklaşan toplantılar</h2>
          <Link href="/takvim" className="text-sm text-accent hover:underline">
            Tüm takvim →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border bg-surface">
            {upcoming.map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Bankalar</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {MVP_BANK_CODES.map((code) => {
            const bank = BANKS[code];
            return (
              <Link
                key={code}
                href={`/banka/${code}`}
                className="rounded-lg border border-border bg-surface p-4 hover:border-accent"
              >
                <div className="font-semibold">{bank.nameTr}</div>
                <div className="text-sm text-muted">{bank.countryTr}</div>
                <div className="mt-2 text-xs text-muted">{bank.rateNameTr}</div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 text-muted">
      Takvim verisi henüz yüklenmedi.{" "}
      <code className="rounded bg-accent-soft px-1 text-accent">
        npm run fetch:meetings
      </code>{" "}
      komutunu çalıştırın.
    </div>
  );
}
