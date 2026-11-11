import { CalendarPage, calendarMetadata } from "@/views/CalendarPage";

export const revalidate = 3600;
export const metadata = calendarMetadata("en");

export default function Page() {
  return <CalendarPage lang="en" />;
}
