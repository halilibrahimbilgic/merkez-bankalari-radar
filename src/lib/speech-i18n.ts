import type { Lang } from "./i18n";
import type { Speech } from "./types";

/**
 * Konuşma metinlerinin arayüz diline göre seçimi.
 *
 * Kaynak başlık ve tanıtım İngilizcedir; özet ve gerekçe skorlamada Türkçe
 * üretilir. Karşılıklar skorlamayla birlikte (PROMPT_VERSION 3) ya da toplu
 * çeviriyle dolar. Karşılık yoksa diğer dile düşülür ve dönen `lang` bunu
 * söyler: sayfa o metni doğru lang özniteliğiyle ve "(Türkçe)" gibi bir
 * notla gösterebilir — sessizce yanlış dilde metin basılmaz.
 */
export interface LocalizedText {
  text: string;
  lang: Lang;
}

function pick(lang: Lang, tr?: string, en?: string): LocalizedText | undefined {
  const own = lang === "en" ? en : tr;
  if (own) return { text: own, lang };
  const other = lang === "en" ? tr : en;
  return other ? { text: other, lang: lang === "en" ? "tr" : "en" } : undefined;
}

export function speechTitle(s: Speech, lang: Lang): string {
  return lang === "tr" ? (s.titleTr ?? s.title) : s.title;
}

export function speechContext(s: Speech, lang: Lang): LocalizedText | undefined {
  return pick(lang, s.contextTr, s.contextEn);
}

export function speechSummary(s: Speech, lang: Lang): LocalizedText | undefined {
  return pick(lang, s.summaryTr, s.summaryEn);
}

export function speechRationale(s: Speech, lang: Lang): LocalizedText | undefined {
  return pick(lang, s.scoreRationaleTr, s.scoreRationaleEn);
}
