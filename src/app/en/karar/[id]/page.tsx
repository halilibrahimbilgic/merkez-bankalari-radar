import { getDecisionIds } from "@/lib/data/decisions";
import { DecisionPage, decisionMetadata } from "@/views/DecisionPage";

export const revalidate = 3600;

// Yeni kararlar (karar günü metinden gelen) derlemeden sonra da açılır: ISR.
export async function generateStaticParams() {
  return (await getDecisionIds()).map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/en/karar/[id]">) {
  return decisionMetadata("en", (await params).id);
}

export default async function Page({ params }: PageProps<"/en/karar/[id]">) {
  return <DecisionPage lang="en" id={(await params).id} />;
}
