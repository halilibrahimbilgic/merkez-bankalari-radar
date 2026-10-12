import { ALL_BANKS } from "@/lib/banks";
import { OG_SIZE } from "@/lib/og";
import { bankOgImage } from "@/views/og-images";

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
  return bankOgImage("tr", (await params).code);
}
