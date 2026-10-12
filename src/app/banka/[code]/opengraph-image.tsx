import { notFound } from "next/navigation";
import { formatScore, scoreLabelTr } from "@/components/ScoreBadge";
import { ALL_BANKS, getBank } from "@/lib/banks";
import { getUpcomingMeetings } from "@/lib/data/meetings";
import { formatCurrentRate, getCurrentRate } from "@/lib/data/rates";
import { getBankScoreSummaries } from "@/lib/data/speeches";
import { BANK_HEX, OG_SIZE, renderOgCard, scoreHex, type OgRow } from "@/lib/og";
import { formatDateTr, formatTimeTrt } from "@/lib/time";

export const revalidate = 3600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Merkez bankası faiz kararı ve sıradaki toplantı";

// Paylaşım platformları görseli her paylaşımda yeniden ister; istek başına
// çizmek yerine derlemede üretilip saatlik yenilenir.
export function generateStaticParams() {
  return ALL_BANKS.map((b) => ({ code: b.code }));
}

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const bank = getBank(code);
  if (!bank) notFound();

  const [next] = await getUpcomingMeetings({ bankCode: bank.code });
  const rate = await getCurrentRate(bank.code);
  const score = (await getBankScoreSummaries()).find((s) => s.bankCode === bank.code);

  const rows: OgRow[] = [];
  if (rate) rows.push({ label: bank.rateNameTr, value: formatCurrentRate(rate) });
  if (next) {
    rows.push({
      label: "Sıradaki karar",
      value: next.timeTbd
        ? formatDateTr(next.meetingAt)
        : `${formatDateTr(next.meetingAt)} · ${formatTimeTrt(next.meetingAt)} TRT`,
    });
  }
  if (score) {
    rows.push({
      label: "Konuşmaların tonu",
      value: `${formatScore(score.averageScore)} (${scoreLabelTr(score.averageScore)})`,
      valueColor: scoreHex(score.averageScore),
    });
  }

  return renderOgCard({
    eyebrow: `${bank.nameEn} · ${bank.countryTr}`,
    eyebrowColor: BANK_HEX[bank.code],
    title: `${bank.nameTr} faiz kararı`,
    rows,
  });
}
