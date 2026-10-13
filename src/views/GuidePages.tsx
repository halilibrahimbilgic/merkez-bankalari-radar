import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideBody } from "@/components/GuideBody";
import { Rows, Row } from "@/components/ui";
import { pick } from "@/lib/guides";
import { GUIDES, getGuide } from "@/lib/guides/index";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/time";

export function guidesMetadata(lang: Lang): Metadata {
  const t = L(lang);
  return {
    title: t("Rehber: faiz kararlarını sade dille anlamak", "Guide: rate decisions in plain language"),
    description: t(
      "Faiz kararı nasıl okunur, faiz değişince mevduata, krediye ve kura ne olur, reel faiz ve piyasa beklentisi nedir — kısa ve sade açıklamalar.",
      "How to read a rate decision, what rate changes mean for deposits, loans and the currency, real rates and market expectations — short, plain explanations.",
    ),
    alternates: languageAlternates(lang, "/rehber"),
  };
}

export function GuidesPage({ lang }: { lang: Lang }) {
  const t = L(lang);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Rehber", "Guide")}</h1>
        <p className="prose-width mt-2 text-muted">
          {t(
            "Faiz kararlarını takip etmek için ekonomist olmak gerekmiyor. Bu kısa yazılar sitedeki rakamları okumaya yardım eder; genel mekanizmayı anlatır, yatırım tavsiyesi vermez.",
            "You don't need to be an economist to follow rate decisions. These short pieces help you read the numbers on this site; they explain general mechanisms and are not investment advice.",
          )}
        </p>
      </header>
      <Rows>
        {GUIDES.map((g) => (
          <Row key={g.slug}>
            <div className="flex-1">
              <Link href={localePath(lang, `/rehber/${g.slug}`)} className="font-medium hover:text-accent">
                {pick(g.title, lang)}
              </Link>
              <p className="mt-0.5 text-sm text-muted">{pick(g.description, lang)}</p>
            </div>
          </Row>
        ))}
      </Rows>
    </div>
  );
}

export function guideMetadata(lang: Lang, slug: string): Metadata {
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: pick(guide.title, lang),
    description: pick(guide.description, lang),
    alternates: languageAlternates(lang, `/rehber/${guide.slug}`),
  };
}

export function GuidePage({ lang, slug }: { lang: Lang; slug: string }) {
  const guide = getGuide(slug);
  if (!guide) notFound();
  const t = L(lang);
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <article className="space-y-6">
      <header>
        <Link href={localePath(lang, "/rehber")} className="text-sm text-accent hover:underline">
          {t("← Rehber", "← Guide")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{pick(guide.title, lang)}</h1>
        <p className="mt-1 text-sm text-muted tabular">
          {t(`Son gözden geçirme: ${formatDate(guide.updatedOn, lang)}`, `Last reviewed: ${formatDate(guide.updatedOn, lang)}`)}
        </p>
      </header>

      <GuideBody blocks={guide.blocks} lang={lang} />

      <p className="prose-width card p-4 text-sm text-muted">
        {t(
          "Bu yazı genel bilgi verir; yatırım tavsiyesi değildir. Kişisel kararlar kişinin kendi durumuna bağlıdır.",
          "This article is general information, not investment advice. Personal decisions depend on individual circumstances.",
        )}
      </p>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("Diğer yazılar", "More in the guide")}</h2>
        <Rows>
          {others.map((g) => (
            <Row key={g.slug}>
              <Link href={localePath(lang, `/rehber/${g.slug}`)} className="flex-1 hover:text-accent">
                {pick(g.title, lang)}
              </Link>
            </Row>
          ))}
        </Rows>
      </section>
    </article>
  );
}
