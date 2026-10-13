import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RateOdds, type OddsRow } from "@/components/RateOdds";
import { BankTag } from "@/components/ScoreBadge";
import { StatementDiff } from "@/components/StatementDiff";
import { SurpriseBadge, surpriseText } from "@/components/SurpriseBadge";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { Card, SectionHeader, Stat } from "@/components/ui";
import { BANKS, bankName, bankRateName } from "@/lib/banks";
import { getDecisionView, type DecisionView } from "@/lib/data/decisions";
import { getStatement, getStatementText } from "@/lib/data/statements";
import {
  decisionSentence,
  formatDecisionRate,
  hasDecisionPage,
  formatExpectedRate,
  formatPreviousRate,
} from "@/lib/decision-format";
import { fmtBp, fmtPercent, L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import type { StatementLang, StatementRecord, StatementSummary } from "@/lib/statements";
import { diffText } from "@/lib/text-diff";
import { LICENSE_NOTICE_EN, LICENSE_NOTICE_TR } from "@/lib/text-license";
import { formatDate, formatDateShort, formatMeeting, monthLabel } from "@/lib/time";

export async function decisionMetadata(lang: Lang, id: string): Promise<Metadata> {
  const view = await getDecisionView(id);
  if (!view) return {};
  const t = L(lang);
  const m = view.meeting;
  const name = bankName(BANKS[m.bankCode], lang);
  const e = view.expectation;
  return {
    title: t(`${name} faiz kararı, ${formatDate(m.meetingAt, lang)}`, `${name} rate decision, ${formatDate(m.meetingAt, lang)}`),
    description: [
      `${decisionSentence(m, lang)}.`,
      e &&
        t(
          `Karardan önceki beklenti ${formatExpectedRate(m.bankCode, e.point.rate, lang)}: ${surpriseText(e.surprise.label, lang)}.`,
          `Expectation before the decision ${formatExpectedRate(m.bankCode, e.point.rate, lang)}: ${surpriseText(e.surprise.label, lang)}.`,
        ),
      view.statement?.summary && (lang === "en" ? view.statement.summary.headlineEn : view.statement.summary.headlineTr),
    ]
      .filter(Boolean)
      .join(" "),
    alternates: languageAlternates(lang, `/karar/${m.id}`),
  };
}

export async function DecisionPage({ lang, id }: { lang: Lang; id: string }) {
  const view = await getDecisionView(id);
  if (!view) notFound();
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);
  const now = new Date();
  const m = view.meeting;
  const bank = BANKS[m.bankCode];
  const name = bankName(bank, lang);

  return (
    <article className="space-y-8">
      <header>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <BankTag code={m.bankCode} lang={lang} />
          <span className="tabular">{formatMeeting(m.meetingAt, m.timeTbd, lang)}</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {t(`${name} faiz kararı`, `${name} rate decision`)}
          <span className="text-base font-normal text-muted"> · {formatDate(m.meetingAt, lang)}</span>
        </h1>
        <p className="mt-1 text-lg">{decisionSentence(m, lang)}.</p>
      </header>

      <DecisionCard view={view} lang={lang} />
      <ExpectationCard view={view} lang={lang} />
      <StatementSection view={view} lang={lang} />

      <nav aria-label={t("Bu bankanın diğer kararları", "Other decisions by this bank")} className="flex flex-wrap justify-between gap-3 text-sm">
        {view.previous && hasDecisionPage(view.previous, now) ? (
          <Link href={p(`/karar/${view.previous.id}`)} className="text-accent hover:underline">
            ← {t("Önceki karar", "Previous decision")} ({formatDate(view.previous.meetingAt, lang)})
          </Link>
        ) : (
          <span />
        )}
        {view.next && hasDecisionPage(view.next, now) && (
          <Link href={p(`/karar/${view.next.id}`)} className="text-accent hover:underline">
            {t("Sonraki karar", "Next decision")} ({formatDate(view.next.meetingAt, lang)}) →
          </Link>
        )}
      </nav>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href={p("/kararlar")} className="text-accent hover:underline">
          {t("← Tüm kararlar", "← All decisions")}
        </Link>
        <Link href={p(`/banka/${m.bankCode}`)} className="text-accent hover:underline">
          {t(`${name} sayfası`, `${name} page`)}
        </Link>
      </div>
    </article>
  );
}

