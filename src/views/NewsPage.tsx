import type { Metadata } from "next";
import Link from "next/link";
import { NewsList } from "@/components/NewsList";
import { EmptyState } from "@/components/ui";
import { getNews } from "@/lib/data/news";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import type { NewsKind } from "@/lib/news";
import { TELEGRAM_URL } from "@/lib/site";

export function newsMetadata(lang: Lang): Metadata {
  const t = L(lang);
  return {
    title: t("Haberler", "News"),
    description: t(
      "Merkez bankalarının resmî açıklamaları ve finans dünyasının önemli isimlerinin sözleri — Türkçe kısa özetlerle, kaynağına bağlantılı.",
      "Official central bank statements and remarks by key figures in finance — with short summaries and links to the source.",
    ),
    alternates: languageAlternates(lang, "/haberler"),
  };
}

export async function NewsPage({
  lang,
  searchParams,
}: {
  lang: Lang;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = L(lang);
  const raw = typeof searchParams.tur === "string" ? searchParams.tur : undefined;
  const kind: NewsKind | undefined = raw === "resmi" ? "official" : raw === "basin" ? "media" : undefined;
  const items = await getNews({ kind });
  const base = localePath(lang, "/haberler");

  const filters: { href: string; label: string; active: boolean }[] = [
    { href: base, label: t("Tümü", "All"), active: !kind },
    { href: `${base}?tur=resmi`, label: t("Resmî açıklamalar", "Official statements"), active: kind === "official" },
    { href: `${base}?tur=basin`, label: t("Basından", "From the press"), active: kind === "media" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Haberler", "News")}</h1>
        <p className="prose-width mt-2 text-muted">
          {t(
            "Merkez bankalarının resmî açıklamaları ve önemli isimlerin sözlerini aktaran haberler, yarım saatte bir güncellenir. Başlıklar kaynağa gider; özetler bize aittir ve bir dil modeliyle üretilir.",
            "Official central bank statements and news reporting remarks by key figures, updated every half hour. Headlines link to the source; the summaries are ours and are produced by a language model.",
          )}
        </p>
        <p className="mt-2 text-sm">
          <a href={TELEGRAM_URL} className="text-accent hover:underline">
            {t("Önemli haberler Telegram kanalımızda anında →", "Key news instantly on our Telegram channel (in Turkish) →")}
          </a>
        </p>
      </header>

      <nav aria-label={t("Haber türü", "News type")} className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            aria-current={f.active ? "page" : undefined}
            className={
              "inline-flex min-h-9 items-center rounded-full border px-3 text-sm " +
              (f.active
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-muted hover:border-accent hover:text-accent")
            }
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState>{t("Bu filtre için henüz haber yok.", "No news for this filter yet.")}</EmptyState>
      ) : (
        <NewsList items={items} lang={lang} />
      )}

      <p className="prose-width text-sm text-muted">
        {t(
          "Kaynaklar: Fed, ECB, Bank of England, Bank of Japan, RBA ve TCMB'nin resmî akışları; CNBC, BBC, Financial Times, MarketWatch, The Guardian ve Anadolu Ajansı'nın RSS akışları. Haber metinleri kopyalanmaz. Yatırım tavsiyesi değildir.",
          "Sources: official feeds of the Fed, ECB, Bank of England, Bank of Japan, RBA and CBRT; RSS feeds of CNBC, BBC, the Financial Times, MarketWatch, The Guardian and Anadolu Agency. Article texts are not copied. Not investment advice.",
        )}
      </p>
    </div>
  );
}
