import { ScorePage, scoreMetadata } from "@/views/ScorePage";

export const revalidate = 3600;
export const metadata = scoreMetadata("en");

export default function Page() {
  return <ScorePage lang="en" />;
}
