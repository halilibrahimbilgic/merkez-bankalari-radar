import { CalendarPage, calendarMetadata } from "@/views/CalendarPage";

export const revalidate = 3600;
export const metadata = calendarMetadata("en");

export default async function Page({ searchParams }: PageProps<"/en/takvim">) {
  return <CalendarPage lang="en" searchParams={await searchParams} />;
}
