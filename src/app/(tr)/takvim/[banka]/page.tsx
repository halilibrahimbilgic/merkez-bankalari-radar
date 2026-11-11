import { CALENDAR_BANK_CODES } from "@/lib/banks";
import type { BankCode } from "@/lib/types";
import { CalendarPage, calendarMetadata } from "@/views/CalendarPage";

export const revalidate = 3600;
// Altı banka dışındaki adres derlemede üretilmez ve 404 verir.
export const dynamicParams = false;

export function generateStaticParams() {
  return CALENDAR_BANK_CODES.map((banka) => ({ banka }));
}

export async function generateMetadata({ params }: PageProps<"/takvim/[banka]">) {
  return calendarMetadata("tr", (await params).banka as BankCode);
}

export default async function Page({ params }: PageProps<"/takvim/[banka]">) {
  return <CalendarPage lang="tr" bankCode={(await params).banka as BankCode} />;
}
