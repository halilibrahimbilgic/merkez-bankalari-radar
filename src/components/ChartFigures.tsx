import type { ComponentProps } from "react";
import { ChartFigure } from "@/components/ChartFigure";
import { CycleChart, ExpectedPathChart, ProbabilityChart, TimeSeriesChart } from "@/components/LazyCharts";
import { bucketTable, cycleTable, pathTable, seriesTable } from "@/lib/chart-tables";
import { L } from "@/lib/i18n";

/**
 * Sunucu bileşenleri: tembel yüklenen grafik + aynı verinin tablosu.
 * Görünümler grafikleri yalnızca bunlar üzerinden kullanır; `label` grafiğin
 * ekran okuyucudaki adıdır.
 */
type Lang = "tr" | "en";

export function TimeSeriesFigure({ label, ...chart }: ComponentProps<typeof TimeSeriesChart> & { label: string }) {
  const t = L(chart.lang);
  return (
    <ChartFigure
      label={label}
      lang={chart.lang}
      table={seriesTable(chart.data, chart.series, chart.unit, chart.lang, t("Tarih", "Date"))}
    >
      <TimeSeriesChart {...chart} />
    </ChartFigure>
  );
}

export function CycleFigure({ label, ...chart }: ComponentProps<typeof CycleChart> & { label: string }) {
  const t = L(chart.lang);
  return (
    <ChartFigure label={label} lang={chart.lang} table={cycleTable(chart.data, chart.banks, chart.lang, t("Tarih", "Date"))}>
      <CycleChart {...chart} />
    </ChartFigure>
  );
}

export function ProbabilityFigure({ label, ...chart }: ComponentProps<typeof ProbabilityChart> & { label: string }) {
  const lang: Lang = chart.labels.lang;
  return (
    <ChartFigure label={label} lang={lang} table={bucketTable(chart.data, chart.labels, lang)}>
      <ProbabilityChart {...chart} />
    </ChartFigure>
  );
}

export function PathFigure({ label, ...chart }: ComponentProps<typeof ExpectedPathChart> & { label: string }) {
  const lang: Lang = chart.labels.lang;
  return (
    <ChartFigure label={label} lang={lang} table={pathTable(chart.data, chart.labels, lang)}>
      <ExpectedPathChart {...chart} />
    </ChartFigure>
  );
}
