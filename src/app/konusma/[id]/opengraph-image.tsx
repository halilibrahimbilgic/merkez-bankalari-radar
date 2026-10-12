import { notFound } from "next/navigation";
import { formatScore, scoreLabelTr } from "@/components/ScoreBadge";
import { BANKS } from "@/lib/banks";
import { getSpeech, getSpeechIds } from "@/lib/data/speeches";
import { BANK_HEX, OG_SIZE, renderOgCard, scoreHex, type OgRow } from "@/lib/og";
import { formatDateTr } from "@/lib/time";

export const revalidate = 3600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Merkez bankacısı konuşması — Türkçe özet ve şahin/güvercin skoru";

export async function generateStaticParams() {
  return (await getSpeechIds()).map((id) => ({ id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const speech = await getSpeech(id);
  if (!speech) notFound();

  const bank = BANKS[speech.bankCode];
  const rows: OgRow[] = [{ label: "Konuşmacı", value: speech.speakerName }];
  if (speech.hawkDoveScore !== undefined) {
    // Sinyalsiz konuşmanın 0'ı "nötr" değildir (ARCHITECTURE.md §4).
    rows.push(
      speech.hasPolicySignal === false
        ? { label: "Şahin/güvercin", value: "para politikası sinyali yok" }
        : {
            label: "Şahin/güvercin",
            value: `${formatScore(speech.hawkDoveScore)} (${scoreLabelTr(speech.hawkDoveScore)})`,
            valueColor: scoreHex(speech.hawkDoveScore),
          },
    );
  }

  return renderOgCard({
    eyebrow: `${bank.nameTr} · ${formatDateTr(speech.speechDate)}`,
    eyebrowColor: BANK_HEX[speech.bankCode],
    title: speech.title,
    rows,
    footer: "Türkçe özet · faizradar.com",
  });
}
