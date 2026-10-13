import Link from "next/link";
import { BANKS, bankColorVar, bankName } from "@/lib/banks";
import { formatDecisionRate, hasDecisionPage } from "@/lib/decision-format";
import { L, localePath, type Lang } from "@/lib/i18n";
import type { Meeting } from "@/lib/types";
import {
  countdownLabel,
  formatDate,
  formatTimeInZone,
  formatTimeTrt,
  formatWeekday,
} from "@/lib/time";
import { Countdown } from "./Countdown";
import { Row } from "./ui";

export function MeetingRow({ meeting, now, lang }: { meeting: Meeting; now: Date; lang: Lang }) {
  const t = L(lang);
  const bank = BANKS[meeting.bankCode];
  const isPast = new Date(meeting.meetingAt) < now;
  const trtTime = formatTimeTrt(meeting.meetingAt);
  const localTime = formatTimeInZone(meeting.meetingAt, bank.timezone);

  return (
    <Row accentColor={bankColorVar(bank.code)}>
      <Link
        href={localePath(lang, `/banka/${bank.code}`)}
        className="min-w-14 font-semibold text-accent hover:underline"
      >
        {bankName(bank, lang)}
      </Link>

      <div className="min-w-56 flex-1">
        <div className="tabular">
          {formatDate(meeting.meetingAt, lang)}
          <span className="text-muted"> · {formatWeekday(meeting.meetingAt, lang)}</span>
        </div>
        <div className="text-sm text-muted tabular">
          {meeting.timeTbd ? (
            t("Saat açıklanmadı", "Time not announced")
          ) : (
            <>
              {trtTime} TRT
              {/* TCMB'de yerel saat zaten TRT — tekrar göstermek gürültü. */}
              {localTime !== trtTime && (
                <span className="opacity-70">
                  {" "}
                  ({t("yerel", "local")} {localTime})
                </span>
              )}
            </>
          )}
          {meeting.type === "projections" && (
            <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-xs text-accent">
              {t("projeksiyon", "projections")}
            </span>
          )}
        </div>
      </div>

      <div className="text-sm">
        {isPast ? (
          hasDecisionPage(meeting, now) ? (
            <Link href={localePath(lang, `/karar/${meeting.id}`)} className="tabular text-accent hover:underline">
              {`${formatDecisionRate(meeting, lang)}${rateDelta(meeting, lang)}`} →
            </Link>
          ) : (
            <span className="text-muted tabular">
              {meeting.decisionRate !== undefined
                ? `${formatDecisionRate(meeting, lang)}${rateDelta(meeting, lang)}`
                : countdownLabel(meeting.meetingAt, now, lang)}
            </span>
          )
        ) : meeting.timeTbd ? (
          // Saat belli değilse (BoJ) meetingAt'teki saat yer tutucudur;
          // saat/dakika hassasiyetinde geri sayım sahte kesinlik olurdu.
          <span className="tabular">{countdownLabel(meeting.meetingAt, now, lang)}</span>
        ) : (
          <Countdown
            meetingAt={meeting.meetingAt}
            initialLabel={countdownLabel(meeting.meetingAt, now, lang)}
            lang={lang}
          />
        )}
      </div>
    </Row>
  );
}

function rateDelta(meeting: Meeting, lang: Lang): string {
  if (meeting.previousRate === undefined || meeting.decisionRate === undefined) return "";
  const bps = Math.round((meeting.decisionRate - meeting.previousRate) * 100);
  if (bps === 0) return lang === "en" ? " (no change)" : " (değişiklik yok)";
  return ` (${bps > 0 ? "+" : ""}${bps} bp)`;
}
