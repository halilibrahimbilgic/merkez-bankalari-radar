import { HomePage, homeMetadata } from "@/views/HomePage";

export const revalidate = 3600;
export const metadata = homeMetadata("tr");

export default function Page() {
  return <HomePage lang="tr" />;
}
