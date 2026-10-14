import type { MetadataRoute } from "next";
import { ALL_BANKS } from "@/lib/banks";
import { getSpeakers, getSpeeches } from "@/lib/data/speeches";
import { getDecisionViews } from "@/lib/data/decisions";
import { GUIDES } from "@/lib/guides/index";
import { LANGS, localePath } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

/**
 * Her sayfa iki dilde ayrı adres olarak listelenir ve birbirinin hreflang
 * karşılığını taşır; arama motoru iki sürümü kopya içerik saymaz.
 *
 * lastModified gerçek olmalı: Google her sayfada "şimdi" yazan bir haritanın
 * tarihlerine güvenmeyi bırakır. Günlük veriyle değişen sayfalar üretim
 * anını, içerik sayfaları kendi tarihini taşır; tarihi bilinmeyen yasal
 * sayfalarda alan hiç yazılmaz.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [decisions, speeches, speakers] = await Promise.all([getDecisionViews(), getSpeeches(), getSpeakers()]);
  const guidesUpdated = GUIDES.map((g) => g.updatedOn).sort().at(-1);

  const pages: {
    path: string;
    priority: number;
    changeFrequency: "daily" | "monthly";
    lastModified?: Date | string;
  }[] = [
    { path: "/", priority: 1, changeFrequency: "daily", lastModified: now },
    { path: "/takvim", priority: 0.9, changeFrequency: "daily", lastModified: now },
    { path: "/kararlar", priority: 0.8, changeFrequency: "daily", lastModified: now },
    { path: "/reel-faiz", priority: 0.7, changeFrequency: "daily", lastModified: now },
    { path: "/rehber", priority: 0.5, changeFrequency: "monthly", lastModified: guidesUpdated },
    ...GUIDES.map((g) => ({
      path: `/rehber/${g.slug}`,
      priority: 0.5,
      changeFrequency: "monthly" as const,
      lastModified: g.updatedOn,
    })),
    { path: "/haberler", priority: 0.8, changeFrequency: "daily", lastModified: now },
    { path: "/faiz-olasiligi", priority: 0.8, changeFrequency: "daily", lastModified: now },
    { path: "/konusmalar", priority: 0.8, changeFrequency: "daily", lastModified: now },
    { path: "/skor", priority: 0.7, changeFrequency: "daily", lastModified: now },
    { path: "/hakkinda", priority: 0.5, changeFrequency: "daily" },
    { path: "/iletisim", priority: 0.3, changeFrequency: "daily" },
    { path: "/gizlilik", priority: 0.2, changeFrequency: "daily" },
    ...ALL_BANKS.map((b) => ({
      path: `/banka/${b.code}`,
      priority: 0.7,
      changeFrequency: "daily" as const,
      lastModified: now,
    })),
    // Karar sayfası, metin özeti eklendiğinde son kez değişir.
    ...decisions.map((v) => ({
      path: `/karar/${v.meeting.id}`,
      priority: 0.6,
      changeFrequency: "monthly" as const,
      lastModified: v.statement?.summary?.summarizedAt ?? v.statement?.fetchedAt ?? v.meeting.meetingAt,
    })),
    ...speeches.map((s) => ({
      path: `/konusma/${s.id}`,
      priority: 0.6,
      changeFrequency: "monthly" as const,
      lastModified: s.scoredAt ?? s.speechDate,
    })),
    ...speakers.map((s) => ({
      path: `/konusmaci/${s.slug}`,
      priority: 0.5,
      changeFrequency: "monthly" as const,
      lastModified: s.latestDate,
    })),
  ];

  const url = (lang: (typeof LANGS)[number], path: string) =>
    `${SITE_URL}${path === "/" && lang === "tr" ? "" : localePath(lang, path)}`;

  return pages.flatMap((p) =>
    LANGS.map((lang) => ({
      url: url(lang, p.path),
      lastModified: p.lastModified,
      changeFrequency: p.changeFrequency,
      // İngilizce sürüm ikincil kitle: aynı sayfanın Türkçesinden bir kademe düşük.
      priority: lang === "tr" ? p.priority : Math.round(p.priority * 0.8 * 10) / 10,
      alternates: {
        languages: Object.fromEntries(LANGS.map((l) => [l, url(l, p.path)])),
      },
    })),
  );
}
