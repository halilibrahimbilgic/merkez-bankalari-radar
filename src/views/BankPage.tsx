import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MeetingRow } from "@/components/MeetingRow";
import { ScoreBadge } from "@/components/ScoreBadge";
import {
  bankCountry,
  bankFullName,
  bankName,
  bankRateName,
  getBank,
} from "@/lib/banks";
import { getPastMeetings, getUpcomingMeetings } from "@/lib/data/meetings";
import { formatCurrentRate, getCurrentRate } from "@/lib/data/rates";
import { getBankScoreSummaries, getSpeeches } from "@/lib/data/speeches";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { speechTitle } from "@/lib/speech-i18n";
import { formatDate, formatMeeting, formatTimeTrt } from "@/lib/time";

export async function bankMetadata(lang: Lang, code: string): Promise<Metadata> {
  const bank = getBank(code);
  if (!bank) return {};
  const t = L(lang);
  const name = bankName(bank, lang);

  // Başlık, insanların gerçekten aradığı soruyla başlar ("TCMB faiz kararı ne
  // zaman") ve cevabı içerir; tarih ve faiz günlük veriyle güncellenir.
  const [next] = await getUpcomingMeetings({ bankCode: bank.code });
  const rate = await getCurrentRate(bank.code);
  const when = next
    ? next.timeTbd
      ? formatDate(next.meetingAt, lang)
      : `${formatDate(next.meetingAt, lang)}, ${formatTimeTrt(next.meetingAt)} TRT`
    : undefined;

  return {
    title: next
      ? t(
          `${name} faiz kararı ne zaman? Sıradaki: ${formatDate(next.meetingAt, lang)}`,
          `When is the next ${name} rate decision? ${formatDate(next.meetingAt, lang)}`,
        )
      : t(`${name} faiz kararları`, `${name} rate decisions`),
    description: [
      rate &&
        t(
          `${name} ${bank.rateNameTr}: ${formatCurrentRate(rate, lang)} (${formatDate(rate.asOf, lang)} itibarıyla).`,
          `${name} ${bank.rateNameEn}: ${formatCurrentRate(rate, lang)} (since ${formatDate(rate.asOf, lang)}).`,
        ),
      when && t(`Sıradaki karar ${when}.`, `Next decision: ${when}.`),
      t(
        "Geçmiş kararlar ve Türkiye saatiyle toplantı takvimi.",
        "Past decisions and the meeting calendar in Turkey time.",
      ),
    ]
      .filter(Boolean)
      .join(" "),
    alternates: languageAlternates(lang, `/banka/${bank.code}`),
  };
}

export async function BankPage({ lang, code }: { lang: Lang; code: string }) {
  const bank = getBank(code);
  if (!bank) notFound();
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);
  const name = bankName(bank, lang);

  const now = new Date();
  const upcoming = await getUpcomingMeetings({ bankCode: bank.code, now });
  const past = await getPastMeetings({ bankCode: bank.code, limit: 12, now });
  const next = upcoming[0];
  const currentRate = await getCurrentRate(bank.code);
  const speeches = await getSpeeches({ bankCode: bank.code, limit: 5 });
  const scoreSummary = (await getBankScoreSummaries()).find((s) => s.bankCode === bank.code);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {name}{" "}
          <span className="text-base font-normal text-muted">({bankFullName(bank, lang)})</span>
        </h1>
        <p className="mt-1 text-muted">
          {bankCountry(bank, lang)} · {bankRateName(bank, lang)}
        </p>
        <a
          href={bank.websiteUrl}
          rel="noopener noreferrer nofollow"
          target="_blank"
          className="mt-1 inline-block text-sm text-accent hover:underline"
        >
          {t("Resmî takvim sayfası →", "Official calendar page →")}
        </a>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {currentRate && (
          <section className="card p-5">
            <div className="text-sm text-muted">{t("Güncel politika faizi", "Current policy rate")}</div>
            <div className="mt-1 text-2xl font-semibold tabular">
              {formatCurrentRate(currentRate, lang)}
            </div>
            <div className="mt-1 text-sm text-muted tabular">
              {t(
                `${formatDate(currentRate.asOf, lang)} itibarıyla`,
                `Since ${formatDate(currentRate.asOf, lang)}`,
              )}
            </div>
          </section>
        )}
        {scoreSummary && (
          <section className="card p-5">
            <div className="text-sm text-muted">{t("Şahin/güvercin eğilimi", "Hawk/dove tilt")}</div>
            <div className="mt-1 text-2xl">
              <ScoreBadge score={scoreSummary.averageScore} lang={lang} />
            </div>
            <div className="mt-1 text-sm text-muted tabular">
              {t(
                `${scoreSummary.speechCount} sinyalli konuşmanın ortalaması`,
                `Average of ${scoreSummary.speechCount} speeches with a policy signal`,
              )}
            </div>
          </section>
        )}
      </div>

      {next ? (
        <section className="card p-5">
          <div className="text-sm text-muted">{t("Sıradaki toplantı", "Next meeting")}</div>
          <div className="mt-1 text-lg font-semibold tabular">
            {formatMeeting(next.meetingAt, next.timeTbd, lang)}
          </div>
        </section>
      ) : (
        <p className="card p-5 text-muted">
          {t("Bu banka için henüz takvim verisi yok.", "No calendar data for this bank yet.")}
        </p>
      )}

      {upcoming.length > 1 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("Yaklaşan toplantılar", "Upcoming meetings")}</h2>
          <ul className="overflow-hidden card">
            {upcoming.slice(1).map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} lang={lang} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("Geçmiş toplantılar", "Past meetings")}</h2>
          <ul className="overflow-hidden card opacity-80">
            {past.map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} lang={lang} />
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">
            {t(
              "Karar oranları Fed için FRED, ECB için ECB Data Portal, TCMB için EVDS, BoE için MPC oylama geçmişinden, RBA için F1 tablosundan, BoJ için karar metinlerinden doldurulur.",
              "Decision rates come from FRED for the Fed, the ECB Data Portal for the ECB, EVDS for the CBRT, the MPC voting history for the BoE, table F1 for the RBA and the policy statements for the BoJ.",
            )}
          </p>
        </section>
      )}

      {speeches.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{t("Son konuşmalar", "Recent speeches")}</h2>
            <Link
              href={`${p("/konusmalar")}?banka=${bank.code}`}
              className="text-sm text-accent hover:underline"
            >
              {t("Tümü →", "All →")}
            </Link>
          </div>
          <ul className="overflow-hidden card">
            {speeches.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="text-sm text-muted tabular">{formatDate(s.speechDate, lang)}</span>
                <Link href={p(`/konusma/${s.id}`)} className="flex-1 hover:text-accent">
                  {s.speakerName} — {speechTitle(s, lang)}
                </Link>
                <ScoreBadge score={s.hawkDoveScore} hasPolicySignal={s.hasPolicySignal} lang={lang} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href={p("/takvim")} className="inline-block text-sm text-accent hover:underline">
        {t("← Tüm takvim", "← Full calendar")}
      </Link>
    </div>
  );
}
