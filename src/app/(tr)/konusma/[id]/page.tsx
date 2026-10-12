import { getSpeechIds } from "@/lib/data/speeches";
import { SpeechPage, speechMetadata } from "@/views/SpeechPage";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getSpeechIds()).map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/konusma/[id]">) {
  return speechMetadata("tr", (await params).id);
}

export default async function Page({ params }: PageProps<"/konusma/[id]">) {
  return <SpeechPage lang="tr" id={(await params).id} />;
}
