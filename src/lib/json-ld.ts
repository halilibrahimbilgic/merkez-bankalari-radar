import { L, localePath, type Lang } from "./i18n";
import { SITE_URL, TELEGRAM_URL, REPO_URL } from "./site";
import { TRT, trtDayKey } from "./time";

/**
 * schema.org JSON-LD üreticileri (saf; bileşen src/components/JsonLd.tsx).
 * Arama motoruna sayfanın ne olduğunu makine okunur söyler: etkinlik, makale,
 * ekmek kırıntısı, sık sorulan soru. İçerik sayfada görünenle aynı olmalı —
 * Google görünmeyen veriyi işaretlemeyi yasaklıyor.
 */

const CONTEXT = "https://schema.org";
const url = (lang: Lang, path: string) => `${SITE_URL}${localePath(lang, path)}`;

/**
 * <script> içine gömülecek JSON. `<` kaçışlanır: veri içinde "</script>"
 * geçerse etiketi kapatıp sayfaya HTML enjekte edemesin.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function websiteLd(lang: Lang) {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    name: "Faiz Radar",
    url: url(lang, "/"),
    inLanguage: lang,
  };
}

export function organizationLd() {
  return {
    "@context": CONTEXT,
    "@type": "Organization",
    name: "Faiz Radar",
    url: SITE_URL,
    logo: `${SITE_URL}/apple-icon.png`,
    sameAs: [TELEGRAM_URL, REPO_URL],
  };
}

/** Son öğe geçerli sayfadır (yolsuz verilebilir: Google bunu kabul eder). */
export function breadcrumbLd(lang: Lang, items: { name: string; path: string }[]) {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: url(lang, it.path),
    })),
  };
}

export function homeCrumb(lang: Lang) {
  return { name: L(lang)("Ana sayfa", "Home"), path: "/" };
}

export function faqLd(qa: { q: string; a: string }[]) {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: qa.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

const OFFSET_FMT = new Intl.DateTimeFormat("en-US", { timeZone: TRT, timeZoneName: "longOffset" });
const WALL_FMT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TRT,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/**
 * UTC anı Türkiye saati ofsetiyle: "2026-12-10T14:00:00+03:00". Ofset sabit
 * varsayılmaz, Intl'den okunur (src/lib/tz.ts'teki kuralla aynı).
 */
export function trtIso(iso: string): string {
  const d = new Date(iso);
  const wall = WALL_FMT.format(d).replace(" ", "T");
  const off = OFFSET_FMT.formatToParts(d).find((p) => p.type === "timeZoneName")?.value ?? "GMT+03:00";
  return `${wall}${off === "GMT" ? "+00:00" : off.replace("GMT", "")}`;
}

/**
 * Faiz kararı etkinliği. Çevrimiçi etkinlik: karar bankanın sitesinden
 * duyurulur. Saati duyurulmayan karar (timeTbd) yalnızca gün olarak verilir —
 * yer tutucu saat işaretlenseydi yanlış saati güvenle söylerdik.
 */
export function eventLd(opts: {
  lang: Lang;
  id: string;
  name: string;
  description: string;
  at: string;
  timeTbd: boolean;
  organizer: { name: string; url: string };
}) {
  return {
    "@context": CONTEXT,
    "@type": "Event",
    name: opts.name,
    description: opts.description,
    startDate: opts.timeTbd ? trtDayKey(opts.at) : trtIso(opts.at),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: { "@type": "VirtualLocation", url: opts.organizer.url },
    organizer: { "@type": "Organization", name: opts.organizer.name, url: opts.organizer.url },
    url: url(opts.lang, `/karar/${opts.id}`),
    inLanguage: opts.lang,
  };
}

/**
 * Rehber yazısı. Yayım ve güncelleme günü ayrı tutulmuyor (Guide.updatedOn
 * tek tarih); ikisi de o gün olur — yayım tarihi bilinmeden uydurulmaz,
 * en geç tarih olarak "son gözden geçirme" doğrudur.
 */
export function articleLd(opts: {
  lang: Lang;
  slug: string;
  headline: string;
  description: string;
  updatedOn: string;
}) {
  return {
    "@context": CONTEXT,
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.updatedOn,
    dateModified: opts.updatedOn,
    inLanguage: opts.lang,
    mainEntityOfPage: url(opts.lang, `/rehber/${opts.slug}`),
    author: { "@type": "Organization", name: "Faiz Radar", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Faiz Radar", url: SITE_URL },
  };
}
