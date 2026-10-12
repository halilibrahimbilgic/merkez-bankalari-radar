import { AboutPage, aboutMetadata } from "@/views/AboutPage";

export const revalidate = 3600;
export const metadata = aboutMetadata("tr");

export default function Page() {
  return <AboutPage lang="tr" />;
}
