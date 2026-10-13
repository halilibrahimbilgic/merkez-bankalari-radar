import { DecisionsPage, decisionsMetadata } from "@/views/DecisionsPage";

export const revalidate = 3600;
export const metadata = decisionsMetadata("tr");

export default async function Page({ searchParams }: PageProps<"/kararlar">) {
  return <DecisionsPage lang="tr" searchParams={await searchParams} />;
}
