import { NewsPage, newsMetadata } from "@/views/NewsPage";

export const revalidate = 3600;
export const metadata = newsMetadata("en");

export default async function Page({ searchParams }: PageProps<"/en/haberler">) {
  return <NewsPage lang="en" searchParams={await searchParams} />;
}
