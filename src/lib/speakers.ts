import { slugify } from "./slug";

/**
 * Konuşmacı adresi addan türer: "Boris Vujčić" → "boris-vujcic". BIS adı
 * kimi zaman noktalı yazıyor ("Christopher J. Waller"); noktalama atıldığı
 * için iki yazım aynı adrese düşer. Ad başka biçimde değişirse (ikinci ad
 * eklenirse) adres de değişir — eski bağlantı 404 verir.
 */
export function speakerSlug(name: string): string {
  return slugify(name);
}

/**
 * Konuşmacının unvanı, BIS tanıtım cümlesinden (`contextEn`):
 * "Speech by Mr Christopher J Waller, Member of the Board of Governors of
 * the Federal Reserve System, at the …" → addan sonra, ", at/to …"dan önce.
 */
export function roleFromContext(contextEn: string | undefined, name: string): string | undefined {
  const at = contextEn?.indexOf(`${name}, `) ?? -1;
  if (!contextEn || at === -1) return undefined;
  return contextEn.slice(at + name.length + 2).match(/^(.+?),\s+(?:at|to|before|during|in|on|for|via)\s/)?.[1];
}

/**
 * Unvanın Türkçesi: modelin çevirdiği tanıtım cümlesinde (`contextTr`) addan
 * önceki kısım — "Federal Rezerv Guvernörler Kurulu üyesi Christopher J
 * Waller'ın …". Model adı kimi zaman noktalı yazdığı için ilk ada bakılır;
 * hitap (Prof., Sir) atılır.
 */
export function roleFromContextTr(contextTr: string | undefined, name: string): string | undefined {
  const at = contextTr?.indexOf(name.split(" ")[0]) ?? -1;
  if (!contextTr || at <= 0) return undefined;
  return contextTr.slice(0, at).trim().replace(/\s+(?:Prof\.?|Sir|Dr\.?)$/u, "").trim() || undefined;
}
