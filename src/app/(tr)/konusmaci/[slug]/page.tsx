import { getSpeakers } from "@/lib/data/speeches";
import { SpeakerPage, speakerMetadata } from "@/views/SpeakerPage";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getSpeakers()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/konusmaci/[slug]">) {
  return speakerMetadata("tr", (await params).slug);
}

export default async function Page({ params }: PageProps<"/konusmaci/[slug]">) {
  return <SpeakerPage lang="tr" slug={(await params).slug} />;
}
