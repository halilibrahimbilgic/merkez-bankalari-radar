import { ProbabilityPage, probabilityMetadata } from "@/views/ProbabilityPage";

export const revalidate = 3600;
export const metadata = probabilityMetadata("en");

export default function Page() {
  return <ProbabilityPage lang="en" />;
}
