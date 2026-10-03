import { unzipSync } from "fflate";

/**
 * Asgari xlsx okuyucu — Atlanta Fed MPT ve BoE oylama geçmişi için.
 *
 * Tam bir kütüphane yerine fflate + düzenli ifade: iki dosya da düz veri
 * sayfası, biçim/formül değerlendirmesi gerekmiyor ve script'ler bağımlılık
 * yükü taşımıyor. Formüllü hücrelerde önbelleğe alınmış <v> değeri okunur.
 */
export interface Workbook {
  strings: string[];
  /** Sayfa adıyla (ör. "DATA") sayfanın XML'i; yoksa hata. */
  sheet(name: string): string;
}

export function openWorkbook(bytes: Uint8Array): Workbook {
  const files = unzipSync(bytes);
  const dec = new TextDecoder("utf-8");
  const read = (p: string) => {
    const f = files[p];
    if (!f) throw new Error(`xlsx: ${p} yok`);
    return dec.decode(f);
  };

  const strings = files["xl/sharedStrings.xml"]
    ? parseSharedStrings(read("xl/sharedStrings.xml"))
    : [];
  const workbookXml = read("xl/workbook.xml");
  const relsXml = read("xl/_rels/workbook.xml.rels");

  return {
    strings,
    sheet(name) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const sheet = workbookXml.match(new RegExp(`<sheet name="${escaped}"[^>]*r:id="([^"]+)"`));
      if (!sheet) throw new Error(`xlsx: "${name}" sayfası bulunamadı`);
      const target = relsXml.match(new RegExp(`Id="${sheet[1]}"[^>]*Target="([^"]+)"`));
      if (!target) throw new Error(`xlsx: "${name}" sayfasının yolu çözülemedi`);
      return read("xl/" + target[1].replace(/^\/?(xl\/)?/, ""));
    },
  };
}

/** Satır başına { sütun harfi → değer }. Boş hücreler yer almaz. */
export function readCells(sheetXml: string, strings: string[]): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  for (const row of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: Record<string, string> = {};
    for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = c[1].match(/\br="([A-Z]+)\d+"/)?.[1];
      const v = c[2]?.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (!col || v === undefined) continue;
      cells[col] = /\bt="s"/.test(c[1]) ? (strings[Number(v)] ?? "") : decodeXml(v);
    }
    rows.push(cells);
  }
  return rows;
}

export function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    // Bir <si> birden çok <t> parçasına bölünmüş olabilir.
    let text = "";
    for (const t of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += t[1];
    out.push(decodeXml(text));
  }
  return out;
}

/** Excel seri numarası → ISO tarih. Excel'in 1900 artık yıl hatası nedeniyle taban 1899-12-30. */
export function excelSerialToDate(serial: string): string {
  const days = Math.round(Number(serial));
  if (!Number.isFinite(days)) return serial;
  return new Date(Date.UTC(1899, 11, 30) + days * 86_400_000).toISOString().slice(0, 10);
}

export function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}
