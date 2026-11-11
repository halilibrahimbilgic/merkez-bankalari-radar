import { fmtBp, fmtPercent, fmtPercentRange, type Lang } from "./i18n";

/**
 * Grafiklerin metin karşılığı (WCAG 1.1.1): aynı veri tablo olarak. Saf
 * işlevler; tabloyu src/components/ChartFigure.tsx basar. Tablolar sunucuda
 * üretilir — grafik yalnızca istemcide çizildiği için JS'siz ve ekran
 * okuyucuyla gelen için tek erişilebilir biçim budur.
 */
export interface ChartTable {
  head: string[];
  rows: string[][];
}

/**
 * Önceki satırla aynı değerleri taşıyan satırları atar (ilk ve son satır
 * kalır): günlük doldurulmuş basamaklı bir seri yüzlerce özdeş satır
 * üretirdi; "değer ne zaman değişti" bilgisi aynen korunur.
 */
function dropRepeats(rows: string[][]): string[][] {
  return rows.filter((r, i) => {
    if (i === 0 || i === rows.length - 1) return true;
    const prev = rows[i - 1];
    return r.slice(1).some((v, j) => v !== prev[j + 1]);
  });
}

export function seriesTable(
  data: Record<string, string | number | null>[],
  series: { key: string; name: string }[],
  unit: "rate" | "prob",
  lang: Lang,
  firstColumn: string,
): ChartTable {
  const digits = unit === "rate" ? 2 : 0;
  const cell = (v: string | number | null | undefined) => (typeof v === "number" ? fmtPercent(v, lang, digits) : "—");
  return {
    head: [firstColumn, ...series.map((s) => s.name)],
    rows: dropRepeats(data.map((d) => [String(d.label), ...series.map((s) => cell(d[s.key]))])),
  };
}

/** Faiz döngüsü: gerçek tarih ekseni (ms), banka başına birikimli bp. */
export function cycleTable(
  data: Record<string, number>[],
  banks: { key: string; name: string }[],
  lang: Lang,
  firstColumn: string,
): ChartTable {
  const day = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  });
  return {
    head: [firstColumn, ...banks.map((b) => b.name)],
    rows: dropRepeats(
      data.map((d) => [day.format(new Date(d.t)), ...banks.map((b) => (d[b.key] === undefined ? "—" : fmtBp(d[b.key])))]),
    ),
  };
}

export function bucketTable(
  data: { label: string; probabilityPct: number }[],
  labels: { band: string; probability: string },
  lang: Lang,
): ChartTable {
  return {
    head: [labels.band, labels.probability],
    rows: data.map((d) => [d.label, fmtPercent(d.probabilityPct, lang, 1)]),
  };
}

/** Beklenen patika: değerler baz puan cinsinden (grafikle aynı birim). */
export function pathTable(
  data: { label: string; band: [number, number]; mean: number }[],
  labels: { period: string; mean: string; band: string },
  lang: Lang,
): ChartTable {
  return {
    head: [labels.period, labels.mean, labels.band],
    rows: data.map((d) => [
      d.label,
      fmtPercent(d.mean / 100, lang, 2),
      fmtPercentRange(d.band[0] / 100, d.band[1] / 100, lang),
    ]),
  };
}
