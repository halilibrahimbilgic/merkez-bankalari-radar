import Link from "next/link";
import { BANKS, bankColorVar } from "@/lib/banks";
import type { Meeting } from "@/lib/types";
import {
  countdownLabelTr,
  formatDateTr,
  formatTimeInZone,
  formatTimeTrt,
  formatWeekdayTr,
} from "@/lib/time";
import { Countdown } from "./Countdown";

export function MeetingRow({ meeting, now }: { meeting: Meeting; now: Date }) {
  const bank = BANKS[meeting.bankCode];
  const isPast = new Date(meeting.meetingAt) < now;
  const trtTime = formatTimeTrt(meeting.meetingAt);
  const localTime = formatTimeInZone(meeting.meetingAt, bank.timezone);

  return (
    <li
      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-l-3 border-border px-4 py-3 last:border-b-0"
      style={{ borderLeftColor: bankColorVar(bank.code) }}
    >
      <Link
        href={`/banka/${bank.code}`}
        className="min-w-14 font-semibold text-accent hover:underline"
      >
        {bank.nameTr}
      </Link>

      <div className="min-w-56 flex-1">
        <div className="tabular">
          {formatDateTr(meeting.meetingAt)}
          <span className="text-muted"> · {formatWeekdayTr(meeting.meetingAt)}</span>
        </div>
        <div className="text-sm text-muted tabular">
          {meeting.timeTbd ? (
            "Saat açıklanmadı"
          ) : (
            <>
              {formatTimeTrt(meeting.meetingAt)} TRT
              {/* TCMB'de yerel saat zaten TRT — tekrar göstermek gürültü. */}
              {localTime !== trtTime && (
                <span className="opacity-70"> (yerel {localTime})</span>
              )}
            </>
          )}
          {meeting.type === "projections" && (
            <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-xs text-accent">
              projeksiyon
            </span>
          )}
        </div>
      </div>

      <div className="text-sm">
        {isPast ? (
          <span className="text-muted tabular">
            {meeting.decisionRate !== undefined
              ? `${formatRate(meeting)}${rateDelta(meeting)}`
              : countdownLabelTr(meeting.meetingAt, now)}
          </span>
        ) : (
          <Countdown
            meetingAt={meeting.meetingAt}
            initialLabel={countdownLabelTr(meeting.meetingAt, now)}
          />
        )}
      </div>
    </li>
  );
}

/** Fed bir aralık ilan eder ("%3,50-3,75"); diğer bankalar tek oran. */
function formatRate(meeting: Meeting): string {
  const upper = num(meeting.decisionRate!);
  if (meeting.decisionRateLower === undefined) return `%${upper}`;
  return `%${num(meeting.decisionRateLower)}-${upper}`;
}

function num(rate: number): string {
  return rate.toFixed(2).replace(".", ",");
}

function rateDelta(meeting: Meeting): string {
  if (meeting.previousRate === undefined || meeting.decisionRate === undefined) return "";
  const bps = Math.round((meeting.decisionRate - meeting.previousRate) * 100);
  if (bps === 0) return " (değişiklik yok)";
  return ` (${bps > 0 ? "+" : ""}${bps} bp)`;
}
