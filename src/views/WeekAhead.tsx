import Link from "next/link";
import { BankTag } from "@/components/ScoreBadge";
import { SurpriseBadge } from "@/components/SurpriseBadge";
import { SectionHeader } from "@/components/ui";
import { BANKS, bankName } from "@/lib/banks";
import { getDecisionView } from "@/lib/data/decisions";
import { getEvents } from "@/lib/data/events";
import { getExpectations } from "@/lib/data/expectations";
import { getAllMeetings } from "@/lib/data/meetings";
import { getInflation } from "@/lib/data/inflation";
import { getCurrentRates } from "@/lib/data/rates";
import { cpiReferenceMonth } from "@/lib/cpi-release";
import { decisionSentence, isPendingDecision, pendingNote } from "@/lib/decision-format";
import type { Expectations } from "@/lib/expectations";
import { fmtBp, fmtPercent, L, localePath, type Lang } from "@/lib/i18n";
import { moveOdds } from "@/lib/implied-path";
import type { InflationReading } from "@/lib/sources/inflation";
import type { CalendarEvent, EventKind } from "@/lib/sources/speaking-calendars";
import { countdownLabel, daysUntil, formatDate, formatTimeTrt, formatWeekday, monthLabel, trtDayKey } from "@/lib/time";
import type { Meeting } from "@/lib/types";

/**
 * "Bu hafta": önümüzdeki yedi günün faiz kararları (beklentisiyle) ve Fed ile
 * ECB yönetim kurullarının konuşma ve yayınları, Türkiye saatiyle, güne göre.
 * Karar yoksa sıradaki kararı söyler — sessiz bir hafta da bilgi taşır.
 */
const DAYS = 7;
/** Öne çıkan etkinlik sayısı; gerisi "programın tamamı" altında (telefonda bölüm ekranları dolduruyordu). */
const HIGHLIGHTS = 5;

type Item = { at: string; meeting: Meeting } | { at: string; event: CalendarEvent };

/** Piyasa için önem sırası: parlamento sunumu, yayın, başkanların sözleri, diğerleri. */
function weight(e: CalendarEvent): number {
  // Türkiye enflasyonu bu sitenin okuru için haftanın en önemli verisi.
  if (e.kind === "cpi") return e.bankCode === "tcmb" ? 0 : 1;
  if (e.kind === "testimony") return 0;
  if (e.kind === "minutes" || e.kind === "beige-book") return 1;
  if (e.role === "Chair" || e.role === "President") return 2;
  return e.kind === "speech" ? 3 : 4;
}

function groupByDay(items: Item[]): [string, Item[]][] {
  const byDay = new Map<string, Item[]>();
  for (const it of [...items].sort((a, b) => a.at.localeCompare(b.at))) {
    const key = trtDayKey(it.at);
    byDay.set(key, [...(byDay.get(key) ?? []), it]);
  }
  return [...byDay];
}

