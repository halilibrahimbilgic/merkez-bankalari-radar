import type { Lang } from "./i18n";

/**
 * Rehber yazıları — faiz kararlarını sade dille anlatan kısa metinler.
 *
 * İçerik kodda, iki dil yan yana durur (ARCHITECTURE.md §4: ayrı sözlükte
 * bir dilin sessizce boş kalması mümkün olmasın). Metin içinde yalnızca iki
 * biçim var: **kalın** ve [bağlantı](/yol). Bağlantı yolları dil öneki
 * olmadan yazılır; görüntüleyici okuyucunun diline çevirir.
 *
 * Bu yazılar yatırım tavsiyesi değildir ve öyle okunmamalıdır: genel
 * mekanizmayı anlatır, "şimdi ne yapmalı" demez.
 */

export interface Pair {
  tr: string;
  en: string;
}

export type GuideBlock =
  | { h: Pair }
  | { p: Pair }
  | { ul: { tr: string[]; en: string[] } }
  | { note: Pair }
  | { terms: { term: Pair; def: Pair }[] };

export interface Guide {
  slug: string;
  title: Pair;
  /** Arama sonucu ve liste açıklaması — ~160 karakter. */
  description: Pair;
  /** Son gözden geçirme, YYYY-MM-DD. */
  updatedOn: string;
  blocks: GuideBlock[];
}

export function pick(pair: Pair, lang: Lang): string {
  return lang === "en" ? pair.en : pair.tr;
}
