import { NewsPage, newsMetadata } from "@/views/NewsPage";

export const revalidate = 3600;
export const metadata = newsMetadata("tr");

export default async function Page({ searchParams }: PageProps<"/haberler">) {
  return <NewsPage lang="tr" searchParams={await searchParams} />;
}
