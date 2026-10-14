import { getSpeakers } from "@/lib/data/speeches";
import { SpeakerPage, speakerMetadata } from "@/views/SpeakerPage";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getSpeakers()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/en/konusmaci/[slug]">) {
  return speakerMetadata("en", (await params).slug);
}

export default async function Page({ params }: PageProps<"/en/konusmaci/[slug]">) {
  return <SpeakerPage lang="en" slug={(await params).slug} />;
}
