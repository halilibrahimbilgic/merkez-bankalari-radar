import Link from "next/link";
import { BANKS, bankColorVar, bankCountry, bankName } from "@/lib/banks";
import { isPendingDecision, pendingNote } from "@/lib/decision-format";
import { fmtPercent, fmtSignedPercent, L, localePath, type Lang } from "@/lib/i18n";
import type { RealRate } from "@/lib/real-rates";
import type { FundingNow } from "@/lib/tcmb-funding";
import type { BankCode, Meeting } from "@/lib/types";
import {
  computeCountdownParts,
  countdownLabel,
  formatDate,
  formatTimeTrt,
} from "@/lib/time";
import { formatCurrentRate, type CurrentRate } from "@/lib/data/rates";
import type { BankScoreSummary } from "@/lib/data/speeches";
import { AddToCalendar } from "./AddToCalendar";
import { LiveCountdown } from "./LiveCountdown";
import { RateOdds, type OddsRow } from "./RateOdds";
import { formatScore, scoreLabel, scoreToneClass } from "./ScoreBadge";

/**
 * Ana sayfadaki banka kartı — bu kategorinin standart gösterge birimi.
 * Bir bakışta: sıradaki karar, geri sayım, güncel faiz, eğilim, olasılıklar.
 */
export function BankCard({
  bankCode,
  nextMeeting,
  currentRate,
  score,
  odds,
  oddsNote,
  oddsTitle,
  surveyNote,
  realRate,
  funding,
  lang,
}: {
  bankCode: BankCode;
  nextMeeting?: Meeting;
  currentRate?: CurrentRate;
  score?: BankScoreSummary;
  odds?: OddsRow[];
  oddsNote?: string;
  /** Varsayılan "Piyasa fiyatlaması". */
  oddsTitle?: string;
  /** Anket beklentisi (TCMB) — piyasa fiyatlamasından ayrı başlıkla. */
  surveyNote?: string;
  realRate?: RealRate;
  /** TCMB: fiilî fonlama politika faizinden ayrıştığında ayrı satır. */
  funding?: FundingNow;
  lang: Lang;
}) {
  const t = L(lang);
  const bank = BANKS[bankCode];
  const name = bankName(bank, lang);
  const href = localePath(lang, `/banka/${bank.code}`);
  const pending = nextMeeting && isPendingDecision(nextMeeting, new Date());

  return (
    <article className="flex flex-col card p-5">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">
          <Link href={href} className="inline-flex min-h-9 items-center gap-2 hover:text-accent">
            <span
              aria-hidden
              className="inline-block size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: bankColorVar(bank.code) }}
            />
            {name}
          </Link>
        </h3>
        <span className="text-sm text-muted">{bankCountry(bank, lang)}</span>
      </header>

      {nextMeeting ? (
        <div className="mt-3">
          <div className="text-sm text-muted">
            {pending ? t("Karar günü", "Decision day") : t("Sıradaki karar", "Next decision")}
          </div>
          <div className="tabular mt-0.5 font-medium">
            {formatDate(nextMeeting.meetingAt, lang)}
            {!nextMeeting.timeTbd && ` · ${formatTimeTrt(nextMeeting.meetingAt)} TRT`}
          </div>
          <div className="mt-2">
            {pending ? (
              <p className="text-sm font-medium">{pendingNote(nextMeeting, lang)}</p>
            ) : nextMeeting.timeTbd ? (
              // Saat yer tutucu (BoJ): gün düzeyinden ince geri sayım yanıltır.
              <span className="text-sm text-muted">
                {countdownLabel(nextMeeting.meetingAt, undefined, lang)} ·{" "}
                {t("saat açıklanmadı", "time not announced")}
              </span>
            ) : (
              <LiveCountdown
                meetingAt={nextMeeting.meetingAt}
                initial={computeCountdownParts(nextMeeting.meetingAt)}
                lang={lang}
              />
            )}
          </div>
          {!pending && <AddToCalendar meeting={nextMeeting} lang={lang} className="mt-2" />}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {t("Takvim verisi henüz eklenmedi.", "No calendar data yet.")}
        </p>
      )}

      <dl className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-muted">{t("Politika faizi", "Policy rate")}</dt>
          <dd className="tabular font-semibold">
            {currentRate ? (
              formatCurrentRate(currentRate, lang)
            ) : (
              <span
                className="text-muted"
                title={t(
                  "Bu banka için faiz kaynağı henüz bağlanmadı",
                  "No rate source connected for this bank yet",
                )}
              >
                —
              </span>
            )}
          </dd>
        </div>
        {funding?.divergence && (
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">
              <Link href={`${href}#fiili-fonlama`} className="inline-flex min-h-6 items-center hover:text-accent">
                {t("Fiilî fonlama", "Effective funding")}
              </Link>
            </dt>
            <dd className="tabular font-semibold">{fmtPercent(funding.aofm, lang)}</dd>
          </div>
        )}
        {realRate && (
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">
              <Link href={localePath(lang, "/reel-faiz")} className="inline-flex min-h-6 items-center hover:text-accent">
                {t("Reel faiz", "Real rate")}
              </Link>
            </dt>
            <dd className="tabular font-semibold">{fmtSignedPercent(realRate.real, lang)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-muted">{t("Şahin/güvercin", "Hawk/dove")}</dt>
          <dd className="tabular font-semibold">
            {score ? (
              <span className={scoreToneClass(score.averageScore)}>
                {formatScore(score.averageScore, lang)}{" "}
                <span className="text-xs font-normal">
                  ({scoreLabel(score.averageScore, lang)})
                </span>
              </span>
            ) : (
              <span
                className="text-muted"
                title={t(
                  "Bu banka için skorlanmış konuşma yok",
                  "No scored speeches for this bank",
                )}
              >
                —
              </span>
            )}
          </dd>
        </div>
      </dl>

      <ExpectationDetails odds={odds} oddsTitle={oddsTitle} oddsNote={oddsNote} surveyNote={surveyNote} lang={lang} />

      <Link
        href={href}
        className="mt-auto inline-flex min-h-9 items-center pt-4 text-sm text-accent hover:underline"
      >
        {t(`${name} ayrıntısı →`, `${name} details →`)}
      </Link>
    </article>
  );
}

/** Beklenti blokları — piyasa olasılıkları ve/veya anket; kart ve banka sayfası ortak. */
export function ExpectationDetails({
  odds,
  oddsTitle,
  oddsNote,
  surveyNote,
  lang,
}: {
  odds?: OddsRow[];
  oddsTitle?: string;
  oddsNote?: string;
  surveyNote?: string;
  lang: Lang;
}) {
  const t = L(lang);
  return (
    <>
      {odds && odds.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 text-sm text-muted">{oddsTitle ?? t("Piyasa fiyatlaması", "Market pricing")}</div>
          <RateOdds rows={odds} lang={lang} />
          {oddsNote && <p className="mt-2 text-xs text-muted">{oddsNote}</p>}
        </div>
      )}

      {surveyNote && (
        <div className="mt-4 border-t border-border pt-3 text-sm">
          <div className="mb-1 text-muted">{t("Ekonomist beklentisi (anket)", "Economist expectation (survey)")}</div>
          <p>{surveyNote}</p>
        </div>
      )}
    </>
  );
}
