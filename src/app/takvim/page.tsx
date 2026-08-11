import type { Metadata } from "next";
import Link from "next/link";
import { MeetingRow } from "@/components/MeetingRow";
import { ALL_BANKS, isBankCode } from "@/lib/banks";
import { getPastMeetings, getUpcomingMeetings } from "@/lib/data/meetings";
import { trtMonthLabel } from "@/lib/time";
import type { BankCode, Meeting } from "@/lib/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Toplantı takvimi",
  description:
    "Fed, ECB ve TCMB faiz toplantılarının tam takvimi — Türkiye saatiyle, geri sayımlı, takvime eklenebilir.",
};

export default async function CalendarPage({
  searchParams,
}: PageProps<"/takvim">) {
  const params = await searchParams;
  const raw = typeof params.banka === "string" ? params.banka : undefined;
  const bankCode: BankCode | undefined =
    raw && isBankCode(raw) ? raw : undefined;

  const now = new Date();
  const upcoming = await getUpcomingMeetings({ bankCode, now });
  const past = await getPastMeetings({ bankCode, limit: 8, now });

  const icalHref = bankCode ? `/takvim/takvim.ics?banka=${bankCode}` : "/takvim/takvim.ics";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Toplantı takvimi</h1>
        <a
          href={icalHref}
          className="rounded border border-border px-3 py-1.5 text-sm text-accent hover:border-accent"
        >
          Takvime ekle (.ics)
        </a>
      </div>

      <FilterBar active={bankCode} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Yaklaşan</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-5 text-muted">
            Bu filtre için yaklaşan toplantı yok.
          </p>
        ) : (
          <MonthGroupedList meetings={upcoming} now={now} />
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Son toplantılar</h2>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface opacity-80">
            {past.map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function FilterBar({ active }: { active?: BankCode }) {
  const items = [
    { code: undefined as BankCode | undefined, label: "Tümü" },
    ...ALL_BANKS.map((b) => ({ code: b.code, label: b.nameTr })),
  ];

  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = item.code === active;
        return (
          <Link
            key={item.label}
            href={item.code ? `/takvim?banka=${item.code}` : "/takvim"}
            className={
              "rounded-full border px-3 py-1 text-sm " +
              (isActive
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-muted hover:border-accent hover:text-accent")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Toplantıları Türkiye saatine göre ay başlıkları altında gruplar. */
function MonthGroupedList({ meetings, now }: { meetings: Meeting[]; now: Date }) {
  const groups = new Map<string, Meeting[]>();
  for (const m of meetings) {
    const key = trtMonthLabel(m.meetingAt);
    const list = groups.get(key);
    if (list) list.push(m);
    else groups.set(key, [m]);
  }

  return (
    <div className="space-y-5">
      {[...groups].map(([month, rows]) => (
        <div key={month}>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">
            {month}
          </h3>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface">
            {rows.map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
