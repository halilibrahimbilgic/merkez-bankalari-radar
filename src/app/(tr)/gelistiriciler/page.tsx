import { DevelopersPage, developersMetadata } from "@/views/DevelopersPage";

export const revalidate = 3600;
export const metadata = developersMetadata("tr");

export default function Page() {
  return <DevelopersPage lang="tr" />;
}
