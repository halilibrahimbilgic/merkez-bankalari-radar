"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme";

type Theme = "system" | "light" | "dark";

const ORDER: Theme[] = ["system", "light", "dark"];

const LABEL: Record<Theme, string> = {
  system: "Sistem teması",
  light: "Açık tema",
  dark: "Koyu tema",
};

/**
 * Tema seçici — sistem / açık / koyu arasında döner.
 *
 * Üç durumlu olması kasıtlı: iki durumlu bir anahtar, kullanıcıyı sistem
 * ayarını takip etmekten kalıcı olarak koparır. "Sistem" varsayılan kalır.
 *
 * İlk boyamada `null` render ediyoruz: sunucu kullanıcının localStorage'ını
 * bilemez, bir varsayılan render etmek hidrasyon uyuşmazlığı üretirdi.
 * Yerin korunması için düğme boyutunda boş bir kutu bırakılır, yoksa
 * gezinme çubuğu hidrasyonda zıplar.
 */
export function ThemeToggle() {
  /*
   * Seçili tema localStorage'da durur — React state'inde değil. Bu yüzden
   * useSyncExternalStore: tarayıcı dışı bir kaynağı okumanın hidrasyona
   * uygun yolu. Sunucu anlık görüntüsü `null`, çünkü sunucu kullanıcının
   * depolamasını bilemez; hidrasyondan sonra gerçek değere geçilir.
   */
  const theme = useSyncExternalStore(subscribe, readStored, () => null);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme ?? "system") + 1) % ORDER.length];
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // Gizli pencerede depolama yazılamaz; seçim yalnızca bu sayfa için geçerli.
    }
    // Aynı sekmede `storage` olayı tetiklenmez; değişikliği kendimiz duyururuz.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  if (theme === null) {
    return <div className="h-9 w-9 shrink-0" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={cycle}
      // Durum ikonla değil, erişilebilir adla taşınıyor: ikon tek başına
      // "şu an hangi tema" sorusunu ekran okuyucuya anlatmaz.
      aria-label={`${LABEL[theme]} — değiştirmek için tıklayın`}
      title={LABEL[theme]}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-sunken hover:text-accent"
    >
      <Icon theme={theme} />
    </button>
  );
}

function Icon({ theme }: { theme: Theme }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (theme === "dark") {
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    );
  }
  if (theme === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
    );
  }
  // Sistem: ekran simgesi — "cihazın ne diyorsa".
  return (
    <svg {...common}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

const CHANGE_EVENT = "mbr-theme-change";

/**
 * Hem kendi değişikliğimizi hem başka sekmedeki değişikliği dinler:
 * iki sekme açıkken birinde koyuya geçmek diğerini de günceller.
 */
function subscribe(onChange: () => void): () => void {
  // Başka sekmeden gelen değişiklikte <html data-theme> de güncellenmeli;
  // yoksa yalnızca ikon değişir, sayfanın rengi eski kalır.
  const handler = () => {
    apply(readStored());
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function readStored(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}
