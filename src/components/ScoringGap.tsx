import type { ScoringStatus } from "@/lib/data/speeches";
import type { Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/time";

/**
 * Skorlama boşluğu uyarısı.
 *
 * Skorlama günlük işte otomatik yapılır ama koşu başına sınırlıdır; yeni
 * konuşmalar bir sonraki koşuya kadar skorsuz kalabilir. Bu kutu boşluğu
 * görünür kılar — aksi hâlde banka ortalamaları eskimiş bir örnekleme
 * dayanırken güncelmiş gibi okunur.
 *
 * `context` metnin hangi sayfada durduğunu belirler: skor sayfasında
 * ortalamalara, arşiv sayfasında listeye atıf yapar.
 */
export function ScoringGap({
  status,
  context,
  lang,
}: {
  status: ScoringStatus;
  context: "averages" | "archive";
  lang: Lang;
}) {
  if (status.unscored === 0) return null;
  const latest = status.latestUnscoredDate && formatDate(status.latestUnscoredDate, lang);
  const latestScored = status.latestScoredDate && formatDate(status.latestScoredDate, lang);

  if (lang === "en") {
    return (
      <div className="card p-4 text-sm">
        <p className="prose-width text-muted">
          <strong className="text-foreground">
            {status.unscored} of the {status.total} speeches in the archive are not scored yet
          </strong>
          {latest && ` (most recent: ${latest})`}. Summaries and scores are produced by the
          daily job, a few speeches per run
          {context === "averages" ? (
            <>
              ; the averages below reflect only the {status.scored} scored speeches
              {latestScored && `, the most recent dated ${latestScored}`}.
            </>
          ) : (
            <>; unscored entries are listed with title, speaker and date, and their source links work.</>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 text-sm">
      <p className="prose-width text-muted">
        Arşivdeki {status.total} konuşmanın{" "}
        <strong className="text-foreground">{status.unscored} tanesi henüz skorlanmadı</strong>
        {latest && ` (en yenisi ${latest})`}. Özet ve skorlar günlük işte, her koşuda birkaç
        konuşma olmak üzere üretilir
        {context === "averages" ? (
          <>
            ; aşağıdaki ortalamalar yalnızca skorlanmış {status.scored} konuşmayı yansıtır
            {latestScored && ` ve en yeni skorlanan kayıt ${latestScored} tarihli`}.
          </>
        ) : (
          <>
            ; skorsuz kayıtlar listede başlık, konuşmacı ve tarihiyle yer alır, kaynak metne
            bağlantıları çalışır.
          </>
        )}
      </p>
    </div>
  );
}
