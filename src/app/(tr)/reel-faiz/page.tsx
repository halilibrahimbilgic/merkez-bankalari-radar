import { RealRatesPage, realRatesMetadata } from "@/views/RealRatesPage";

export const revalidate = 3600;
export const metadata = realRatesMetadata("tr");

export default function Page() {
  return <RealRatesPage lang="tr" />;
}
