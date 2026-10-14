import Link from "next/link";
import { BANKS, bankColorVar, bankCountry, bankName } from "@/lib/banks";
import { isPendingDecision, pendingNote } from "@/lib/decision-format";
import { formatCurrentRate, type CurrentRate } from "@/lib/data/rates";
import { fmtSignedPercent, L, localePath, type Lang } from "@/lib/i18n";
import type { RealRate } from "@/lib/real-rates";
import { countdownLabel, formatDateShort, formatTimeTrt } from "@/lib/time";
import type { BankCode, Meeting } from "@/lib/types";

/** Beklentinin tek bakışlık özeti: yön oku + kısa metin. */
export interface ExpectationChip {
  direction: "up" | "flat" | "down";
  text: string;
}

export interface BankSummary {
  code: BankCode;
  next?: Meeting;
  rate?: CurrentRate;
  real?: RealRate;
  chip?: ExpectationChip;
}

const ARROW = { up: "↗", flat: "→", down: "↘" } as const;
const TONE = { up: "text-hawk", flat: "text-muted", down: "text-dove" } as const;

/**
 * Ana sayfanın telefon görünümü: altı banka tek satırlık liste. Kartlar alt
 * alta ~3.000 px tutuyordu (14 Ekim 2026, 390 px'te ölçüldü) ve "son
 * kararlar" ile haberler ekranın çok altında kalıyordu. Ayrıntı banka
 * sayfasında; satırın tamamı oraya gider.
 */
export function BankSummaryList({ rows, now, lang }: { rows: BankSummary[]; now: Date; lang: Lang }) {
  const t = L(lang);
  return (
    <ul className="card overflow-hidden sm:hidden">
      {rows.map(({ code, next, rate, real, chip }) => {
        const bank = BANKS[code];
        const pending = next && isPendingDecision(next, now);
        return (
          <li key={code} className="border-b border-border last:border-b-0">
            <Link
              href={localePath(lang, `/banka/${code}`)}
              className="flex items-start gap-3 px-4 py-3 hover:bg-surface-sunken"
              style={{ borderLeft: `3px solid ${bankColorVar(code)}` }}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {bankName(bank, lang)} <span className="text-sm font-normal text-muted">· {bankCountry(bank, lang)}</span>
                </div>
                <div className="tabular text-sm text-muted">
                  {next ? (
                    <>
                      {formatDateShort(next.meetingAt, lang)}
                      {!next.timeTbd && ` · ${formatTimeTrt(next.meetingAt)}`}
                      {!pending && ` · ${countdownLabel(next.meetingAt, now, lang)}`}
                    </>
                  ) : (
                    t("takvim yok", "no calendar")
                  )}
                </div>
                {/* Bekleyen kararda çip bir sonraki toplantıya ait olurdu; yerine not. */}
                {pending && next ? (
                  <div className="mt-0.5 text-xs font-medium">{pendingNote(next, lang)}</div>
                ) : chip && (
                  <div className="mt-0.5 text-xs">
                    <span aria-hidden className={TONE[chip.direction]}>
                      {ARROW[chip.direction]}
                    </span>{" "}
                    <span className="text-muted">{chip.text}</span>
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="tabular font-semibold">{rate ? formatCurrentRate(rate, lang) : "—"}</div>
                {real && (
                  <div className="tabular text-xs text-muted">
                    {t("reel", "real")} {fmtSignedPercent(real.real, lang)}
                  </div>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
