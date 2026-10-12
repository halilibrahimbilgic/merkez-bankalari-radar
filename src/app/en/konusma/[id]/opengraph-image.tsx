import { getSpeechIds } from "@/lib/data/speeches";
import { OG_SIZE } from "@/lib/og";
import { speechOgImage } from "@/views/og-images";

export const revalidate = 3600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Central banker speech — summary and hawk/dove score";

export async function generateStaticParams() {
  return (await getSpeechIds()).map((id) => ({ id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  return speechOgImage("en", (await params).id);
}
