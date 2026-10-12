import { ScorePage, scoreMetadata } from "@/views/ScorePage";

export const revalidate = 3600;
export const metadata = scoreMetadata("tr");

export default function Page() {
  return <ScorePage lang="tr" />;
}
