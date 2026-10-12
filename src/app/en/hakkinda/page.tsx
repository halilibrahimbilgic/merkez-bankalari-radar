import { AboutPage, aboutMetadata } from "@/views/AboutPage";

export const revalidate = 3600;
export const metadata = aboutMetadata("en");

export default function Page() {
  return <AboutPage lang="en" />;
}
