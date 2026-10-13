import type { Metadata } from "next";
import Link from "next/link";
import { BankFilter } from "@/components/BankFilter";
import { BankTag } from "@/components/ScoreBadge";
import { SurpriseBadge } from "@/components/SurpriseBadge";
import { EmptyState, Row, Rows } from "@/components/ui";
import { isBankCode } from "@/lib/banks";
import { getDecisionViews, type DecisionView } from "@/lib/data/decisions";
import { formatDecisionRate } from "@/lib/decision-format";
import { fmtBp, L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { formatDate, monthLabel } from "@/lib/time";
import type { BankCode } from "@/lib/types";

export function decisionsMetadata(lang: Lang): Metadata {
  const t = L(lang);
  return {
    title: t("Faiz kararları: beklenti ve sonuç", "Rate decisions: expectations and outcomes"),
    description: t(
      "Fed, ECB, TCMB, BoE, BoJ ve RBA kararları: her kararın karardan önceki beklentiyle farkı (sürpriz) ve karar metninde neyin değiştiği.",
      "Fed, ECB, CBRT, BoE, BoJ and RBA decisions: how each compared with the expectation before it, and what changed in the statement.",
    ),
    alternates: languageAlternates(lang, "/kararlar"),
  };
}

export async function DecisionsPage({
  lang,
  searchParams,
}: {
  lang: Lang;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = L(lang);
  const raw = typeof searchParams.banka === "string" ? searchParams.banka : undefined;
  const bankCode: BankCode | undefined = raw && isBankCode(raw) ? raw : undefined;
  const all = await getDecisionViews();
  const views = bankCode ? all.filter((v) => v.meeting.bankCode === bankCode) : all;

  // Ay başlıkları altında, en yeni önce.
  const groups = new Map<string, DecisionView[]>();
  for (const v of views) {
    const key = monthLabel(v.meeting.meetingAt, lang);
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Faiz kararları", "Rate decisions")}</h1>
        <p className="prose-width mt-2 text-muted">
          {t(
            "Her karar, karardan önce oluşmuş beklentiyle karşılaştırılır: piyasa fiyatlaması (BoE) ya da analist ve ekonomist anketleri (Fed, ECB, TCMB). Karar metni bir öncekiyle karşılaştırılır ve değişiklikler özetlenir.",
            "Each decision is compared with the expectation formed before it: market pricing (BoE) or surveys of analysts and economists (Fed, ECB, CBRT). The statement is compared with the previous one and the changes are summarised.",
          )}{" "}
          <Link href={localePath(lang, "/rehber/faiz-karari-nasil-okunur")} className="text-accent hover:underline">
            {t("Faiz kararı nasıl okunur?", "How to read a rate decision")}
          </Link>
        </p>
      </header>

      <BankFilter
        basePath={localePath(lang, "/kararlar")}
        active={bankCode}
        availableCodes={[...new Set(all.map((v) => v.meeting.bankCode))]}
        lang={lang}
      />

      {views.length === 0 ? (
        <EmptyState>{t("Bu filtre için karar yok.", "No decisions for this filter.")}</EmptyState>
      ) : (
        <div className="space-y-5">
          {[...groups].map(([month, rows]) => (
            <section key={month}>
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">{month}</h2>
              <Rows>
                {rows.map((v) => (
                  <DecisionRow key={v.meeting.id} view={v} lang={lang} />
                ))}
              </Rows>
            </section>
          ))}
        </div>
      )}
      <p className="text-sm text-muted">
        {t(
          "Arşiv Ocak 2026'dan başlıyor. BoJ ve RBA için yeniden yayımlanabilir bir beklenti kaynağı olmadığından sürpriz hesaplanmıyor.",
          "The archive starts in January 2026. There is no republishable expectation source for the BoJ and RBA, so no surprise is calculated for them.",
        )}
      </p>
    </div>
  );
}

export function DecisionRow({ view, lang }: { view: DecisionView; lang: Lang }) {
  const t = L(lang);
  const m = view.meeting;
  const bp = view.changeBp ?? 0;
  const tone = view.statement?.summary?.tone;
  return (
    <Row>
      <BankTag code={m.bankCode} lang={lang} />
      <Link href={localePath(lang, `/karar/${m.id}`)} className="min-w-40 flex-1 hover:text-accent">
        <span className="tabular">{formatDate(m.meetingAt, lang)}</span>
        <span className="text-muted"> · </span>
        <span className="tabular font-medium">{formatDecisionRate(m, lang)}</span>{" "}
        <span className={`tabular text-sm ${bp > 0 ? "text-hawk" : bp < 0 ? "text-dove" : "text-muted"}`}>
          ({bp === 0 ? t("sabit", "hold") : fmtBp(bp)})
        </span>
      </Link>
      <span className="flex flex-wrap items-center gap-2">
        {view.expectation ? (
          <SurpriseBadge label={view.expectation.surprise.label} bp={view.expectation.surprise.bp} lang={lang} />
        ) : (
          <span className="text-xs text-muted">
            {view.missing === "no-source" ? t("beklenti kaynağı yok", "no expectation source") : t("anket bekleniyor", "survey pending")}
          </span>
        )}
        {tone && tone !== "little-change" && (
          <span className="text-xs text-muted">
            {t("metin:", "statement:")}{" "}
            {tone === "more-hawkish"
              ? t("daha şahin", "more hawkish")
              : tone === "more-dovish"
                ? t("daha güvercin", "more dovish")
                : t("karışık", "mixed")}
          </span>
        )}
      </span>
    </Row>
  );
}
