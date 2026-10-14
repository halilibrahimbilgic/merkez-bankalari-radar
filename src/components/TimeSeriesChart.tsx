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
  /** Kesik çizgi: dayanak/sınır serileri (ör. faiz koridorunun bantları). */
  dashed?: boolean;
}

export function TimeSeriesChart({
  data,
  series,
  unit,
  lang,
  stepped = false,
  dots = stepped,
  refLines = [],
}: {
  /** Her satır: label (x ekseni) + seri anahtarları. */
  data: Record<string, string | number | null>[];
  series: Series[];
  /** rate: faiz düzeyi (%3,75), prob: olasılık (%50). */
  unit: "rate" | "prob";
  lang: "tr" | "en";
  stepped?: boolean;
  /** Noktalar gözlemi gösterir; günlük doldurulmuş seride her gün nokta olurdu. */
  dots?: boolean;
  refLines?: { y: number; label: string; color: string }[];
}) {
  const fmt = (v: number) => {
    const s = v.toFixed(unit === "rate" ? 2 : 0);
    return lang === "en" ? `${s}%` : `%${s.replace(".", ",")}`;
  };

  // Faiz ekseni yuvarlak değerlerde: "dataMin - 0.1" sınırı %43,60 / %38,40
  // gibi okunması zor etiketler üretiyordu (15 Ekim 2026; bkz. ExpectedPathChart).
  let rateAxis: { domain: [number, number]; ticks: number[] } | undefined;
  if (unit === "rate") {
    const values = data
      .flatMap((d) => series.map((s) => d[s.key]))
      .filter((v): v is number => typeof v === "number")
      .concat(refLines.map((r) => r.y));
    if (values.length > 0) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const step = [0.25, 0.5, 1, 2, 5, 10].find((st) => Math.max(max - min, 0.25) / st <= 5) ?? 10;
      const lo = Math.floor((min - step / 4) / step) * step;
      const hi = Math.ceil((max + step / 4) / step) * step;
      const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => Math.round((lo + i * step) * 100) / 100);
      rateAxis = { domain: [lo, hi], ticks };
    }
  }
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
            domain={unit === "prob" ? [0, 100] : (rateAxis?.domain ?? ["dataMin - 0.1", "dataMax + 0.1"])}
            ticks={rateAxis?.ticks}
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
              strokeDasharray={s.dashed ? "5 4" : undefined}
              type={stepped ? "stepAfter" : "monotone"}
              dot={dots ? { r: 3, fill: s.color } : false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
