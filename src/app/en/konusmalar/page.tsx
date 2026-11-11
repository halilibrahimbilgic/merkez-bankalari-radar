import { SpeechesPage, speechesMetadata } from "@/views/SpeechesPage";

export const revalidate = 3600;
export const metadata = speechesMetadata("en");

export default function Page() {
  return <SpeechesPage lang="en" />;
}
