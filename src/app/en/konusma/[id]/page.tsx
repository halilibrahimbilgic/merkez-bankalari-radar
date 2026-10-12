import { getSpeechIds } from "@/lib/data/speeches";
import { SpeechPage, speechMetadata } from "@/views/SpeechPage";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getSpeechIds()).map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/en/konusma/[id]">) {
  return speechMetadata("en", (await params).id);
}

export default async function Page({ params }: PageProps<"/en/konusma/[id]">) {
  return <SpeechPage lang="en" id={(await params).id} />;
}
