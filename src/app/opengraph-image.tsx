import { BANKS } from "@/lib/banks";
import { getUpcomingMeetings } from "@/lib/data/meetings";
import { BANK_HEX, OG_SIZE, renderOgCard } from "@/lib/og";
import { formatDateTr, formatTimeTrt } from "@/lib/time";

// Kök görsel: kendi görseli olmayan bütün sayfaların varsayılanı.
// Yaklaşan kararlar değiştikçe güncel kalsın diye saatlik yenilenir.
export const revalidate = 3600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Faiz Radar — merkez bankası faiz kararları, Türkiye saatiyle";

export default async function Image() {
  const upcoming = (await getUpcomingMeetings()).slice(0, 3);
  return renderOgCard({
    eyebrow: "Merkez bankası faiz kararları",
    title: "Fed, ECB, TCMB, BoE, BoJ ve RBA — Türkiye saatiyle",
    footer: "faizradar.com",
    rows: upcoming.map((m) => ({
      label: BANKS[m.bankCode].nameTr,
      dot: BANK_HEX[m.bankCode],
      value: m.timeTbd
        ? formatDateTr(m.meetingAt)
        : `${formatDateTr(m.meetingAt)} · ${formatTimeTrt(m.meetingAt)}`,
    })),
  });
}
