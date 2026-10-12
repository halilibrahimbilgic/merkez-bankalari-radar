import type { Metadata } from "next";
import { BankFilter } from "@/components/BankFilter";
import { MeetingRow } from "@/components/MeetingRow";
import { isBankCode } from "@/lib/banks";
import {
  getBankCodesWithMeetings,
  getPastMeetings,
  getUpcomingMeetings,
} from "@/lib/data/meetings";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { monthLabel } from "@/lib/time";
import type { BankCode, Meeting } from "@/lib/types";

export function calendarMetadata(lang: Lang): Metadata {
  const t = L(lang);
  return {
    title: t("Toplantı takvimi", "Meeting calendar"),
    description: t(
      "Fed, ECB, TCMB, BoE, BoJ ve RBA faiz toplantılarının tam takvimi — Türkiye saatiyle, geri sayımlı, takvime eklenebilir.",
      "The full calendar of Fed, ECB, CBRT, BoE, BoJ and RBA rate meetings — in Turkey time, with countdowns, subscribable.",
    ),
    alternates: languageAlternates(lang, "/takvim"),
  };
}

export async function CalendarPage({
  lang,
  searchParams,
}: {
  lang: Lang;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = L(lang);
  const raw = typeof searchParams.banka === "string" ? searchParams.banka : undefined;
  const bankCode: BankCode | undefined = raw && isBankCode(raw) ? raw : undefined;

  const now = new Date();
  const upcoming = await getUpcomingMeetings({ bankCode, now });
  const past = await getPastMeetings({ bankCode, limit: 8, now });
  const availableCodes = await getBankCodesWithMeetings(now);

  // Takvim dosyası ve RSS tek dildedir (Türkçe); etkinlik başlıkları banka
  // kısaltmalarıyla okunur, bu yüzden İngilizce sayfa da aynı dosyayı verir.
  const icalHref = bankCode ? `/takvim/takvim.ics?banka=${bankCode}` : "/takvim/takvim.ics";
  // Abonelik, indirilen dosyadan farklı olarak takvim uygulamasınca düzenli
  // yenilenir: ertelenen ya da yeni eklenen toplantılar kendiliğinden düşer.
  const webcalHref = `${SITE_URL.replace(/^https?:/, "webcal:")}${icalHref}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("Toplantı takvimi", "Meeting calendar")}
        </h1>
        <div className="flex flex-wrap gap-2">
          <a
            href={webcalHref}
            className="rounded border border-border px-3 py-1.5 text-sm text-accent hover:border-accent"
          >
            {t("Takvime abone ol", "Subscribe to calendar")}
          </a>
          <a
            href={icalHref}
            className="rounded border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
          >
            {t(".ics indir", "Download .ics")}
          </a>
          <a
            href="/rss.xml"
            className="rounded border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
          >
            RSS
          </a>
        </div>
      </div>
      <p className="-mt-5 text-sm text-muted">
        {t(
          "Takvim aboneliği her kararı bir gün ve bir saat önce hatırlatır; RSS akışı karardan bir hafta önce ve karar açıklanınca öğe yayımlar.",
          "The calendar subscription reminds you of each decision one day and one hour before; the RSS feed posts an item one week before and when the decision is announced. Event titles and the feed are in Turkish.",
        )}
      </p>

      <BankFilter
        basePath={localePath(lang, "/takvim")}
        active={bankCode}
        availableCodes={availableCodes}
        lang={lang}
      />

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("Yaklaşan", "Upcoming")}</h2>
        {upcoming.length === 0 ? (
          <p className="card p-5 text-muted">
            {t("Bu filtre için yaklaşan toplantı yok.", "No upcoming meetings for this filter.")}
          </p>
        ) : (
          <MonthGroupedList meetings={upcoming} now={now} lang={lang} />
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("Son toplantılar", "Recent meetings")}</h2>
          <ul className="overflow-hidden card opacity-80">
            {past.map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} lang={lang} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Toplantıları Türkiye saatine göre ay başlıkları altında gruplar. */
function MonthGroupedList({ meetings, now, lang }: { meetings: Meeting[]; now: Date; lang: Lang }) {
  const groups = new Map<string, Meeting[]>();
  for (const m of meetings) {
    const key = monthLabel(m.meetingAt, lang);
    const list = groups.get(key);
    if (list) list.push(m);
    else groups.set(key, [m]);
  }

  return (
    <div className="space-y-5">
      {[...groups].map(([month, rows]) => (
        <div key={month}>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">{month}</h3>
          <ul className="overflow-hidden card">
            {rows.map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} lang={lang} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
