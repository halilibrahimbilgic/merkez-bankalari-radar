/**
 * Konuşma tam metnini okunur paragraflara böler.
 *
 * Yalnızca boşluk düzenlenir; kelime eklenmez, çıkarılmaz, sırası değişmez.
 * ECB "metin doğru aktarılmalı" şartı koyuyor; dipnot numaraları ve PDF'in
 * "[ ]" gibi kalıntıları bu yüzden olduğu gibi kalır.
 *
 * İki kaynak biçimi var:
 *  - HTML'den gelen eski metinler: paragraflar boş satırla ayrılmış.
 *  - PDF'ten gelen metinler: her satır kırılmış, paragraf arası boş satır
 *    yok. Paragraf sonu, noktalamayla biten ve satır genişliğinden belirgin
 *    kısa kalan satırdan anlaşılır; noktalamasız kısa satır başlıktır.
 */
export function toParagraphs(raw: string): string[] {
  const text = decodeEntities(raw).replace(/\r\n?/g, "\n").trim();
  const blocks = text.split(/\n\s*\n/);

  // Boş satırla ayrılmış (HTML kaynaklı) metin: blok = paragraf.
  if (blocks.length >= 3) {
    return blocks.map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean);
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const width = percentile(lines.map((l) => l.length), 0.9);
  const paragraphs: string[] = [];
  let current = "";

  lines.forEach((line, i) => {
    current = current ? `${current} ${line}` : line;
    const next = lines[i + 1];
    const short = line.length < width * 0.85;
    const endsSentence = /[.!?:;"”’)\]]$/.test(line);
    const heading =
      line.length < width * 0.6 && !/[,;–-]$/.test(line) && !!next && /^[A-Z0-9"“‘(]/.test(next);
    if (!next || (short && endsSentence) || (heading && current === line)) {
      paragraphs.push(current);
      current = "";
    }
  });

  return paragraphs;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

/** Eski HTML kaynaklı metinlerde kalan varlıklar ("1 &nbsp;Oakland"). */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}
