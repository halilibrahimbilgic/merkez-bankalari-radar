import { BankTag } from "@/components/ScoreBadge";
import { L, type Lang } from "@/lib/i18n";
import type { NewsItem } from "@/lib/news";
import { formatDate, formatTimeTrt } from "@/lib/time";

/**
 * Haber satırları. Başlık kaynağa gider (haberin kendisi orada); özet
 * bizim yazdığımız kısa metindir, kaynak adı her zaman görünür.
 */
export function NewsList({ items, lang }: { items: NewsItem[]; lang: Lang }) {
  const t = L(lang);
  return (
    <ul className="space-y-3">
      {items.map((n) => (
        <li key={n.id} className="card p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            {n.bankCode && <BankTag code={n.bankCode} lang={lang} />}
            <span>{n.sourceName}</span>
            <span>·</span>
            <time dateTime={n.publishedAt} className="tabular">
              {formatDate(n.publishedAt, lang)}, {formatTimeTrt(n.publishedAt)} TRT
            </time>
            {n.kind === "official" && (
              <span className="rounded bg-accent-soft px-1.5 py-0.5 text-xs text-accent">
                {t("resmî açıklama", "official statement")}
              </span>
            )}
            {n.important && (
              <span className="rounded border border-hawk/40 px-1.5 py-0.5 text-xs text-hawk">
                {t("önemli", "key")}
              </span>
            )}
          </div>
          <h3 className="mt-2 font-medium">
            <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-accent">
              {lang === "en" ? n.titleEn : n.titleTr}
            </a>
          </h3>
          <p className="prose-width mt-1 text-sm text-muted">{lang === "en" ? n.summaryEn : n.summaryTr}</p>
        </li>
      ))}
    </ul>
  );
}
