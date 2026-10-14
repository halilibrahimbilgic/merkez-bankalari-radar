"use client";

import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Yıl başından bu yana faiz değişimi (bp), bankalar basamaklı çizgi. Zaman
 * ekseni gerçek tarih ölçeğinde: kararlar arası boşluklar orantılı görünsün.
 * Metinler ve banka adları sunucudan gelir.
 */
export function CycleChart({
  data,
  banks,
  lang,
}: {
  data: Record<string, number>[];
  banks: { key: string; name: string; color: string }[];
  lang: "tr" | "en";
}) {
  const locale = lang === "en" ? "en-GB" : "tr-TR";
  const day = (t: number, year?: boolean) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: year ? "numeric" : undefined,
      timeZone: "Europe/Istanbul",
    }).format(new Date(t));
  const bp = (v: number) => (v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v)}`);
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => day(t)}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            stroke="var(--border)"
            minTickGap={28}
          />
          <YAxis
            tickFormatter={bp}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            stroke="var(--border)"
            width={44}
            allowDecimals={false}
          />
          <ReferenceLine y={0} stroke="var(--border-strong, var(--border))" />
          <Tooltip
            labelFormatter={(t) => day(Number(t), true)}
            formatter={(value, name) => [`${bp(Number(value))} bp`, String(name)]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
              fontSize: 13,
            }}
          />
          {/* Recharts açıklamayı varsayılan olarak ada göre sıralar; tablodaki banka sırası kalsın. */}
          <Legend wrapperStyle={{ fontSize: 12 }} itemSorter={null} />
          {banks.map((b) => (
            <Line
              key={b.key}
              dataKey={b.key}
              name={b.name}
              stroke={b.color}
              strokeWidth={2}
              type="stepAfter"
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
