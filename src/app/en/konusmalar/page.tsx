import { SpeechesPage, speechesMetadata } from "@/views/SpeechesPage";

export const revalidate = 3600;
export const metadata = speechesMetadata("en");

export default async function Page({ searchParams }: PageProps<"/en/konusmalar">) {
  return <SpeechesPage lang="en" searchParams={await searchParams} />;
}
