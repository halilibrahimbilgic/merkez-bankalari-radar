import "server-only";
import { readFile } from "node:fs/promises";

/**
 * Seed/veri dosyasını okur. Üretimde dosya yoksa ya da bozuksa FIRLATIR:
 * ISR yeniden üretimi hata verince Next önceki sayfayı korur; sessizce
 * boş döndürmek "veri henüz yüklenmedi" sayfasını 200 ile bir saat
 * önbelleğe alırdı (yeni bir dosyanın `outputFileTracingIncludes`'a
 * eklenmesi unutulduğunda tam olarak bu oluyordu). Geliştirmede veri
 * dosyası olmayan temiz bir kopya çalışabilsin diye `empty` döner.
 */
export async function readJsonStore<T>(file: string, empty: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (err) {
    if (process.env.NODE_ENV === "production") throw err;
    return empty;
  }
}