function DecisionCard({ view, lang }: { view: DecisionView; lang: Lang }) {
  const t = L(lang);
  const m = view.meeting;
  const bp = view.changeBp ?? 0;
  return (
    <Card>
      <h2 className="text-lg font-semibold">{t("Karar", "Decision")}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {m.previousRate !== undefined && (
          <Stat label={t("Önceki oran", "Previous rate")} value={formatPreviousRate(m, lang)} />
        )}
        <Stat label={t("Yeni oran", "New rate")} value={formatDecisionRate(m, lang)} />
        <Stat
          label={t("Değişim", "Change")}
          value={bp === 0 ? t("değişiklik yok", "no change") : fmtBp(bp)}
          tone={bp > 0 ? "text-hawk" : bp < 0 ? "text-dove" : "text-foreground"}
        />
      </div>
      <p className="mt-3 text-sm text-muted">{bankRateName(BANKS[m.bankCode], lang)}</p>
    </Card>
  );
}

/** Kaynağın okura gösterilen adı ve turu. */
function sourceLine(view: DecisionView, lang: Lang): string {
  const t = L(lang);
  const e = view.expectation!;
  const round = e.point.round ? monthLabel(`${e.point.round}-15T12:00:00Z`, lang) : "";
  switch (e.source) {
    case "boe-ois":
      return t(
        `BoE'nin OIS faiz eğrisi, ${formatDate(e.point.date, lang)} kapanışı (karardan önceki son iş günü)`,
        `Bank of England OIS curve, close of ${formatDate(e.point.date, lang)} (last business day before the decision)`,
      );
    case "ecb-sma":
      return t(
        `ECB analist anketi (Survey of Monetary Analysts), ${round} turu — yanıtlar karardan önce toplandı, sonuçlar ${formatDate(e.point.publishedOn!, lang)} tarihinde yayımlandı`,
        `ECB Survey of Monetary Analysts, ${round} round — responses collected before the decision, results published on ${formatDate(e.point.publishedOn!, lang)}`,
      );
    case "tcmb-pka":
      return t(
        `TCMB Piyasa Katılımcıları Anketi, ${round} — ${formatDate(e.point.date, lang)} tarihinde yayımlandı; katılımcıların ortalaması`,
        `CBRT Survey of Market Participants, ${round} — published on ${formatDate(e.point.date, lang)}; participants' average`,
      );
    case "nyfed-sme":
      return t(
        `New York Fed Piyasa Beklentileri Anketi (Survey of Market Expectations), ${round} turu — yanıtlar ${formatDate(e.point.date, lang)} tarihine kadar, karardan önce toplandı; medyan beklenti`,
        `New York Fed Survey of Market Expectations, ${round} round — responses collected by ${formatDate(e.point.date, lang)}, before the decision; median expectation`,
      );
  }
}

