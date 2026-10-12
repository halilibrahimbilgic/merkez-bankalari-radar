import { ProbabilityPage, probabilityMetadata } from "@/views/ProbabilityPage";

export const revalidate = 3600;
export const metadata = probabilityMetadata("en");

export default async function Page({ searchParams }: PageProps<"/en/faiz-olasiligi">) {
  return <ProbabilityPage lang="en" searchParams={await searchParams} />;
}
