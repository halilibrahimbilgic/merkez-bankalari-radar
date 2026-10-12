import { getMeetingsFetchedAt } from "@/lib/data/meetings";
import { getSpeechesFetchedAt } from "@/lib/data/speeches";
import { getProbabilitySnapshot } from "@/lib/data/probabilities";
import { L, type Lang } from "@/lib/i18n";
import { formatDate, relativeTime } from "@/lib/time";

/**
 * Veri tazeliği göstergesi.
 *
 * Piyasa verisi gösteren bir sitede "bu sayı ne kadar eski" sorusu birinci
 * güven sorusudur ve şu ana kadar yalnızca /hakkinda sayfasında, tek bir
 * zaman damgası olarak duruyordu. Üç besleme ayrı ayrı ve farklı hızlarda
 * tazelenir, bu yüzden tek bir "son güncelleme" yanıltıcı olurdu:
 * takvim günlük, olasılık verisi piyasa günü kapanışıyla, skorlama ise
 * koşu başına sınırlı sayıda konuşmayla, birikimi günler içinde eriterek.
 */
export async function DataFreshness({ lang }: { lang: Lang }) {
  const t = L(lang);
  const [meetings, speeches, probability] = await Promise.all([
    getMeetingsFetchedAt(),
    getSpeechesFetchedAt(),
    getProbabilitySnapshot(),
  ]);

  const items = [
    meetings && { label: t("Takvim", "Calendar"), value: relativeTime(meetings, undefined, lang) },
    probability && {
      label: t("Piyasa verisi", "Market data"),
      // Burada "kaç saat önce çekildi" değil, verinin AİT OLDUĞU piyasa
      // günü anlamlı: Atlanta Fed gün içinde güncellenmez.
      value: t(
        `${formatDate(probability.asOf, lang)} kapanışı`,
        `close of ${formatDate(probability.asOf, lang)}`,
      ),
    },
    speeches && {
      label: t("Konuşma arşivi", "Speech archive"),
      value: relativeTime(speeches, undefined, lang),
    },
  ].filter((x): x is { label: string; value: string } => Boolean(x));

  if (items.length === 0) return null;

  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
      {items.map((item) => (
        <div key={item.label} className="flex gap-1.5">
          <dt>{item.label}:</dt>
          <dd className="tabular text-foreground/80">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
