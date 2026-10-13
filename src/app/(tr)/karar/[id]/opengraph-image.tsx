import { getDecisionIds } from "@/lib/data/decisions";
import { OG_SIZE } from "@/lib/og";
import { decisionOgImage } from "@/views/og-images";

export const revalidate = 3600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Merkez bankası faiz kararı, beklenti ve sürpriz";

export async function generateStaticParams() {
  return (await getDecisionIds()).map((id) => ({ id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  return decisionOgImage("tr", (await params).id);
}