function ExpectationCard({ view, lang }: { view: DecisionView; lang: Lang }) {
  const t = L(lang);
  const m = view.meeting;
  const e = view.expectation;

  if (!e) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">{t("Karardan önceki beklenti", "Expectation before the decision")}</h2>
        <p className="prose-width mt-2 text-muted">
          {view.missing === "no-source"
            ? t(
                "Bu banka için yeniden yayımlanabilir bir beklenti kaynağı yok: piyasa fiyatları vadeli işlem borsalarının lisanslı verisi, ücretsiz bir anket de bulunmuyor. Bu yüzden kararın beklentiden farkı hesaplanmıyor.",
                "There is no expectation source for this bank that can be republished: market prices are the futures exchanges' licensed data and there is no free survey. So the gap between the decision and expectations is not calculated.",
              )
            : t(
                "Karardan önce toplanan anketin sonuçları henüz yayımlanmadı ya da karardan önce oluşmuş bir beklenti kaydı yok. Yayımlanınca burada görünecek.",
                "The results of the survey collected before this decision have not been published yet, or there is no expectation recorded before the decision. They will appear here once published.",
              )}
        </p>
      </Card>
    );
  }

  const oddsRows: OddsRow[] | undefined = e.odds && [
    { direction: "up", label: t("Artırım", "Hike"), pct: e.odds.hike },
    { direction: "flat", label: t("Sabit", "Hold"), pct: e.odds.hold },
    { direction: "down", label: t("İndirim", "Cut"), pct: e.odds.cut },
  ];
  const s = e.surprise;
  const expected = formatExpectedRate(m.bankCode, e.point.rate, lang);

  // Grafik: önceki karardan bu karara beklentinin seyri.
  const chart = view.history.map((pt) => ({ label: formatDateShort(pt.date, lang), expected: pt.rate }));

  return (
    <Card>
      <SectionHeader
        title={t("Karardan önceki beklenti", "Expectation before the decision")}
        description={sourceLine(view, lang)}
      />
      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
        {e.kind === "market" ? t("piyasa fiyatlaması", "market pricing") : t("anket", "survey")}
      </span>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label={t("Beklenen oran", "Expected rate")} value={expected} note={fmtBp(e.expectedChangeBp)} />
        <Stat label={t("Karar", "Decision")} value={formatDecisionRate(m, lang)} note={view.changeBp !== undefined ? fmtBp(view.changeBp) : undefined} />
        <Stat
          label={t("Fark", "Gap")}
          value={fmtBp(s.bp)}
          tone={s.bp > 0 ? "text-hawk" : s.bp < 0 ? "text-dove" : "text-foreground"}
          note={surpriseText(s.label, lang)}
        />
      </div>

      <p className="prose-width mt-4">
        <SurpriseBadge label={s.label} bp={s.bp} lang={lang} />{" "}
        {s.label === "in-line"
          ? s.bp === 0
            ? t("Karar, karardan önceki beklentiyle aynı.", "The decision matched the expectation before it.")
            : t(
                `Karar beklentiyle uyumlu; fark ${Math.abs(s.bp)} baz puan.`,
                `The decision was in line with expectations; the gap is ${Math.abs(s.bp)} basis points.`,
              )
          : s.bp > 0
            ? t(
                `Karar, beklentiden ${Math.abs(s.bp)} baz puan daha sıkı (faiz beklenenden yüksek).`,
                `The decision was ${Math.abs(s.bp)} basis points tighter than expected (the rate is higher than expected).`,
              )
            : t(
                `Karar, beklentiden ${Math.abs(s.bp)} baz puan daha gevşek (faiz beklenenden düşük).`,
                `The decision was ${Math.abs(s.bp)} basis points looser than expected (the rate is lower than expected).`,
              )}
      </p>

      {oddsRows && (
        <div className="mt-4 max-w-md">
          <div className="mb-2 text-sm text-muted">
            {e.kind === "market"
              ? t("Fiyatlanan olasılıklar (25 bp adım varsayımıyla, yaklaşık)", "Priced probabilities (approximate, assuming 25 bp steps)")
              : t("Katılımcıların ortalama olasılıkları", "Participants' average probabilities")}
          </div>
          <RateOdds rows={oddsRows} lang={lang} />
          {e.actualPct !== undefined && (
            <p className="mt-2 text-sm text-muted">
              {t(
                `Katılımcıların gerçekleşen sonuca verdiği ortalama olasılık: ${fmtPercent(e.actualPct, lang, 0)}.`,
                `Participants' average probability for the actual outcome: ${fmtPercent(e.actualPct, lang, 0)}.`,
              )}
            </p>
          )}
        </div>
      )}

      {chart.length >= 2 && (
        <div className="mt-6">
          <h3 className="text-base font-semibold">{t("Beklentinin seyri", "How the expectation moved")}</h3>
          <p className="prose-width mt-1 text-sm text-muted">
            {t(
              "Önceki karardan bu karara kadar, bu toplantı için beklenen oran. Kesik çizgiler önceki oranı ve kararı gösterir.",
              "The rate expected for this meeting, from the previous decision up to this one. Dashed lines show the previous rate and the decision.",
            )}
          </p>
          <div className="mt-3">
            <TimeSeriesChart
              data={chart}
              series={[{ key: "expected", name: t("Beklenen oran", "Expected rate"), color: "var(--accent)" }]}
              unit="rate"
              lang={lang}
              stepped={e.kind === "survey"}
              refLines={[
                ...(m.previousRate !== undefined
                  ? [{ y: m.previousRate, label: t("önceki oran", "previous rate"), color: "var(--muted)" }]
                  : []),
                { y: m.decisionRate!, label: t("karar", "decision"), color: "var(--hawk)" },
              ]}
            />
          </div>
        </div>
      )}

      <p className="prose-width mt-4 text-sm text-muted">
        {t(
          "Fark 10 baz puanın altındaysa karar beklentiyle uyumlu, 25 baz puan ve üstündeyse sürpriz sayılır; aradaki fark \"biraz\" diye gösterilir. Yalnızca önceki karardan sonra ve bu karardan önce oluşmuş beklentiler kullanılır.",
          "A gap below 10 basis points counts as in line, 25 basis points or more as a surprise, and anything between as \"slightly\". Only expectations formed after the previous decision and before this one are used.",
        )}{" "}
        <Link href={localePath(lang, "/rehber/beklenti-nasil-olculur")} className="text-accent hover:underline">
          {t("Beklenti nasıl ölçülür?", "How are expectations measured?")}
        </Link>{" "}
        ·{" "}
        <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
          {t("Kaynak", "Source")}
        </a>
      </p>
    </Card>
  );
}

