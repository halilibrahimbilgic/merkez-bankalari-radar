import { RealRatesPage, realRatesMetadata } from "@/views/RealRatesPage";

export const revalidate = 3600;
export const metadata = realRatesMetadata("en");

export default function Page() {
  return <RealRatesPage lang="en" />;
}
