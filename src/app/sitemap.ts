import type { MetadataRoute } from "next";
import { ALL_BANKS } from "@/lib/banks";
import { getSpeechIds } from "@/lib/data/speeches";
import { LANGS, localePath } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

/**
 * Her sayfa iki dilde ayrı adres olarak listelenir ve birbirinin hreflang
 * karşılığını taşır; arama motoru iki sürümü kopya içerik saymaz.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const pages: { path: string; priority: number; changeFrequency: "daily" | "monthly" }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/takvim", priority: 0.9, changeFrequency: "daily" },
    { path: "/haberler", priority: 0.8, changeFrequency: "daily" },
    { path: "/faiz-olasiligi", priority: 0.8, changeFrequency: "daily" },
    { path: "/konusmalar", priority: 0.8, changeFrequency: "daily" },
    { path: "/skor", priority: 0.7, changeFrequency: "daily" },
    { path: "/hakkinda", priority: 0.5, changeFrequency: "daily" },
    { path: "/iletisim", priority: 0.3, changeFrequency: "daily" },
    { path: "/gizlilik", priority: 0.2, changeFrequency: "daily" },
    ...ALL_BANKS.map((b) => ({
      path: `/banka/${b.code}`,
      priority: 0.7,
      changeFrequency: "daily" as const,
    })),
    ...(await getSpeechIds()).map((id) => ({
      path: `/konusma/${id}`,
      priority: 0.6,
      changeFrequency: "monthly" as const,
    })),
  ];

  const url = (lang: (typeof LANGS)[number], path: string) =>
    `${SITE_URL}${path === "/" && lang === "tr" ? "" : localePath(lang, path)}`;

  return pages.flatMap((p) =>
    LANGS.map((lang) => ({
      url: url(lang, p.path),
      lastModified: now,
      changeFrequency: p.changeFrequency,
      // İngilizce sürüm ikincil kitle: aynı sayfanın Türkçesinden bir kademe düşük.
      priority: lang === "tr" ? p.priority : Math.round(p.priority * 0.8 * 10) / 10,
      alternates: {
        languages: Object.fromEntries(LANGS.map((l) => [l, url(l, p.path)])),
      },
    })),
  );
}
