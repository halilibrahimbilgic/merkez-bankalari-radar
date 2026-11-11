import { isBankCode } from "./banks";
import type { BankCode } from "./types";

/**
 * Liste sayfalarının filtreleri yoldadır (/takvim/tcmb), sorguda değil.
 * Sorgu (?banka=tcmb) okumak sayfayı her istekte sunucuda çalıştırıyordu:
 * revalidate yok sayılıyor, canlıda "cache-control: private, no-store"
 * dönüyordu. Yol ise derlemede üretilip ISR ile tazelenir; üstelik her
 * banka için ayrı, indekslenebilir bir sayfa doğar.
 *
 * Bu dosya src/proxy.ts'ten ve istemci bileşenlerinden de içe aktarılır —
 * sunucuya özgü bir şey içermemeli.
 */

/** Banka filtresi olan liste sayfaları. */
export const BANK_FILTER_PAGES = ["/takvim", "/kararlar", "/konusmalar"] as const;

/** Haber türü filtresi: yol parçası → tür. */
export const NEWS_KIND_SLUGS = { resmi: "official", basin: "media" } as const;
export type NewsKindSlug = keyof typeof NEWS_KIND_SLUGS;

export function isNewsKindSlug(s: string): s is NewsKindSlug {
  return Object.hasOwn(NEWS_KIND_SLUGS, s);
}

export function bankFilterPath(base: string, code?: BankCode): string {
  return code ? `${base}/${code}` : base;
}

/**
 * Eski sorgulu adres (paylaşılmış bağlantılar, arama dizini) → yeni yol;
 * eşleşmezse null. Hedefte sorgu kalmaz: next.config redirects() gelen
 * sorguyu hedefe her zaman geri ekliyor (/takvim/tcmb?banka=tcmb), bu yüzden
 * yönlendirme src/proxy.ts'te yapılır.
 */
export function legacyFilterPath(pathname: string, query: URLSearchParams): string | null {
  const pre = pathname === "/en" || pathname.startsWith("/en/") ? "/en" : "";
  const page = pathname.slice(pre.length);
  const banka = query.get("banka");
  if ((BANK_FILTER_PAGES as readonly string[]).includes(page) && banka && isBankCode(banka)) {
    return `${pre}${page}/${banka}`;
  }
  const tur = query.get("tur");
  if (page === "/haberler" && tur && isNewsKindSlug(tur)) return `${pre}/haberler/${tur}`;
  const donem = query.get("donem");
  if (page === "/faiz-olasiligi" && donem && /^\d{4}-\d{2}-\d{2}$/.test(donem)) {
    return `${pre}/faiz-olasiligi/${donem}`;
  }
  return null;
}
