"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Beklenen faiz patikası — piyasanın ilerideki dönemler için fiyatladığı
 * ortalama faiz ve belirsizlik bandı (25.–75. yüzdelik).
 *
 * Band, tek bir çizginin gizlediği şeyi gösterir: ileri dönemlerde piyasa
 * ortalamada benzer bir seviye fiyatlıyor ama olası aralık giderek açılıyor.
 */
export interface PathPoint {
  label: string;
  /** [25. yüzdelik, 75. yüzdelik] — Recharts aralık alanı biçimi. */
  band: [number, number];
  mean: number;
}

/** Metinler sunucudan gelir — istemci bileşeni dil seçimini bilmez. */
export interface ExpectedPathLabels {
  mean: string;
  band: string;
  target: string;
  period: string;
  lang: "tr" | "en";
}

export function ExpectedPathChart({
  data,
  targetRange,
  labels,
}: {
  data: PathPoint[];
  targetRange?: { lowerBps: number; upperBps: number };
  labels: ExpectedPathLabels;
}) {
  const fmt = (bps: number) => {
    const s = (bps / 100).toFixed(2);
    return labels.lang === "en" ? `${s}%` : `%${s.replace(".", ",")}`;
  };

  return (
    <div>
      {/* Grafikte üç ayrı görsel eleman var; hangisinin ne olduğunu yazıyoruz. */}
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0.5 w-5 rounded-full bg-accent"
          />
          {labels.mean}
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-5 rounded-sm bg-muted opacity-25"
          />
          {labels.band}
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-5 rounded-sm bg-accent opacity-25"
          />
          {labels.target}
        </li>
      </ul>

      <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />

          {/* Bugünkü hedef aralık — patikanın nereden başladığını gösterir. */}
          {targetRange && (
            <ReferenceArea
              y1={targetRange.lowerBps}
              y2={targetRange.upperBps}
              fill="var(--accent)"
              fillOpacity={0.18}
              ifOverflow="extendDomain"
            />
          )}

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            stroke="var(--border)"
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            stroke="var(--border)"
            width={52}
            tickFormatter={fmt}
            domain={["dataMin - 20", "dataMax + 20"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
              fontSize: 13,
            }}
            formatter={(value, name) => {
              if (Array.isArray(value)) {
                return [`${fmt(value[0])} – ${fmt(value[1])}`, labels.band];
              }
              return [fmt(Number(value)), String(name)];
            }}
            labelFormatter={(l) => `${labels.period}: ${String(l)}`}
          />

          <Area
            dataKey="band"
            name={labels.band}
            stroke="none"
            fill="var(--muted)"
            fillOpacity={0.18}
            isAnimationActive={false}
          />
          <Line
            dataKey="mean"
            name={labels.mean}
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--accent)" }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
