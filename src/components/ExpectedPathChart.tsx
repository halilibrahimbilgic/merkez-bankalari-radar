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

export function ExpectedPathChart({
  data,
  targetRange,
}: {
  data: PathPoint[];
  targetRange?: { lowerBps: number; upperBps: number };
}) {
  const fmt = (bps: number) => `%${(bps / 100).toFixed(2).replace(".", ",")}`;

  return (
    <div>
      {/* Grafikte üç ayrı görsel eleman var; hangisinin ne olduğunu yazıyoruz. */}
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0.5 w-5 rounded-full bg-accent"
          />
          Ortalama beklenti
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-5 rounded-sm bg-muted opacity-25"
          />
          Olası aralık (25.–75. yüzdelik)
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-5 rounded-sm bg-accent opacity-25"
          />
          Bugünkü hedef aralık
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
                return [`${fmt(value[0])} – ${fmt(value[1])}`, "Olası aralık"];
              }
              return [fmt(Number(value)), String(name)];
            }}
            labelFormatter={(l) => `Dönem: ${String(l)}`}
          />

          <Area
            dataKey="band"
            name="Olası aralık"
            stroke="none"
            fill="var(--muted)"
            fillOpacity={0.18}
            isAnimationActive={false}
          />
          <Line
            dataKey="mean"
            name="Ortalama beklenti"
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
