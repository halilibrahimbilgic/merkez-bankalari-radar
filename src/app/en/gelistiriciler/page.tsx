import { DevelopersPage, developersMetadata } from "@/views/DevelopersPage";

export const revalidate = 3600;
export const metadata = developersMetadata("en");

export default function Page() {
  return <DevelopersPage lang="en" />;
}
