import { formatPct } from "@/lib/data/probabilities";

/**
 * Yön oklu olasılık satırları — bu kategoride yerleşik gösterim
 * (artırım / değişiklik yok / indirim, ok + yüzde).
 *
 * Bizim veri kaynağımız toplantı bazlı değil üç aylık ortalama faiz
 * üzerinedir; bu yüzden etiketler "artırım" yerine "aralığın üzerinde"
 * gibi okunur ve altta bu ayrım hatırlatılır.
 */
export interface OddsRow {
  direction: "up" | "flat" | "down";
  label: string;
  pct: number;
}

const ARROW: Record<OddsRow["direction"], string> = {
  up: "↗",
  flat: "→",
  down: "↘",
};

const TONE: Record<OddsRow["direction"], string> = {
  up: "text-hawk",
  flat: "text-muted",
  down: "text-dove",
};

export function RateOdds({ rows }: { rows: OddsRow[] }) {
  const max = Math.max(...rows.map((r) => r.pct), 1);

  return (
    <dl className="space-y-1.5">
      {rows.map((row) => (
        <div key={row.direction} className="flex items-center gap-2 text-sm">
          <dt className="flex min-w-32 items-center gap-1.5">
            <span aria-hidden className={`${TONE[row.direction]} text-base leading-none`}>
              {ARROW[row.direction]}
            </span>
            <span className="text-muted">{row.label}</span>
          </dt>
          {/* Çubuk yalnızca görsel destek; değeri dd taşıyor. */}
          <div aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className={
                row.direction === "up"
                  ? "h-full rounded-full bg-hawk"
                  : row.direction === "down"
                    ? "h-full rounded-full bg-dove"
                    : "h-full rounded-full bg-muted"
              }
              style={{ width: `${(row.pct / max) * 100}%` }}
            />
          </div>
          <dd className={`tabular min-w-14 text-right font-semibold ${TONE[row.direction]}`}>
            {formatPct(row.pct)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
