"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Telefonda üst menü: "Menü" düğmesi, açılınca sekiz bağlantı iki sütunda.
 * <details> JS'siz de açılıp kapanır; JS yalnızca kapatmak için: kök düzen
 * gezinmede yeniden kurulmadığından menü yeni sayfada açık kalıyordu.
 * Metinler sunucudan gelir.
 */
export function MobileMenu({
  items,
  label,
  navLabel,
}: {
  items: { href: string; label: string }[];
  label: string;
  navLabel: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  // Geri/ileri ile sayfa değişirse de kapansın.
  useEffect(close, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !ref.current?.open) return;
      ref.current.open = false;
      ref.current.querySelector("summary")?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <details ref={ref} className="group sm:hidden">
      <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 text-sm text-muted hover:bg-surface-sunken hover:text-accent [&::-webkit-details-marker]:hidden">
        <svg aria-hidden width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <path className="group-open:hidden" d="M4 7h16M4 12h16M4 17h16" />
          <path className="hidden group-open:inline" d="M6 6l12 12M18 6L6 18" />
        </svg>
        {label}
      </summary>
      <nav
        aria-label={navLabel}
        className="absolute inset-x-0 top-full z-30 grid grid-cols-2 gap-x-4 border-b border-border bg-surface px-4 py-2 shadow-sm"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            aria-current={item.href === pathname ? "page" : undefined}
            className="inline-flex min-h-11 items-center text-sm text-muted hover:text-accent aria-[current=page]:font-medium aria-[current=page]:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
