import type { Metadata } from "next";
import Link from "next/link";
import { BankFilter } from "@/components/BankFilter";
import { CycleChart } from "@/components/CycleChart";
import { BankTag } from "@/components/ScoreBadge";
import { SurpriseBadge } from "@/components/SurpriseBadge";
import { Card, EmptyState, Row, Rows, SectionHeader, TableFrame, Th } from "@/components/ui";
import { BANKS, bankColorVar, bankName, CALENDAR_BANK_CODES, isBankCode } from "@/lib/banks";
import { getDecisionViews, type DecisionView } from "@/lib/data/decisions";
import { getAllMeetings } from "@/lib/data/meetings";
import { DECISIONS_FROM, fedRange, formatDecisionRate, hasDecisionPage } from "@/lib/decision-format";
import { fmtBp, fmtPercent, L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { cycleSeries, rateCycle } from "@/lib/rate-cycle";
import { formatDate, formatDateShort, monthLabel, trtDayKey } from "@/lib/time";
import { getTcmbFunding } from "@/lib/data/tcmb-funding";
import { divergencePeriods, periodSentence } from "@/lib/tcmb-funding";
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

      {!bankCode && <CycleSection lang={lang} />}

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
    // Bağlantının ::after'ı satırı kaplar: bütün satır tıklanır (rozetler bağlantı değil).
    <Row className="relative hover:bg-surface-sunken">
      <BankTag code={m.bankCode} lang={lang} />
      <Link
        href={localePath(lang, `/karar/${m.id}`)}
        className="min-w-40 flex-1 after:absolute after:inset-0 after:content-[''] hover:text-accent"
      >
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

/**
 * Kim artırıyor, kim indiriyor: son 12 aydaki toplam değişim, grafik ve
 * tablo. Pencere ayın başından başlar (başlıktaki ay adı tam doğru olsun)
 * ve arşivden geriye gidemez; Ocak'ta "yıl başından" boş kalırdı.
 */
async function CycleSection({ lang }: { lang: Lang }) {
  const t = L(lang);
  const now = new Date();
  const yearAgo = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const from = yearAgo > DECISIONS_FROM ? yearAgo : DECISIONS_FROM;
  const meetings = await getAllMeetings();
  const rows = rateCycle(meetings, CALENDAR_BANK_CODES, from, now);
  const data = cycleSeries(meetings, CALENDAR_BANK_CODES, from, now) as Record<string, number>[];
  const byId = new Map(meetings.map((m) => [m.id, m]));
  // TCMB'nin politika faizi değiştirilmeden oluşan fonlama farkı tabloda görünmez; altına not düşülür.
  const funding = await getTcmbFunding();
  const fundingPeriods = funding
    ? divergencePeriods(funding, trtDayKey(now.toISOString())).filter((p) => !p.end || p.end > from)
    : [];

  return (
    <section aria-labelledby="dongu" className="space-y-3">
      <Card>
        <SectionHeader
          id="dongu"
          title={`${t("Faiz döngüsü", "Rate cycle")}: ${monthLabel(from, lang)} – ${t("bugün", "today")}`}
          description={t(
            "Hangi banka artırıyor, hangisi indiriyor: dönem başından bu yana politika faizindeki toplam değişim, baz puan cinsinden. Faiz düzeyleri çok farklı olduğu için seviye yerine değişim gösteriliyor.",
            "Who is hiking and who is cutting: the cumulative change in each policy rate over the period, in basis points. Changes rather than levels, because the rates themselves differ so much.",
          )}
        />
        <CycleChart
          data={data}
          lang={lang}
          banks={CALENDAR_BANK_CODES.map((code) => ({
            key: code,
            name: bankName(BANKS[code], lang),
            color: bankColorVar(code),
          }))}
        />
      </Card>
      <TableFrame minWidth="34rem">
        <thead>
          <tr className="border-b border-border-strong text-left text-muted">
            <Th>{t("Banka", "Bank")}</Th>
            <Th align="right">{t("Faiz", "Rate")}</Th>
            <Th align="right">{t("Değişim", "Change")}</Th>
            {/* Telefonda dördüncü sütun tabloyu kaydırıyordu; karar listesi zaten aşağıda. */}
            <Th align="right" className="max-sm:hidden">
              {t("Son değişiklik", "Last change")}
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const total = r.totalBp ?? 0;
            const last = r.lastChange && byId.get(r.lastChange.meetingId);
            const lastText = r.lastChange && `${fmtBp(r.lastChange.bp)} · ${formatDateShort(r.lastChange.at, lang)}`;
            return (
              <tr key={r.bankCode} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5">
                  <BankTag code={r.bankCode} lang={lang} />
                </td>
                <td className="tabular whitespace-nowrap px-4 py-2.5 text-right">
                  {r.current === undefined ? "—" : r.bankCode === "fed" ? fedRange(r.current, lang) : fmtPercent(r.current, lang)}
                </td>
                <td className="tabular px-4 py-2.5 text-right">
                  <span className={`font-semibold ${total > 0 ? "text-hawk" : total < 0 ? "text-dove" : ""}`}>
                    {r.totalBp === undefined ? "—" : total === 0 ? t("değişmedi", "unchanged") : fmtBp(total)}
                  </span>
                  {(r.hikes > 0 || r.cuts > 0) && (
                    <div className="text-xs text-muted">
                      {[
                        r.hikes > 0 && t(`${r.hikes} artırım`, `${r.hikes} hike${r.hikes > 1 ? "s" : ""}`),
                        r.cuts > 0 && t(`${r.cuts} indirim`, `${r.cuts} cut${r.cuts > 1 ? "s" : ""}`),
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </td>
                <td className="tabular whitespace-nowrap px-4 py-2.5 text-right max-sm:hidden">
                  {!lastText ? (
                    "—"
                  ) : last && hasDecisionPage(last, now) ? (
                    <Link href={localePath(lang, `/karar/${last.id}`)} className="text-accent hover:underline">
                      {lastText}
                    </Link>
                  ) : (
                    <span className="text-muted">{lastText}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableFrame>
      {fundingPeriods.length > 0 && (
        <p className="prose-width text-sm text-muted">
          {t("TCMB: ", "CBRT: ")}
          {fundingPeriods.map((p) => periodSentence(p, lang)).join(" ")}{" "}
          {t(
            "Bu fark politika faizi değiştirilmeden oluştuğu için tablodaki değişime dahil değil. ",
            "It arose without a change in the policy rate, so it is not part of the change in the table. ",
          )}
          <Link href={`${localePath(lang, "/banka/tcmb")}#fiili-fonlama`} className="text-accent hover:underline">
            {t("Ayrıntı", "Details")}
          </Link>
        </p>
      )}
    </section>
  );
}
