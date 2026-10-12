"use client";

import { usePathname } from "next/navigation";
import { localePath, splitLangPath, type Lang } from "@/lib/i18n";

/**
 * TR | EN dil değiştirici.
 *
 * Aynı sayfanın diğer dildeki karşılığına gider: yol adları iki dilde aynı
 * olduğu için yalnızca /en öneki eklenir ya da kaldırılır, sorgu (ör.
 * ?banka=fed) korunur. Seçim bir yerde saklanmaz ve kimse dil tahminiyle
 * yönlendirilmez — adres hangi dildeyse sayfa o dildedir; paylaşılan
 * bağlantı herkeste aynı görünür.
 *
 * Bağlantılar düz <a>: iki dil ayrı kök düzenlerdir (<html lang> farklı),
 * aralarında istemci tarafı geçiş zaten tam sayfa yüklemesi olur.
 */
export function LangSwitch({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? "/";
  const { path } = splitLangPath(pathname);

  return (
    <nav aria-label={lang === "en" ? "Language" : "Dil"} className="flex items-center text-sm">
      <Option target="tr" current={lang} path={path} label="TR" name="Türkçe" />
      <span aria-hidden className="px-1 text-border-strong">
        |
      </span>
      <Option target="en" current={lang} path={path} label="EN" name="English" />
    </nav>
  );
}

function Option({
  target,
  current,
  path,
  label,
  name,
}: {
  target: Lang;
  current: Lang;
  path: string;
  label: string;
  name: string;
}) {
  const active = target === current;
  return (
    <a
      href={localePath(target, path)}
      hrefLang={target}
      lang={target}
      aria-label={name}
      aria-current={active ? "true" : undefined}
      onClick={(e) => {
        // Sorgu dizesi sunucuda bilinmediği için tıklama anında eklenir;
        // statik sayfayı useSearchParams ile istemci render'ına düşürmeyiz.
        if (active || !window.location.search) return;
        e.preventDefault();
        window.location.href = localePath(target, path) + window.location.search;
      }}
      className={
        "inline-flex min-h-9 min-w-9 items-center justify-center rounded-md px-1.5 font-medium " +
        (active ? "text-foreground" : "text-muted hover:text-accent")
      }
    >
      {label}
    </a>
  );
}
