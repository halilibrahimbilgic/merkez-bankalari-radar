/**
 * İki karar metni arasındaki fark — "metinde ne değişti?" görünümü.
 *
 * Önce cümleler hizalanır, yalnızca değişen cümlelerin içinde kelime farkına
 * inilir. Doğrudan bütün metinde kelime farkı almak, birbiriyle ilgisiz iki
 * cümle arasında "the", "of", "ve" gibi ortak kelimeleri eşleştirip metni
 * okunmaz kırıntılara bölüyordu. Karar metinleri çoğunlukla aynı iskeleti
 * korur ve birkaç cümle değişir; cümle hizalaması bu yapıyı izler.
 *
 * Saf modül: sunucu bileşenlerinde ve testlerde aynı hesap.
 */

export type DiffOp = "same" | "ins" | "del";

export interface DiffSegment {
  op: DiffOp;
  text: string;
}

export interface TextDiff {
  /** Yeni metnin paragraf düzeninde; silinen cümleler bulundukları yerde durur. */
  paragraphs: DiffSegment[][];
  /** Eklenen ve silinen kelime sayısı. */
  added: number;
  removed: number;
}

/** Değişen bir cümle, eskisiyle en az bu kadar ortak kelimeye sahipse "düzenlenmiş" sayılır. */
const PAIR_SIMILARITY = 0.35;

/** Kelime farkı LCS tablosunun üst sınırı (hücre); aşılırsa cümle bütün olarak değişmiş gösterilir. */
const MAX_CELLS = 250_000;

const PARA = "¶";

export function diffText(before: string, after: string): TextDiff {
  const a = sentenceTokens(before);
  const b = sentenceTokens(after);
  const ops = lcsOps(a, b, (x, y) => normalize(x) === normalize(y));

  const paragraphs: DiffSegment[][] = [];
  let current: DiffSegment[] = [];
  let added = 0;
  let removed = 0;

  const breakParagraph = () => {
    if (current.length > 0) paragraphs.push(current);
    current = [];
  };
  const push = (op: DiffOp, text: string) => {
    if (!text) return;
    const words = countWords(text);
    if (op === "ins") added += words;
    if (op === "del") removed += words;
    const last = current.at(-1);
    if (last && last.op === op) last.text += ` ${text}`;
    else current.push({ op, text });
  };

  // Eşleşmeyen silme/ekleme koşuları birlikte ele alınır: aynı yerde silinip
  // eklenen benzer cümleler, kelime düzeyinde gösterilir.
  let dels: string[] = [];
  let inss: string[] = [];
  const flush = () => {
    const used = new Set<number>();
    const pairs = new Map<number, number>();
    inss.forEach((ins, i) => {
      if (ins === PARA) return;
      let best = -1;
      let bestScore = PAIR_SIMILARITY;
      dels.forEach((del, j) => {
        if (del === PARA || used.has(j)) return;
        const score = similarity(del, ins);
        if (score >= bestScore) {
          best = j;
          bestScore = score;
        }
      });
      if (best !== -1) {
        used.add(best);
        pairs.set(i, best);
      }
    });

    // Eşi olmayan silinmiş cümleler, koşunun başında, eski sıralarıyla.
    dels.forEach((del, j) => {
      if (used.has(j)) return;
      if (del === PARA) breakParagraph();
      else push("del", del);
    });
    inss.forEach((ins, i) => {
      if (ins === PARA) return breakParagraph();
      const j = pairs.get(i);
      if (j === undefined) return push("ins", ins);
      for (const seg of wordDiff(dels[j], ins)) push(seg.op, seg.text);
    });
    dels = [];
    inss = [];
  };

  for (const op of ops) {
    if (op.op === "same") {
      flush();
      if (a[op.i] === PARA) breakParagraph();
      else push("same", b[op.j]);
    } else if (op.op === "del") {
      dels.push(a[op.i]);
    } else {
      inss.push(b[op.j]);
    }
  }
  flush();
  breakParagraph();

  return { paragraphs, added, removed };
}

