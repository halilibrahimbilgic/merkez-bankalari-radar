import { getDecisionIds } from "@/lib/data/decisions";
import { OG_SIZE } from "@/lib/og";
import { decisionOgImage } from "@/views/og-images";

export const revalidate = 3600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Central bank rate decision, expectation and surprise";

export async function generateStaticParams() {
  return (await getDecisionIds()).map((id) => ({ id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  return decisionOgImage("en", (await params).id);
}
