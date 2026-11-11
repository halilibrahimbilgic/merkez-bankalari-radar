import Link from "next/link";
import { formatScore, scoreShift, scoreToneClass } from "@/components/ScoreBadge";
import { TableFrame, Th } from "@/components/ui";
import { getDecisionViews } from "@/lib/data/decisions";
import { getAllMinutes } from "@/lib/data/minutes";
import { formatDecisionRate, hasDecisionPage } from "@/lib/decision-format";
import type { BankCode } from "@/lib/types";
import { L, localePath, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/time";

/**
 * Komitenin ortak sesi kararlardan karara: karar metninin ve tutanağın
 * puanı, konuşmalarla aynı ölçekte. "Bir ay önce +6 olan komite bugün +4" —
 * yön düzeyden çok şey söyler (ARCHITECTURE.md §9).
 */
export async function CommitteeTone({ bankCode, now, lang }: { bankCode: BankCode; now: Date; lang: Lang }) {
  const t = L(lang);
  const [views, minutes] = await Promise.all([getDecisionViews({ bankCode, now }), getAllMinutes()]);
  const minutesScore = new Map(minutes.map((r) => [r.meetingId, r.summary?.score]));
  // En yeni karar önce; özet cümlesi ilk iki puanlı metni karşılaştırır.
  const rows = views
    .filter((v) => hasDecisionPage(v.meeting, now))
    .sort((a, b) => b.meeting.meetingAt.localeCompare(a.meeting.meetingAt))
    .slice(0, 8)
    .map((v) => ({ view: v, statement: v.statement?.summary?.score, minutes: minutesScore.get(v.meeting.id) }));
  if (!rows.some((r) => r.statement !== undefined || r.minutes !== undefined)) return null;
  const [last, prev] = rows.filter((r) => r.statement !== undefined);
  const cell = (score: number | undefined) =>
    score === undefined ? (
      <span className="text-muted">—</span>
    ) : (
      <span className={`font-semibold ${scoreToneClass(score)}`}>{formatScore(score, lang)}</span>
    );

  return (
    <section aria-labelledby="komite-tonu">
      <h2 id="komite-tonu" className="text-lg font-semibold">
        {t("Komitenin tonu", "The committee's tone")}
      </h2>
      <p className="prose-width mt-1 text-sm text-muted">
        {t(
          "Karar metinlerinin ve tutanakların puanı, konuşmalarla aynı -10 (çok güvercin) ile +10 (çok şahin) ölçeğinde: konuşmalar tek tek üyelerin, bunlar komitenin ortak sesi. Puanları bir dil modeli verir; ayrıntısı karar sayfasında.",
          "The scores of policy statements and minutes, on the same -10 (very dovish) to +10 (very hawkish) scale as the speeches: speeches are individual members, these are the committee's collective voice. A language model assigns the scores; details are on each decision page.",
        )}
      </p>
      {last && prev && (
        <p className="prose-width mt-2 text-sm tabular">
          {t(
            `Son karar metni ${formatScore(last.statement!, lang)}, bir önceki ${formatScore(prev.statement!, lang)}: ${scoreShift(last.statement!, prev.statement!, lang)}.`,
            `Latest statement ${formatScore(last.statement!, lang)}, the one before ${formatScore(prev.statement!, lang)}: ${scoreShift(last.statement!, prev.statement!, lang)}.`,
          )}
        </p>
      )}
      <div className="mt-3">
        <TableFrame minWidth="28rem">
          <thead>
            <tr className="border-b border-border-strong text-left text-muted">
              <Th>{t("Karar", "Decision")}</Th>
              <Th align="right">{t("Oran", "Rate")}</Th>
              <Th align="right">{t("Karar metni", "Statement")}</Th>
              <Th align="right">{t("Tutanak", "Minutes")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ view, statement, minutes }) => {
              const bp = view.changeBp ?? 0;
              return (
                <tr key={view.meeting.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5">
                    <Link
                      href={localePath(lang, `/karar/${view.meeting.id}`)}
                      className="inline-flex min-h-6 items-center text-accent hover:underline tabular"
                    >
                      {formatDate(view.meeting.meetingAt, lang)}
                    </Link>
                  </td>
                  <td className="tabular px-4 py-2.5 text-right">
                    {formatDecisionRate(view.meeting, lang)}{" "}
                    <span className={`text-xs ${bp > 0 ? "text-hawk" : bp < 0 ? "text-dove" : "text-muted"}`}>
                      ({bp === 0 ? t("sabit", "hold") : `${bp > 0 ? "+" : "−"}${Math.abs(bp)} bp`})
                    </span>
                  </td>
                  <td className="tabular px-4 py-2.5 text-right">{cell(statement)}</td>
                  <td className="tabular px-4 py-2.5 text-right">{cell(minutes)}</td>
                </tr>
              );
            })}
          </tbody>
        </TableFrame>
      </div>
    </section>
  );
}
