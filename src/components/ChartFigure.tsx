import type { ReactNode } from "react";
import { TableFrame, Th } from "@/components/ui";
import type { ChartTable } from "@/lib/chart-tables";
import { L, type Lang } from "@/lib/i18n";

/**
 * Grafik + metin karşılığı. Grafik `role="img"` ile tek bir görsel olarak
 * adlandırılır (içindeki SVG ekran okuyucuya sessiz kalır); aynı veri,
 * grafiğin dışında, açılır bir tabloda durur. Kullanım yerleri
 * src/components/ChartFigures.tsx'tedir.
 */
export function ChartFigure({
  label,
  table,
  lang,
  children,
}: {
  label: string;
  table: ChartTable;
  lang: Lang;
  children: ReactNode;
}) {
  const t = L(lang);
  return (
    <figure>
      <div role="img" aria-label={label}>
        {children}
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-accent hover:underline">
          {t("Veriyi tablo olarak göster", "Show the data as a table")}
        </summary>
        <div className="mt-2">
          <TableFrame minWidth="18rem">
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr className="border-b border-border-strong text-left text-muted">
                {table.head.map((h, i) => (
                  <Th key={i} align={i === 0 ? "left" : "right"}>
                    {h}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {r.map((c, j) => (
                    <td key={j} className={`px-4 py-2 ${j === 0 ? "" : "tabular text-right"}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </TableFrame>
        </div>
      </details>
    </figure>
  );
}
