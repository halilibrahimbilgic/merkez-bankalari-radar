/**
 * Konuşmacı adresi addan türer: "Boris Vujčić" → "boris-vujcic". BIS adı
 * kimi zaman noktalı yazıyor ("Christopher J. Waller"); noktalama atıldığı
 * için iki yazım aynı adrese düşer. Ad başka biçimde değişirse (ikinci ad
 * eklenirse) adres de değişir — eski bağlantı 404 verir.
 */
export function speakerSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
