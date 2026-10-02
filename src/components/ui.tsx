import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Düzen ilkelleri.
 *
 * Bu dosya öncesinde `rounded-lg border border-border bg-surface` dizisi
 * projede 30 ayrı yerde elle yazılıydı; dolgu aynı rol için p-3/p-4/p-5
 * arasında geziniyordu. Tek tanım, yeni sayfaların tutarlı doğmasını
 * sağlıyor — ve bir kez değişiklik yapmak hepsini güncelliyor.
 */

/** Kart dolgusu için üç kademe: sıkı liste, uyarı bloğu, içerik paneli. */
type Pad = "none" | "tight" | "normal";

const PAD: Record<Pad, string> = {
  none: "",
  tight: "p-4",
  normal: "p-5",
};

export function Card({
  children,
  pad = "normal",
  className = "",
}: {
  children: ReactNode;
  pad?: Pad;
  className?: string;
}) {
  return <div className={`card ${PAD[pad]} ${className}`}>{children}</div>;
}

/**
 * Bölüm başlığı ve sağdaki "tümünü gör" bağlantısı.
 *
 * Bağlantı en az 36px yüksekliğinde: ok işaretinin kendisi küçük bir
 * dokunma hedefi olurdu (WCAG 2.5.8).
 */
export function SectionHeader({
  title,
  id,
  action,
  description,
}: {
  title: string;
  id?: string;
  action?: { href: string; label: string };
  description?: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        {action && (
          <Link
            href={action.href}
            className="inline-flex min-h-9 items-center text-sm text-accent hover:underline"
          >
            {action.label} →
          </Link>
        )}
      </div>
      {description && (
        <p className="prose-width mt-1 text-sm text-muted">{description}</p>
      )}
    </div>
  );
}

/**
 * Kart çerçevesi içinde yatay kayan tablo.
 *
 * Tablolar mobilde daralmaz, kendi kabında kayar — gövde asla yatay
 * kaymaz. `minWidth` sütunların okunabilir kaldığı en küçük genişliktir.
 */
export function TableFrame({
  children,
  minWidth = "32rem",
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

/** Tablo başlık hücresi — hizalama ve ton tek yerde. */
export function Th({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

/** Kartlar içindeki liste — satırlar arası ayırıcı ve son satır istisnası. */
export function Rows({ children }: { children: ReactNode }) {
  return <ul className="card overflow-hidden">{children}</ul>;
}

export function Row({
  children,
  className = "",
  accentColor,
}: {
  children: ReactNode;
  className?: string;
  /** Sol kenarda banka kimlik rengi şeridi (ikincil ipucu). */
  accentColor?: string;
}) {
  return (
    <li
      className={
        "flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3 last:border-b-0 " +
        (accentColor ? "border-l-3 " : "") +
        className
      }
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      {children}
    </li>
  );
}

/**
 * Tek sayılık gösterge. Kartın içinde "gömülü" yüzey kullanır: aynı
 * beyaz üstünde 1px kenarlıkla duran kutular hiyerarşi vermiyordu.
 */
export function Stat({
  label,
  value,
  tone = "text-foreground",
  note,
}: {
  label: string;
  value: string;
  tone?: string;
  note?: string;
}) {
  return (
    <div className="rounded-lg bg-surface-sunken p-3">
      <div className="text-sm text-muted">{label}</div>
      <div className={`tabular mt-1 text-xl font-semibold ${tone}`}>{value}</div>
      {note && <div className="mt-0.5 text-xs text-muted">{note}</div>}
    </div>
  );
}

/** Bilgi/uyarı bloğu — vurgu renginde, gövde metninden ayrık. */
export function Callout({
  title,
  children,
  tone = "accent",
}: {
  title?: string;
  children: ReactNode;
  tone?: "accent" | "warn";
}) {
  const toneClass =
    tone === "warn"
      ? "border-hawk/40 bg-hawk/5"
      : "border-border bg-accent-soft";
  return (
    <div className={`rounded-lg border p-4 text-sm ${toneClass}`}>
      {title && (
        <p className={`font-medium ${tone === "warn" ? "text-hawk" : "text-accent"}`}>
          {title}
        </p>
      )}
      <div className={`prose-width text-muted ${title ? "mt-1" : ""}`}>{children}</div>
    </div>
  );
}

/**
 * Veri yokluğu durumu.
 *
 * Boş bir liste yerine ne eksik olduğunu ve nasıl doldurulacağını söyler;
 * `command` geliştiriciye yöneliktir, ziyaretçiye değil — bu yüzden ayrı
 * ve soluk gösterilir.
 */
export function EmptyState({
  children,
  command,
}: {
  children: ReactNode;
  command?: string;
}) {
  return (
    <Card>
      <p className="prose-width text-muted">
        {children}
        {command && (
          <>
            {" "}
            <code className="rounded bg-accent-soft px-1 text-accent">{command}</code>{" "}
            komutunu çalıştırın.
          </>
        )}
      </p>
    </Card>
  );
}
