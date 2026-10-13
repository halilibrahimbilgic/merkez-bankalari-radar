import { DecisionsPage, decisionsMetadata } from "@/views/DecisionsPage";

export const revalidate = 3600;
export const metadata = decisionsMetadata("en");

export default async function Page({ searchParams }: PageProps<"/en/kararlar">) {
  return <DecisionsPage lang="en" searchParams={await searchParams} />;
}
