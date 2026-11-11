import { NewsPage, newsMetadata } from "@/views/NewsPage";

export const revalidate = 3600;
export const metadata = newsMetadata("en");

export default function Page() {
  return <NewsPage lang="en" />;
}
