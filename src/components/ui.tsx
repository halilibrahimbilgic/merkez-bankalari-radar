import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

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
  description?: ReactNode;
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
 * Kart çerçevesi içindeki tablo.
 *
 * `minWidth` yalnızca sm ve üstünde uygulanır; telefonda tablo kabın
 * genişliğine sığar, hücre boşlukları daralır ve metin satır kırar. Önceden
 * telefonda da sabit genişlikle kayıyordu ve sağdaki sütunlar — reel faiz
 * tablosunda sayfanın asıl rakamı — kaydırma ipucu olmadan görünmüyordu
 * (14 Ekim 2026, 390 px ekran görüntüsünde fark edildi). Kap yine yatay
 * kayabilir; gövde asla kaymaz.
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
      <table
        className="w-full text-sm max-sm:[&_td]:px-2.5 max-sm:[&_th]:px-2.5 sm:[min-width:var(--table-min)]"
        style={{ "--table-min": minWidth } as CSSProperties}
      >
        {children}
      </table>
    </div>
  );
}

/** Tablo başlık hücresi — hizalama ve ton tek yerde. */
export function Th({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: "left" | "right";
  /** Ör. telefonda gizlenen sütun için "max-sm:hidden". */
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"} ${className}`}
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
  compact = false,
}: {
  label: string;
  value: string;
  tone?: string;
  note?: string;
  /** Telefonda üç gösterge yan yana sığsın: küçük yazı ve dolgu (sm'den sonra normal). */
  compact?: boolean;
}) {
  return (
    <div className={`rounded-lg bg-surface-sunken ${compact ? "p-2.5 sm:p-3" : "p-3"}`}>
      <div className={`text-muted ${compact ? "text-xs sm:text-sm" : "text-sm"}`}>{label}</div>
      <div className={`tabular mt-1 font-semibold ${compact ? "whitespace-nowrap text-sm sm:text-xl" : "text-xl"} ${tone}`}>
        {value}
      </div>
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
 * Veri yokluğu durumu: boş bir liste yerine ne eksik olduğunu söyler.
 * (Önceden geliştiriciye yönelik "şu komutu çalıştırın" notu da taşıyordu;
 * ziyaretçiye anlamsız olduğu ve iki dilde ayrı ayrı yazılması gerektiği
 * için kaldırıldı — komutlar README'de.)
 */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Card>
      <p className="prose-width text-muted">{children}</p>
    </Card>
  );
}
