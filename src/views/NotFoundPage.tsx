import type { Metadata } from "next";
import { BankTag } from "@/components/ScoreBadge";
import { Row, Rows } from "@/components/ui";
import { getUpcomingMeetings } from "@/lib/data/meetings";
import { decisionPath } from "@/lib/decision-format";
import { L, localePath, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/time";

export function notFoundMetadata(lang: Lang): Metadata {
  return { title: L(lang)("Sayfa bulunamadı", "Page not found") };
}

/**
 * notFound() çağrılan rotaların (ör. geçersiz /karar/<id>) gövdesi. Sıradaki
 * üç karar da listelenir: yanlış adrese gelen okur bir adımda aradığına yakın
 * bir sayfaya geçebilsin.
 */
export async function NotFoundPage({ lang }: { lang: Lang }) {
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);
  const now = new Date();
  const upcoming = await getUpcomingMeetings({ limit: 3, now });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Sayfa bulunamadı", "Page not found")}</h1>
        <p className="prose-width mt-2 text-muted">
          {t(
            "Aradığınız adres yok ya da kaldırılmış olabilir. Takvimden ya da kararlar listesinden devam edebilirsiniz.",
            "The address you opened does not exist or may have been removed. You can continue from the calendar or the list of decisions.",
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <a href={p("/takvim")} className="rounded border border-border px-3 py-1.5 hover:bg-surface">
            {t("Takvim", "Calendar")}
          </a>
          <a href={p("/kararlar")} className="rounded border border-border px-3 py-1.5 hover:bg-surface">
            {t("Kararlar", "Decisions")}
          </a>
          <a href={p("/")} className="rounded border border-border px-3 py-1.5 hover:bg-surface">
            {t("Ana sayfa", "Home")}
          </a>
        </div>
      </header>

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("Sıradaki kararlar", "Next decisions")}</h2>
          <Rows>
            {upcoming.map((m) => {
              const path = decisionPath(m, now) ?? `/banka/${m.bankCode}`;
              return (
                <Row key={m.id}>
                  <span className="w-16 shrink-0">
                    <BankTag code={m.bankCode} lang={lang} />
                  </span>
                  <a href={p(path)} className="tabular flex-1 hover:underline">
                    {formatDate(m.meetingAt, lang)}
                  </a>
                </Row>
              );
            })}
          </Rows>
        </section>
      )}
    </div>
  );
}
