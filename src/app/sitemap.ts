import type { MetadataRoute } from "next";
import { ALL_BANKS } from "@/lib/banks";
import { getSpeechIds } from "@/lib/data/speeches";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages = [
    { path: "", priority: 1 },
    { path: "/takvim", priority: 0.9 },
    { path: "/faiz-olasiligi", priority: 0.8 },
    { path: "/konusmalar", priority: 0.8 },
    { path: "/skor", priority: 0.7 },
    { path: "/hakkinda", priority: 0.5 },
  ].map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: p.priority,
  }));

  const bankPages = ALL_BANKS.map((b) => ({
    url: `${SITE_URL}/banka/${b.code}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  const speechPages = (await getSpeechIds()).map((id) => ({
    url: `${SITE_URL}/konusma/${id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...bankPages, ...speechPages];
}
