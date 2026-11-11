"use client";

import dynamic from "next/dynamic";

/**
 * Grafikler recharts'ı (~400 KB) çeker ve zaten yalnızca istemcide çizilir
 * (ResponsiveContainer sunucuda ölçemez). Burada tembel yüklenir: sayfanın
 * ilk yüklenişinde ağ ve ana iş parçacığı serbest kalır. Yer tutucu grafikle
 * aynı yüksekliktedir — grafik gelince sayfa zıplamaz (CLS).
 * `ssr: false` yalnızca istemci bileşeninde geçerli; bu yüzden ayrı dosya.
 */
const placeholder = (height: string) =>
  function ChartPlaceholder() {
    return <div className={`${height} w-full`} aria-hidden="true" />;
  };

export const ProbabilityChart = dynamic(() => import("./ProbabilityChart").then((m) => m.ProbabilityChart), {
  ssr: false,
  loading: placeholder("h-72"),
});
export const CycleChart = dynamic(() => import("./CycleChart").then((m) => m.CycleChart), {
  ssr: false,
  loading: placeholder("h-72"),
});
export const ExpectedPathChart = dynamic(() => import("./ExpectedPathChart").then((m) => m.ExpectedPathChart), {
  ssr: false,
  loading: placeholder("h-72"),
});
export const TimeSeriesChart = dynamic(() => import("./TimeSeriesChart").then((m) => m.TimeSeriesChart), {
  ssr: false,
  loading: placeholder("h-64"),
});
