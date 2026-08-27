import type { ScoringStatus } from "@/lib/data/speeches";
import { formatDateTr } from "@/lib/time";

/**
 * Skorlama boşluğu uyarısı.
 *
 * Skorlama otomatik değil; arşive yeni konuşma girdikçe skorsuz kayıt
 * birikir. Bu kutu boşluğu görünür kılar — aksi hâlde banka ortalamaları
 * eskimiş bir örnekleme dayanırken güncelmiş gibi okunur.
 *
 * `context` metnin hangi sayfada durduğunu belirler: skor sayfasında
 * ortalamalara, arşiv sayfasında listeye atıf yapar.
 */
export function ScoringGap({
  status,
  context,
}: {
  status: ScoringStatus;
  context: "averages" | "archive";
}) {
  if (status.unscored === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-sm">
      <p className="prose-width text-muted">
        Arşivdeki {status.total} konuşmanın{" "}
        <strong className="text-foreground">
          {status.unscored} tanesi henüz skorlanmadı
        </strong>
        {status.latestUnscoredDate &&
          ` (en yenisi ${formatDateTr(status.latestUnscoredDate)})`}
        . Skorlar ve Türkçe özetler otomatik üretilmiyor
        {context === "averages" ? (
          <>
            ; aşağıdaki ortalamalar yalnızca skorlanmış {status.scored} konuşmayı
            yansıtır
            {status.latestScoredDate &&
              ` ve en yeni skorlanan kayıt ${formatDateTr(status.latestScoredDate)} tarihli`}
            .
          </>
        ) : (
          <>
            ; skorsuz kayıtlar listede başlık, konuşmacı ve tarihiyle yer alır,
            kaynak metne bağlantıları çalışır.
          </>
        )}
      </p>
    </div>
  );
}
