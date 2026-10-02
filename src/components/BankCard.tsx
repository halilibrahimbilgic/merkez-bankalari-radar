import Link from "next/link";
import { BANKS, bankColorVar } from "@/lib/banks";
import type { BankCode, Meeting } from "@/lib/types";
import { computeCountdownParts, formatDateTr, formatTimeTrt } from "@/lib/time";
import { formatCurrentRate, type CurrentRate } from "@/lib/data/rates";
import type { BankScoreSummary } from "@/lib/data/speeches";
import { LiveCountdown } from "./LiveCountdown";
import { RateOdds, type OddsRow } from "./RateOdds";
import { formatScore, scoreLabelTr, scoreToneClass } from "./ScoreBadge";

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
}: {
  bankCode: BankCode;
  nextMeeting?: Meeting;
  currentRate?: CurrentRate;
  score?: BankScoreSummary;
  odds?: OddsRow[];
  oddsNote?: string;
}) {
  const bank = BANKS[bankCode];

  return (
    <article className="flex flex-col card p-5">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">
          <Link
            href={`/banka/${bank.code}`}
            className="inline-flex min-h-9 items-center gap-2 hover:text-accent"
          >
            <span
              aria-hidden
              className="inline-block size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: bankColorVar(bank.code) }}
            />
            {bank.nameTr}
          </Link>
        </h3>
        <span className="text-sm text-muted">{bank.countryTr}</span>
      </header>

      {nextMeeting ? (
        <div className="mt-3">
          <div className="text-sm text-muted">Sıradaki karar</div>
          <div className="tabular mt-0.5 font-medium">
            {formatDateTr(nextMeeting.meetingAt)}
            {!nextMeeting.timeTbd && ` · ${formatTimeTrt(nextMeeting.meetingAt)} TRT`}
          </div>
          <div className="mt-2">
            <LiveCountdown
              meetingAt={nextMeeting.meetingAt}
              initial={computeCountdownParts(nextMeeting.meetingAt)}
            />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Takvim verisi henüz eklenmedi.</p>
      )}

      <dl className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-muted">Politika faizi</dt>
          <dd className="tabular font-semibold">
            {currentRate ? (
              formatCurrentRate(currentRate)
            ) : (
              <span className="text-muted" title="Bu banka için faiz kaynağı henüz bağlanmadı">
                —
              </span>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-muted">Şahin/güvercin</dt>
          <dd className="tabular font-semibold">
            {score ? (
              <span className={scoreToneClass(score.averageScore)}>
                {formatScore(score.averageScore)}{" "}
                <span className="text-xs font-normal">
                  ({scoreLabelTr(score.averageScore)})
                </span>
              </span>
            ) : (
              <span
                className="text-muted"
                title="Bu banka için skorlanmış konuşma yok"
              >
                —
              </span>
            )}
          </dd>
        </div>
      </dl>

      {odds && odds.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 text-sm text-muted">Piyasa fiyatlaması</div>
          <RateOdds rows={odds} />
          {oddsNote && <p className="mt-2 text-xs text-muted">{oddsNote}</p>}
        </div>
      )}

      <Link
        href={`/banka/${bank.code}`}
        className="mt-auto inline-flex min-h-9 items-center pt-4 text-sm text-accent hover:underline"
      >
        {bank.nameTr} ayrıntısı →
      </Link>
    </article>
  );
}
