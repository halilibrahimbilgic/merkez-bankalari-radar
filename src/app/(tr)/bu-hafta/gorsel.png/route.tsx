import { getWeekCard, renderWeekCard, weekCardDate } from "@/views/week-card";

// Saatlik yenilenir: karar açıklanınca satır beklentiden sonuca döner.
export const revalidate = 3600;

/** `?hafta=2026-12-09`: o tarihin haftası (önceden hazırlamak için). */
export async function GET(request: Request) {
  const date = weekCardDate(new URL(request.url).searchParams.get("hafta"));
  return renderWeekCard(await getWeekCard(date));
}
