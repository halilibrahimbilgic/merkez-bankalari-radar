import { SpeechesPage, speechesMetadata } from "@/views/SpeechesPage";

export const revalidate = 3600;
export const metadata = speechesMetadata("tr");

export default async function Page({ searchParams }: PageProps<"/konusmalar">) {
  return <SpeechesPage lang="tr" searchParams={await searchParams} />;
}
