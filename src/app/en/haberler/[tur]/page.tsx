import { NEWS_KIND_SLUGS, type NewsKindSlug } from "@/lib/filter-paths";
import { NewsPage, newsMetadata } from "@/views/NewsPage";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(NEWS_KIND_SLUGS).map((tur) => ({ tur }));
}

export async function generateMetadata({ params }: PageProps<"/en/haberler/[tur]">) {
  return newsMetadata("en", (await params).tur as NewsKindSlug);
}

export default async function Page({ params }: PageProps<"/en/haberler/[tur]">) {
  return <NewsPage lang="en" slug={(await params).tur as NewsKindSlug} />;
}
