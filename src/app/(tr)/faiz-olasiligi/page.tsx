import { ProbabilityPage, probabilityMetadata } from "@/views/ProbabilityPage";

export const revalidate = 3600;
export const metadata = probabilityMetadata("tr");

export default async function Page({ searchParams }: PageProps<"/faiz-olasiligi">) {
  return <ProbabilityPage lang="tr" searchParams={await searchParams} />;
}
