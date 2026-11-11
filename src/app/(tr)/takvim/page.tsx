import { CalendarPage, calendarMetadata } from "@/views/CalendarPage";

export const revalidate = 3600;
export const metadata = calendarMetadata("tr");

export default function Page() {
  return <CalendarPage lang="tr" />;
}