export async function WeekAhead({ lang, now }: { lang: Lang; now: Date }) {
  const t = L(lang);
  const [meetings, events, expectations, rates, inflation] = await Promise.all([
    getAllMeetings(),
    getEvents(),
    getExpectations(),
    getCurrentRates(),
    getInflation(),
  ]);
  const today = trtDayKey(now.toISOString());
  const inWeek = (iso: string) => {
    const d = daysUntil(iso, now);
    return d >= 0 && d < DAYS;
  };

  const decisions = meetings.filter(
    (m) => m.status !== "cancelled" && (m.type === "rate_decision" || m.type === "projections") && inWeek(m.meetingAt),
  );
  const weekEvents = events.filter((e) => inWeek(e.at));
  const all: Item[] = [
    ...decisions.map((m) => ({ at: m.meetingAt, meeting: m })),
    ...weekEvents.map((e) => ({ at: e.at, event: e })),
  ];
  // Öne çıkanlar yalnızca henüz olmamışlardan: bugünün sabah konuşmaları
  // akşam da beş yerden birini tutuyordu. Geçmişler tam programda kalır.
  const highlighted = new Set(
    weekEvents
      .filter((e) => e.timeTbd || new Date(e.at) > now)
      .sort((a, b) => weight(a) - weight(b) || a.at.localeCompare(b.at))
      .slice(0, HIGHLIGHTS),
  );
  const main = all.filter((it) => "meeting" in it || highlighted.has(it.event));
  const hidden = weekEvents.length - highlighted.size;

  const nextDecision =
    decisions.length === 0
      ? meetings
          .filter((m) => m.status !== "cancelled" && new Date(m.meetingAt) > now)
          .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt))[0]
      : undefined;
  const lastDay = new Date(Date.parse(`${today}T12:00:00Z`) + (DAYS - 1) * 86_400_000).toISOString();

  return (
    <section aria-labelledby="bu-hafta">
      <SectionHeader
        id="bu-hafta"
        title={t("Bu hafta", "This week")}
        description={t(
          `${formatDate(now.toISOString(), lang)} – ${formatDate(lastDay, lang)} · faiz kararları, merkez bankacılarının programı ve enflasyon verileri, Türkiye saatiyle`,
          `${formatDate(now.toISOString(), lang)} – ${formatDate(lastDay, lang)} · rate decisions, central bankers' schedules and inflation releases, in Turkey time`,
        )}
        action={{ href: localePath(lang, "/takvim"), label: t("Takvim", "Calendar") }}
      />
      <div className="card p-4 sm:p-5">
        {nextDecision && (
          <p className="mb-4 text-sm">
            <span className="font-medium">{t("Bu hafta faiz kararı yok.", "No rate decisions this week.")}</span>{" "}
            <span className="text-muted">{t("Sıradaki:", "Next:")}</span>{" "}
            <Link href={localePath(lang, `/banka/${nextDecision.bankCode}`)} className="text-accent hover:underline">
              {bankName(BANKS[nextDecision.bankCode], lang)} · {formatDate(nextDecision.meetingAt, lang)}
            </Link>{" "}
            <span className="text-muted">({countdownLabel(nextDecision.meetingAt, now, lang)})</span>
          </p>
        )}

        {all.length === 0 ? (
          <p className="text-sm text-muted">
            {t(
              "Önümüzdeki yedi günde Fed ve ECB takviminde de konuşma ya da yayın görünmüyor.",
              "No speeches or releases on the Fed and ECB calendars in the next seven days either.",
            )}
          </p>
        ) : (
          <>
            <DayList
              days={groupByDay(main)}
              now={now}
              lang={lang}
              expectations={expectations}
              rates={rates}
              inflation={inflation}
            />
            {hidden > 0 && (
              <details className="group mt-4 border-t border-border pt-3">
                <summary className="inline-flex min-h-9 cursor-pointer items-center text-sm text-accent hover:underline">
                  {t(`Programın tamamı (${weekEvents.length} etkinlik)`, `Full schedule (${weekEvents.length} events)`)}
                </summary>
                <div className="mt-3">
                  <DayList
                    days={groupByDay(all)}
                    now={now}
                    lang={lang}
                    expectations={expectations}
                    rates={rates}
                    inflation={inflation}
                  />
                </div>
              </details>
            )}
          </>
        )}

        <p className="mt-4 text-xs text-muted">
          {t(
            "Konuşmalar Fed ve ECB yönetim kurullarının resmî takviminden; diğer bankalar ileriye dönük program yayımlamıyor. Etkinlik adları kaynağın dilinde (İngilizce). Enflasyon tarihleri ABD, Türkiye, İngiltere, Japonya ve Avustralya'nın istatistik kurumlarından; Eurostat takvimi makinece okunamıyor.",
            "Speeches come from the official calendars of the Fed Board and the ECB Executive Board; the other banks do not publish forward schedules. Inflation release dates come from the statistics agencies of the US, Türkiye, the UK, Japan and Australia; Eurostat's calendar is not machine-readable.",
          )}
        </p>
      </div>
    </section>
  );
}

