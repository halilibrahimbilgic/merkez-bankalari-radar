/**
 * İki dil: Türkçe kökte (mevcut adresler değişmesin — arama motorundaki ve
 * paylaşılmış bağlantılar kırılmasın), İngilizce /en altında. Yol adları iki
 * dilde aynıdır (/en/takvim); böylece dil değiştirici yalnızca önek ekleyip
 * kaldırır ve hiçbir sayfa karşılıksız kalmaz.
 *
 * Bu dosya istemci bileşenlerinden de içe aktarılır — sunucuya özgü bir şey
 * içermemeli.
 */
export type Lang = "tr" | "en";

export const LANGS: Lang[] = ["tr", "en"];

/** "/takvim" → tr: "/takvim", en: "/en/takvim". Kök: "/" ↔ "/en". */
export function localePath(lang: Lang, path: string): string {
  if (lang === "tr") return path;
  return path === "/" ? "/en" : `/en${path}`;
}

/** Tarayıcıdaki yoldan dili ve dilden bağımsız yolu çıkarır. */
export function splitLangPath(pathname: string): { lang: Lang; path: string } {
  if (pathname === "/en") return { lang: "en", path: "/" };
  if (pathname.startsWith("/en/")) return { lang: "en", path: pathname.slice(3) };
  return { lang: "tr", path: pathname };
}

/**
 * Sayfa meta verisindeki kanonik adres ve hreflang karşılıkları. Arama
 * motoru iki sürümü kopya içerik saymaz, kullanıcıya dilindekini gösterir.
 */
export function languageAlternates(lang: Lang, path: string) {
  return {
    canonical: localePath(lang, path),
    languages: {
      tr: path,
      en: localePath("en", path),
      "x-default": path,
    },
  };
}

/** Intl biçimlendiricileri için yerel ayar. */
export const INTL_LOCALE: Record<Lang, string> = { tr: "tr-TR", en: "en-GB" };

/**
 * Metin çifti seçici: `const t = L(lang); t("Takvim", "Calendar")`.
 * İki dil metni kullanıldığı yerde yan yana durur — ayrı bir sözlükte
 * anahtar unutulup bir dilin sessizce boş kalması mümkün olmaz.
 */
export function L(lang: Lang) {
  return (tr: string, en: string): string => (lang === "en" ? en : tr);
}

/** Ondalık ayırıcı dile göre: tr "37,00", en "37.00". */
export function fmtNum(n: number, lang: Lang, digits = 2): string {
  const s = n.toFixed(digits);
  return lang === "en" ? s : s.replace(".", ",");
}

/** Yüzde işareti Türkçede başta, İngilizcede sonda: "%37,00" / "37.00%". */
export function fmtPercent(n: number, lang: Lang, digits = 2): string {
  const s = fmtNum(n, lang, digits);
  return lang === "en" ? `${s}%` : `%${s}`;
}

/** Baz puan, işaretli: "+13 bp" / "−8 bp" / "0 bp" (eksi işareti tipografik). İki dilde aynı. */
export function fmtBp(n: number): string {
  if (n === 0) return "0 bp";
  return `${n > 0 ? "+" : "−"}${Math.abs(n)} bp`;
}

/** İşaretli yüzde: "+%7,27" / "−%1,30" — "+7.27%" / "−1.30%" (eksi işareti tipografik). */
export function fmtSignedPercent(n: number, lang: Lang, digits = 2): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${fmtPercent(Math.abs(n), lang, digits)}`;
}

/** Aralık, işaret bir kez: "%3,75–4,00" / "3.75–4.00%". */
export function fmtPercentRange(lower: number, upper: number, lang: Lang, digits = 2): string {
  const a = fmtNum(lower, lang, digits);
  const b = fmtNum(upper, lang, digits);
  return lang === "en" ? `${a}–${b}%` : `%${a}–${b}`;
}
