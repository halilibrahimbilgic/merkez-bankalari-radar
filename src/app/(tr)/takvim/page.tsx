import { CalendarPage, calendarMetadata } from "@/views/CalendarPage";

export const revalidate = 3600;
export const metadata = calendarMetadata("tr");

export default async function Page({ searchParams }: PageProps<"/takvim">) {
  return <CalendarPage lang="tr" searchParams={await searchParams} />;
}