async function StatementSection({ view, lang }: { view: DecisionView; lang: Lang }) {
  const t = L(lang);
  const rec = view.statement;
  const m = view.meeting;

  if (!rec) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">{t("Karar metninde ne değişti?", "What changed in the statement?")}</h2>
        <p className="mt-2 text-muted">
          {t("Karar metni henüz alınmadı.", "The decision statement has not been retrieved yet.")}
        </p>
      </Card>
    );
  }

  // Gösterim dili: TCMB metni iki dilde var; diğerleri yalnızca İngilizce.
  const textLang: StatementLang = rec.langs.includes(lang) ? lang : rec.langs[0];
  const prevRec = rec.previousId ? await getStatement(rec.previousId) : undefined;
  const [current, previous] = await Promise.all([
    getStatementText(rec, textLang),
    prevRec ? getStatementText(prevRec, textLang) : Promise.resolve(null),
  ]);
  const diff = current && previous ? diffText(previous, current) : undefined;
  const otherLang = textLang !== lang ? t(" (İngilizce)", " (in Turkish)") : "";
  const url = rec.urls[textLang] ?? Object.values(rec.urls)[0];

  return (
    <Card>
      <h2 className="text-lg font-semibold">{t("Karar metninde ne değişti?", "What changed in the statement?")}</h2>
      {rec.summary ? (
        <SummaryBlock summary={rec.summary} lang={lang} />
      ) : (
        <p className="mt-2 text-sm text-muted">
          {t(
            "Metnin özeti hazırlanıyor; karar metni alındıktan kısa süre sonra eklenir.",
            "The summary is being prepared; it is added shortly after the statement is retrieved.",
          )}
        </p>
      )}

      {diff ? (
        <section className="mt-6" aria-labelledby="fark">
          <h3 id="fark" className="text-base font-semibold">
            {t("Bir önceki metne göre fark", "Difference from the previous statement")}
            <span className="text-sm font-normal text-muted">{otherLang}</span>
          </h3>
          <p className="mt-1 text-sm text-muted">
            {t(
              `${diff.added} kelime eklendi, ${diff.removed} kelime çıkarıldı. Eklenenler altı çizili, çıkarılanlar üstü çizili gösterilir.`,
              `${diff.added} words added, ${diff.removed} words removed. Additions are underlined, removals struck through.`,
            )}
          </p>
          <div className="mt-4">
            <StatementDiff diff={diff} lang={lang} textLang={textLang} />
          </div>
        </section>
      ) : (
        !rec.publishable && (
          <p className="prose-width mt-4 text-sm text-muted">
            {m.bankCode === "boj"
              ? t(
                  "Metin yalnızca PDF olarak yayımlandığı için satır satır karşılaştırma gösterilmiyor; özet metnin tamamından üretildi.",
                  "The statement is published only as a PDF, so a line-by-line comparison is not shown; the summary is based on the full text.",
                )
              : t(
                  "Yayımcının kullanım şartları metnin sitede yeniden yayımlanmasına izin vermediği için yalnızca özet gösteriliyor.",
                  "The publisher's terms of use do not allow the statement to be republished here, so only the summary is shown.",
                )}
          </p>
        )
      )}

      <p className="prose-width mt-4 text-sm text-muted">
        {rec.publishable && licenseNotice(rec, lang)}{" "}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
            {t("Resmî karar metni →", "Official statement →")}
          </a>
        )}
      </p>
    </Card>
  );
}

