import { ProbabilityPage, probabilityMetadata } from "@/views/ProbabilityPage";

export const revalidate = 3600;
export const metadata = probabilityMetadata("tr");

export default function Page() {
  return <ProbabilityPage lang="tr" />;
}
