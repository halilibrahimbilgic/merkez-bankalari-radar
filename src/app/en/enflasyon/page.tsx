import { InflationPage, inflationMetadata } from "@/views/InflationPage";

export const revalidate = 3600;

export function generateMetadata() {
  return inflationMetadata("en");
}

export default function Page() {
  return <InflationPage lang="en" />;
}
