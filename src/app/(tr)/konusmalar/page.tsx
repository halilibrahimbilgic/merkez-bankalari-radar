import { SpeechesPage, speechesMetadata } from "@/views/SpeechesPage";

export const revalidate = 3600;
export const metadata = speechesMetadata("tr");

export default function Page() {
  return <SpeechesPage lang="tr" />;
}
