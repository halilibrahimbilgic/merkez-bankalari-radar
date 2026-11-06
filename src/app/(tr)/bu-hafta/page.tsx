import type { Metadata } from "next";
import { WeekCardPage } from "@/views/WeekCardPage";

export const revalidate = 3600;

// Site sahibinin paylaşım aracı: arama sonuçlarında yeri yok.
export const metadata: Metadata = {
  title: "Haftalık paylaşım kartı",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ hafta?: string }> }) {
  const { hafta } = await searchParams;
  return <WeekCardPage hafta={hafta} />;
}