function DayList({
  days,
  now,
  lang,
  expectations,
  rates,
  inflation,
}: {
  days: [string, Item[]][];
  now: Date;
  lang: Lang;
  expectations: Expectations;
  rates: { bankCode: Meeting["bankCode"]; rate: number }[];
  inflation: InflationReading[];
}) {
  return (
    <ol className="space-y-4">
      {days.map(([day, list]) => (
        <li key={day}>
          <h3 className="mb-2 text-sm font-medium text-muted">{dayLabel(day, now, lang)}</h3>
          <ul className="space-y-2">
            {list.map((it) =>
              "meeting" in it ? (
                <DecisionItem
                  key={it.meeting.id}
                  meeting={it.meeting}
                  now={now}
                  lang={lang}
                  expectations={expectations}
                  currentRate={rates.find((r) => r.bankCode === it.meeting.bankCode)?.rate}
                />
              ) : (
                <EventItem
                  key={it.event.id}
                  event={it.event}
                  past={!it.event.timeTbd && new Date(it.event.at) <= now}
                  reading={inflation.find((r) => r.bankCode === it.event.bankCode)}
                  lang={lang}
                />
              ),
            )}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function dayLabel(day: string, now: Date, lang: Lang): string {
  const iso = `${day}T12:00:00Z`;
  const d = daysUntil(iso, now);
  const rel = d === 0 ? (lang === "en" ? "Today" : "Bugün") : d === 1 ? (lang === "en" ? "Tomorrow" : "Yarın") : formatWeekday(iso, lang);
  return `${rel} · ${formatDate(iso, lang)}`;
}

async function DecisionItem({
  meeting,
  now,
  lang,
  expectations,
  currentRate,
}: {
  meeting: Meeting;
  now: Date;
  lang: Lang;
  expectations: Expectations;
  currentRate?: number;
}) {
  const t = L(lang);
  const decided = new Date(meeting.meetingAt) <= now && meeting.decisionRate !== undefined;
  const view = decided ? await getDecisionView(meeting.id) : undefined;
  return (
    <li className="rounded-lg bg-surface-sunken p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <BankTag code={meeting.bankCode} lang={lang} />
        <span className="font-medium">{t("faiz kararı", "rate decision")}</span>
        <span className="tabular text-sm text-muted">
          {meeting.timeTbd ? t("saat açıklanmadı", "time not announced") : `${formatTimeTrt(meeting.meetingAt)} TRT`}
        </span>
        {meeting.type === "projections" && (
          <span className="rounded bg-accent-soft px-1.5 py-0.5 text-xs text-accent">{t("projeksiyon", "projections")}</span>
        )}
      </div>
      {view ? (
        <p className="mt-1.5 text-sm">
          <Link href={localePath(lang, `/karar/${meeting.id}`)} className="hover:text-accent">
            {decisionSentence(meeting, lang)}
          </Link>{" "}
          {view.expectation && (
            <SurpriseBadge label={view.expectation.surprise.label} bp={view.expectation.surprise.bp} lang={lang} />
          )}
        </p>
      ) : isPendingDecision(meeting, now) ? (
        <p className="mt-1.5 text-sm">
          <span className="font-medium">{pendingNote(meeting, lang)}</span>{" "}
          <span className="text-muted">{expectationLine(meeting, expectations, currentRate, lang)}</span>
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-muted">{expectationLine(meeting, expectations, currentRate, lang)}</p>
      )}
    </li>
  );
}

/** Karardan önceki beklentinin tek satırlık özeti — kaynak türünü söyleyerek. */
function expectationLine(m: Meeting, e: Expectations, currentRate: number | undefined, lang: Lang): React.ReactNode {
  const t = L(lang);
  switch (m.bankCode) {
    case "boe": {
      const x = e.boe?.meetings.find((y) => y.meetingId === m.id);
      if (!x) break;
      const o = moveOdds(x.changeBp);
      return o.direction === "hold"
        ? t("Piyasa fiyatlaması: değişiklik beklenmiyor.", "Market pricing: no change expected.")
        : t(
            `Piyasa fiyatlaması: yaklaşık ${fmtPercent(o.pct, lang, 0)} ihtimalle 25 bp ${o.direction === "hike" ? "artırım" : "indirim"} (${fmtBp(x.changeBp)}).`,
            `Market pricing: about a ${fmtPercent(o.pct, lang, 0)} chance of a 25 bp ${o.direction === "hike" ? "hike" : "cut"} (${fmtBp(x.changeBp)}).`,
          );
    }
    case "ecb": {
      const x = e.ecb?.meetings.find((y) => y.meetingId === m.id);
      if (!x) break;
      if (x.odds) {
        const [label, pct] = (
          [
            [t("artırım", "a hike"), x.odds.hike],
            [t("sabit", "a hold"), x.odds.hold],
            [t("indirim", "a cut"), x.odds.cut],
          ] as const
        ).reduce((a, b) => (b[1] > a[1] ? b : a));
        return t(
          `Analist anketi: ${fmtPercent(pct, lang, 0)} ${label}; medyan ${fmtPercent(x.median, lang)}.`,
          `Analyst survey: ${fmtPercent(pct, lang, 0)} on ${label}; median ${fmtPercent(x.median, lang)}.`,
        );
      }
      return t(`Analist anketi medyanı ${fmtPercent(x.median, lang)}.`, `Analyst survey median ${fmtPercent(x.median, lang)}.`);
    }
    case "tcmb": {
      const x = e.tcmb?.meetings.find((y) => y.meetingId === m.id);
      if (!x) break;
      const diff = currentRate === undefined ? undefined : Math.round((x.expectedRate - currentRate) * 100);
      return t(
        `Ekonomist anketi ortalaması ${fmtPercent(x.expectedRate, lang)}${diff === undefined ? "" : ` (bugüne göre ${fmtBp(diff)})`}.`,
        `Economist survey average ${fmtPercent(x.expectedRate, lang)}${diff === undefined ? "" : ` (${fmtBp(diff)} vs today)`}.`,
      );
    }
    case "fed":
      return (
        <Link href={`${localePath(lang, "/faiz-olasiligi")}#fed`} className="text-accent hover:underline">
          {t("Piyasa olasılıkları (üç aylık dönemler) →", "Market probabilities (three-month periods) →")}
        </Link>
      );
    default:
      return t("Bu banka için yayımlanabilir bir beklenti kaynağı yok.", "No republishable expectation source for this bank.");
  }
  return t("Bu toplantı için beklenti henüz yok.", "No expectation for this meeting yet.");
}

const KIND: Record<EventKind, [string, string]> = {
  speech: ["konuşma", "speech"],
  discussion: ["söyleşi / panel", "discussion / panel"],
  testimony: ["parlamento sunumu", "testimony"],
  minutes: ["FOMC tutanağı", "FOMC minutes"],
  "beige-book": ["Bej Kitap (bölgesel ekonomi raporu)", "Beige Book (regional economy report)"],
  cpi: ["enflasyon verisi", "inflation data"],
};

const ROLE_TR: Record<string, string> = {
  Chair: "Başkan",
  "Vice Chair": "Başkan Yardımcısı",
  "Vice Chair for Supervision": "Denetimden Sorumlu Başkan Yardımcısı",
  Governor: "Yönetim Kurulu Üyesi",
  President: "Başkan",
};

function EventItem({
  event,
  past,
  reading,
  lang,
}: {
  event: CalendarEvent;
  past: boolean;
  /** O ekonominin son TÜFE okuması (yalnızca veri açıklamalarında kullanılır). */
  reading?: InflationReading;
  lang: Lang;
}) {
  const t = L(lang);
  // Geçmiş etkinlik soluklaştırılmaz (gri metnin kontrastı düşerdi): saatin
  // altında "geçti" yazar, metin gri tona iner.
  const time = (
    <span className="tabular w-11 shrink-0 pt-0.5 text-muted">
      {event.timeTbd ? "—" : formatTimeTrt(event.at)}
      {past && <span className="block text-xs">{t("geçti", "past")}</span>}
    </span>
  );
  if (event.kind === "cpi") {
    const bank = BANKS[event.bankCode];
    return (
      <li className={`flex gap-3 text-sm ${past ? "text-muted" : ""}`}>
        {time}
        <div className="min-w-0 flex-1">
          <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted">{t("veri", "data")}</span>{" "}
          <span className="font-medium">
            {t(`${bank.countryTr} enflasyonu (TÜFE)`, `${bank.countryEn} inflation (CPI)`)}
          </span>
          {event.period && lang === "tr" && <span className="text-muted"> · {event.period}</span>}
          {reading && <CpiReading reading={reading} releasedAt={event.at} past={past} lang={lang} />}
        </div>
      </li>
    );
  }
  const [kindTr, kindEn] = KIND[event.kind];
  const role = event.role && (lang === "en" ? event.role : (ROLE_TR[event.role] ?? event.role));
  const publication = event.kind === "minutes" || event.kind === "beige-book";
  return (
    <li className={`flex gap-3 text-sm ${past ? "text-muted" : ""}`}>
      {time}
      <div className="min-w-0 flex-1">
        <div>
          <BankTag code={event.bankCode} lang={lang} />{" "}
          <span className="font-medium">{publication ? t(kindTr, kindEn) : event.speaker}</span>
          {!publication && role && <span className="text-muted"> · {role}</span>}
        </div>
        {!publication && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted sm:line-clamp-1" title={event.title}>
            {t(kindTr, kindEn)}: <span lang="en">{event.title}</span>
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Açıklanmadan önce bir önceki ayın rakamı, açıklanıp veri gelince yenisi.
 * Haber işi açıklamadan sonra yarım saatte bir bakar (fetch:inflation
 * --if-due). Beklenti (konsensüs) lisanslı veri; gösterilmez.
 */
function CpiReading({
  reading,
  releasedAt,
  past,
  lang,
}: {
  reading: InflationReading;
  releasedAt: string;
  past: boolean;
  lang: Lang;
}) {
  const t = L(lang);
  const released = past && reading.period >= cpiReferenceMonth(releasedAt);
  const value = fmtPercent(reading.yoy, lang, 1);
  const month = monthLabel(`${reading.period}-15T12:00:00Z`, lang);
  return (
    <p className={`mt-0.5 text-xs ${released ? "font-medium text-foreground" : "text-muted"}`}>
      {released
        ? t(`Açıklandı: yıllık ${value} (${month})`, `Released: ${value} y/y (${month})`)
        : t(`Önceki: yıllık ${value} (${month})`, `Previous: ${value} y/y (${month})`)}
    </p>
  );
}
