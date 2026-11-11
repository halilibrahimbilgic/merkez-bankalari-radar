import { formatScore, scoreLabel, scoreToneClass } from "@/components/ScoreBadge";
import { Card } from "@/components/ui";
import { type DecisionView } from "@/lib/data/decisions";
import { getMinutes } from "@/lib/data/minutes";
import { MINUTES_DELAY, MINUTES_NAME } from "@/lib/minutes";
import { L, type Lang } from "@/lib/i18n";

/**
 * Tutanak: kararın arkasındaki tartışma, sonradan yayımlanır. Yalnızca özet,
 * puan ve resmî bağlantı; metin gösterilmez (src/lib/minutes.ts).
 */
export async function MinutesSection({ view, lang }: { view: DecisionView; lang: Lang }) {
  const t = L(lang);
  const m = view.meeting;
  const rec = await getMinutes(m.id);
  const [nameTr, nameEn] = MINUTES_NAME[m.bankCode];
  const [delayTr, delayEn] = MINUTES_DELAY[m.bankCode];

  if (!rec) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">{t("Tutanakta ne var?", "What do the minutes say?")}</h2>
        <p className="prose-width mt-2 text-sm text-muted">
          {m.bankCode === "boe"
            ? t(
                "MPC tutanağı karar metniyle aynı gün yayımlanır; henüz alınmadı.",
                "The MPC minutes are published on the same day as the decision; they have not been retrieved yet.",
              )
            : t(
                `${nameTr} henüz yayımlanmadı; genellikle kararın ${delayTr} sonrasında çıkar ve özeti burada yer alır.`,
                `The ${nameEn} have not been published yet; they usually follow ${delayEn} after the decision, and a summary will appear here.`,
              )}
        </p>
      </Card>
    );
  }

  const url = rec.urls[lang] ?? rec.urls.en ?? rec.urls.tr;
  const s = rec.summary;
  const en = lang === "en";
  const statementScore = view.statement?.summary?.score;
  return (
    <Card>
      <h2 className="text-lg font-semibold">{t("Tutanakta ne var?", "What do the minutes say?")}</h2>
      <p className="mt-1 text-sm text-muted">
        {t(nameTr, nameEn)}
        {url && (
          <>
            {" · "}
            <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
              {t("resmî metin", "official text")}
            </a>
          </>
        )}
      </p>
      {s ? (
        <div className="mt-3">
          <p className="prose-width font-medium">{en ? s.headlineEn : s.headlineTr}</p>
          <ul className="prose-width mt-3 list-disc space-y-1.5 pl-5">
            {(en ? s.pointsEn : s.pointsTr).map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
          <p className="prose-width mt-3 text-sm">
            <span className="text-muted">{t("Tutanağın duruşu:", "Stance of the minutes:")}</span>{" "}
            <span className={`tabular font-semibold ${scoreToneClass(s.score)}`}>{formatScore(s.score, lang)}</span>{" "}
            <span className="text-xs">({scoreLabel(s.score, lang)})</span>
            {/* Karar metniyle aynı ölçek: tutanak kararın arkasında daha şahin mi, daha güvercin mi? */}
            {statementScore !== undefined && (
              <span className="tabular text-muted">
                {" "}
                · {t("karar metni", "statement")} {formatScore(statementScore, lang)}
              </span>
            )}
            <span className="text-muted"> — {en ? s.scoreReasonEn : s.scoreReasonTr}</span>
          </p>
          <p className="mt-2 text-xs text-muted">
            {t(
              `Özet ve puan bir dil modeli tarafından üretildi (${s.model}, prompt sürümü ${s.promptVersion}); resmî metnin yerini tutmaz. Puan, konuşma ve karar metinleriyle aynı -10 (çok güvercin) ile +10 (çok şahin) arası ölçektedir.`,
              `The summary and score were produced by a language model (${s.model}, prompt version ${s.promptVersion}); they are no substitute for the official text. The score uses the same -10 (very dovish) to +10 (very hawkish) scale as the speeches and statements.`,
            )}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          {t("Tutanak alındı; özeti hazırlanıyor.", "The minutes have been retrieved; the summary is being prepared.")}
        </p>
      )}
    </Card>
  );
}