/**
 * Farkın düz metin hâli — model için: [-silinen-] {+eklenen+}. Değişmeyen
 * paragraflar atlanır; yalnızca değişiklik içerenler gider.
 */
export function diffToPlain(diff: TextDiff): string {
  return diff.paragraphs
    .filter((p) => p.some((s) => s.op !== "same"))
    .map((p) =>
      p.map((s) => (s.op === "same" ? s.text : s.op === "ins" ? `{+${s.text}+}` : `[-${s.text}-]`)).join(" "),
    )
    .join("\n\n");
}

/** Metni cümlelere böler; paragraf sınırları ayrı bir belirteç olarak kalır. */
export function sentenceTokens(text: string): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n\s*\n/)) {
    const clean = para.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    if (out.length > 0) out.push(PARA);
    out.push(...splitSentences(clean));
  }
  return out;
}

/**
 * Cümle sınırı: nokta/ünlem/soru işareti, ardından boşluk ve büyük harf ya da
 * açılış tırnağı/parantezi. Kısaltmalar ("U.S. economy", "p.m. EDT") büyük
 * harfle devam etmediği sürece cümleyi bölmez; bölse de yalnızca hizalama
 * biraz kabalaşır, içerik kaybolmaz.
 */
function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?…])\s+(?=["“'(\[]?[A-ZÇĞİÖŞÜ0-9])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function words(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

function countWords(s: string): number {
  return words(s).length;
}

/** Kelime kümelerinin Jaccard benzerliği (büyük/küçük harf ve noktalama dışarıda). */
function similarity(x: string, y: string): number {
  const key = (w: string) => w.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}%]/gu, "");
  const a = new Set(words(x).map(key).filter(Boolean));
  const b = new Set(words(y).map(key).filter(Boolean));
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  for (const w of a) if (b.has(w)) common++;
  return common / (a.size + b.size - common);
}

/** Aynı cümlenin iki sürümü arasında kelime farkı. */
export function wordDiff(before: string, after: string): DiffSegment[] {
  const a = words(before);
  const b = words(after);
  if (a.length * b.length > MAX_CELLS) {
    return [
      { op: "del", text: a.join(" ") },
      { op: "ins", text: b.join(" ") },
    ];
  }
  const segments: DiffSegment[] = [];
  for (const op of lcsOps(a, b, (x, y) => x === y)) {
    const text = op.op === "ins" ? b[op.j] : a[op.i];
    const last = segments.at(-1);
    if (last && last.op === op.op) last.text += ` ${text}`;
    else segments.push({ op: op.op, text });
  }
  return segments;
}

type Op = { op: "same"; i: number; j: number } | { op: "del"; i: number } | { op: "ins"; j: number };

/**
 * En uzun ortak alt dizi üzerinden düzenleme adımları. Silmeler aynı konumdaki
 * eklemelerden önce gelir — okurken önce eski, sonra yeni ifade görünür.
 */
function lcsOps<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): Op[] {
  const n = a.length;
  const m = b.length;
  // len[i][j] = a[i..] ve b[j..] için LCS uzunluğu; tek boyutlu dizide saklanır.
  const len = new Uint32Array((n + 1) * (m + 1));
  const at = (i: number, j: number) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      len[at(i, j)] = eq(a[i], b[j])
        ? len[at(i + 1, j + 1)] + 1
        : Math.max(len[at(i + 1, j)], len[at(i, j + 1)]);
    }
  }

  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j]) && len[at(i, j)] === len[at(i + 1, j + 1)] + 1) {
      ops.push({ op: "same", i, j });
      i++;
      j++;
    } else if (len[at(i + 1, j)] >= len[at(i, j + 1)]) {
      ops.push({ op: "del", i });
      i++;
    } else {
      ops.push({ op: "ins", j });
      j++;
    }
  }
  while (i < n) ops.push({ op: "del", i: i++ });
  while (j < m) ops.push({ op: "ins", j: j++ });
  return ops;
}
