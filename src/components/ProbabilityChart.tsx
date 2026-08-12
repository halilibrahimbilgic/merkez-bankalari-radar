"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ChartBucket {
  label: string;
  probabilityPct: number;
  /** Bugünkü hedef aralığa göre konum — renklendirme için. */
  position: "below" | "inside" | "above";
}

const COLORS: Record<ChartBucket["position"], string> = {
  below: "var(--dove)",
  inside: "var(--muted)",
  above: "var(--hawk)",
};

export function ProbabilityChart({ data }: { data: ChartBucket[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={56}
            stroke="var(--border)"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            stroke="var(--border)"
            width={44}
            tickFormatter={(v: number) => `%${v}`}
          />
          <Tooltip
            cursor={{ fill: "var(--accent-soft)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
              fontSize: 13,
            }}
            formatter={(value) => [
              `%${Number(value).toFixed(1).replace(".", ",")}`,
              "Olasılık",
            ]}
            labelFormatter={(label) => `Bant: ${String(label)}`}
          />
          <Bar dataKey="probabilityPct" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={COLORS[d.position]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
