import { GUIDES } from "@/lib/guides/index";
import { GuidePage, guideMetadata } from "@/views/GuidePages";

// İçerik kodda; listede olmayan adres 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/en/rehber/[slug]">) {
  return guideMetadata("en", (await params).slug);
}

export default async function Page({ params }: PageProps<"/en/rehber/[slug]">) {
  return <GuidePage lang="en" slug={(await params).slug} />;
}
