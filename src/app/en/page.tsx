import { HomePage, homeMetadata } from "@/views/HomePage";

export const revalidate = 3600;
export const metadata = homeMetadata("en");

export default function Page() {
  return <HomePage lang="en" />;
}
