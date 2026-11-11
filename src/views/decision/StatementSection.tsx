import { formatScore, scoreLabel, scoreToneClass } from "@/components/ScoreBadge";
import { StatementDiff } from "@/components/StatementDiff";
import { Card } from "@/components/ui";
import { type DecisionView } from "@/lib/data/decisions";
import { getStatement, getStatementText } from "@/lib/data/statements";
import { L, type Lang } from "@/lib/i18n";
import type { StatementLang, StatementRecord, StatementSummary } from "@/lib/statements";
import { diffText } from "@/lib/text-diff";
import { LICENSE_NOTICE_EN, LICENSE_NOTICE_TR } from "@/lib/text-license";

export async function StatementSection({ view, lang }: { view: DecisionView; lang: Lang }) {
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
        <SummaryBlock summary={rec.summary} previousScore={prevRec?.summary?.score} lang={lang} />
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

function SummaryBlock({
  summary,
  previousScore,
  lang,
}: {
  summary: StatementSummary;
  /** Bir önceki karar metninin puanı — düzeyin nereden geldiği görülsün. */
  previousScore?: number;
  lang: Lang;
}) {
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
      {summary.score !== undefined && (
        <p className="prose-width mt-2 text-sm">
          <span className="text-muted">{t("Metnin duruşu:", "Stance of the statement:")}</span>{" "}
          <span className={`tabular font-semibold ${scoreToneClass(summary.score)}`}>{formatScore(summary.score, lang)}</span>{" "}
          <span className="text-xs">({scoreLabel(summary.score, lang)})</span>
          {previousScore !== undefined && (
            <span className="tabular text-muted">
              {" "}
              · {t("önceki karar metni", "previous statement")} {formatScore(previousScore, lang)}
            </span>
          )}
          <span className="text-muted"> — {en ? summary.scoreReasonEn : summary.scoreReasonTr}</span>
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        {t(
          `Özet, ton ve puan bir dil modeli tarafından üretildi (${summary.model}, prompt sürümü ${summary.promptVersion}); resmî metnin yerini tutmaz. Puan, konuşmalarla aynı -10 (çok güvercin) ile +10 (çok şahin) arası ölçektedir.`,
          `The summary, tone and score were produced by a language model (${summary.model}, prompt version ${summary.promptVersion}); they are no substitute for the official text. The score uses the same -10 (very dovish) to +10 (very hawkish) scale as the speeches.`,
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