function SummaryBlock({ summary, lang }: { summary: StatementSummary; lang: Lang }) {
  const t = L(lang);
  const en = lang === "en";
  const tone = {
    "more-hawkish": t("bir öncekine göre daha şahin", "more hawkish than the previous one"),
    "more-dovish": t("bir öncekine göre daha güvercin", "more dovish than the previous one"),
    "little-change": t("bir öncekiyle büyük ölçüde aynı", "largely unchanged from the previous one"),
    mixed: t("iki yönde değişiklikler içeriyor", "mixed, with changes in both directions"),
  }[summary.tone];
  const toneClass =
    summary.tone === "more-hawkish" ? "text-hawk" : summary.tone === "more-dovish" ? "text-dove" : "text-foreground";
  return (
    <div className="mt-3">
      <p className="prose-width font-medium">{en ? summary.headlineEn : summary.headlineTr}</p>
      <ul className="prose-width mt-3 list-disc space-y-1.5 pl-5">
        {(en ? summary.changesEn : summary.changesTr).map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
      <p className="prose-width mt-3 text-sm">
        <span className="text-muted">{t("Metnin tonu:", "Tone of the statement:")}</span>{" "}
        <span className={`font-medium ${toneClass}`}>{tone}</span>
        <span className="text-muted"> — {en ? summary.toneReasonEn : summary.toneReasonTr}</span>
      </p>
      <p className="mt-2 text-xs text-muted">
        {t(
          `Özet ve ton değerlendirmesi bir dil modeli tarafından üretildi (${summary.model}, prompt sürümü ${summary.promptVersion}); resmî metnin yerini tutmaz.`,
          `The summary and tone assessment were produced by a language model (${summary.model}, prompt version ${summary.promptVersion}); they are no substitute for the official text.`,
        )}
      </p>
    </div>
  );
}

function licenseNotice(rec: StatementRecord, lang: Lang): string {
  const tr = lang === "tr";
  switch (rec.bankCode) {
    case "fed":
      return tr ? LICENSE_NOTICE_TR["frb-public-domain"] : LICENSE_NOTICE_EN["frb-public-domain"];
    case "ecb":
      return tr ? LICENSE_NOTICE_TR.ecb : LICENSE_NOTICE_EN.ecb;
    case "rba":
      return tr ? LICENSE_NOTICE_TR["cc-by-4.0"] : LICENSE_NOTICE_EN["cc-by-4.0"];
    case "tcmb":
      return tr
        ? "Kaynak: Türkiye Cumhuriyet Merkez Bankası. Metin, TCMB'nin kullanım şartları uyarınca kaynak gösterilerek ve ticari olmayan amaçla yayımlanmıştır."
        : "Source: Central Bank of the Republic of Türkiye. Reproduced with the source acknowledged and for non-commercial purposes, as the CBRT's terms of use permit.";
    default:
      return "";
  }
}

