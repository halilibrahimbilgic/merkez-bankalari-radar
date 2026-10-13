import { GuidesPage, guidesMetadata } from "@/views/GuidePages";

export const metadata = guidesMetadata("en");

export default function Page() {
  return <GuidesPage lang="en" />;
}
