"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Beklentilerin zaman içindeki seyri — çizgi grafik. Metinler ve tarih
 * etiketleri sunucudan gelir; istemci bileşeni dil seçimini bilmez.
 * Anket noktaları seyrek olduğundan basamaklı çizilir (iki anket arasında
 * beklenti değişmez, son anket geçerlidir).
 */
export interface Series {
  key: string;
  name: string;
  color: string;
}

export function TimeSeriesChart({
  data,
  series,
  unit,
  lang,
  stepped = false,
  refLines = [],
}: {
  /** Her satır: label (x ekseni) + seri anahtarları. */
  data: Record<string, string | number | null>[];
  series: Series[];
  /** rate: faiz düzeyi (%3,75), prob: olasılık (%50). */
  unit: "rate" | "prob";
  lang: "tr" | "en";
  stepped?: boolean;
  refLines?: { y: number; label: string; color: string }[];
}) {
  const fmt = (v: number) => {
    const s = v.toFixed(unit === "rate" ? 2 : 0);
    return lang === "en" ? `${s}%` : `%${s.replace(".", ",")}`;
  };
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            stroke="var(--border)"
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            stroke="var(--border)"
            width={52}
            tickFormatter={fmt}
            domain={unit === "prob" ? [0, 100] : ["dataMin - 0.1", "dataMax + 0.1"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
              fontSize: 13,
            }}
            formatter={(value, name) => [fmt(Number(value)), String(name)]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {refLines.map((r) => (
            <ReferenceLine
              key={r.label}
              y={r.y}
              stroke={r.color}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
              label={{ value: r.label, position: "insideTopLeft", fontSize: 11, fill: r.color }}
            />
          ))}
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              type={stepped ? "stepAfter" : "monotone"}
              dot={stepped ? { r: 3, fill: s.color } : false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
