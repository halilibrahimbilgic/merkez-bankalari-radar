import { getProbabilitySnapshot } from "@/lib/data/probabilities";
import { ProbabilityPage, probabilityMetadata } from "@/views/ProbabilityPage";

export const revalidate = 3600;
// Pencereler Atlanta Fed verisiyle kayar: derlemede seçicideki pencereler
// üretilir, sonradan doğan pencere ilk istekte üretilip önbelleğe girer.
// Listede olmayan tarih sayfada 404'e döner. Kanonik adres /faiz-olasiligi.
export const dynamicParams = true;

export async function generateStaticParams() {
  const snapshot = await getProbabilitySnapshot();
  return (snapshot?.windows ?? []).slice(1, 8).map((w) => ({ donem: w.startDate }));
}

export const metadata = probabilityMetadata("tr");

export default async function Page({ params }: PageProps<"/faiz-olasiligi/[donem]">) {
  return <ProbabilityPage lang="tr" donem={(await params).donem} />;
}
