import { test } from "node:test";
import assert from "node:assert/strict";
import { diffText, sentenceTokens, wordDiff, type DiffSegment } from "../src/lib/text-diff";

const render = (segs: DiffSegment[]) =>
  segs.map((s) => (s.op === "same" ? s.text : s.op === "ins" ? `[+${s.text}]` : `[-${s.text}]`)).join(" ");

test("aynı metin: fark yok, paragraflar korunur", () => {
  const text = "Inflation remains elevated. The Committee is attentive.\n\nVoting for the action were all members.";
  const d = diffText(text, text);
  assert.equal(d.added, 0);
  assert.equal(d.removed, 0);
  assert.equal(d.paragraphs.length, 2);
  assert.ok(d.paragraphs.every((p) => p.every((s) => s.op === "same")));
});

test("düzenlenen cümle kelime düzeyinde gösterilir", () => {
  const before =
    "Recent indicators suggest that economic activity has continued to expand at a solid pace. " +
    "The Committee decided to maintain the target range for the federal funds rate at 3-1/2 to 3-3/4 percent.";
  const after =
    "Recent indicators suggest that economic activity has continued to expand at a moderate pace. " +
    "The Committee decided to raise the target range for the federal funds rate to 3-3/4 to 4 percent.";
  const d = diffText(before, after);
  const out = render(d.paragraphs[0]);
  assert.match(out, /\[-solid\] \[\+moderate\]/);
  assert.match(out, /\[-maintain\] \[\+raise\]/);
  // Ortak gövde bozulmadan kalır — cümlenin tamamı silinip eklenmez.
  assert.match(out, /the target range for the federal funds rate/);
  assert.equal(d.added, d.removed);
});

test("ilgisiz cümleler ortak kelimelerle eşlenmez", () => {
  const d = diffText(
    "The labor market has softened.",
    "Uncertainty about the economic outlook has increased.",
  );
  assert.deepEqual(
    d.paragraphs[0].map((s) => s.op),
    ["del", "ins"],
  );
  assert.equal(d.removed, 5);
  assert.equal(d.added, 7);
});

test("eklenen ve silinen paragraflar yerinde görünür", () => {
  const before = "A one.\n\nB two.\n\nC three.";
  const after = "A one.\n\nC three.\n\nD four is new.";
  const d = diffText(before, after);
  const flat = d.paragraphs.map(render);
  assert.deepEqual(flat, ["A one.", "[-B two.]", "C three.", "[+D four is new.]"]);
});

test("Türkçe karar metni: sayılar ve ekler korunur", () => {
  const before =
    "Para Politikası Kurulu, politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 37'de sabit tutulmasına karar vermiştir.";
  const after =
    "Para Politikası Kurulu, politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 37'den yüzde 36'ya indirilmesine karar vermiştir.";
  const out = render(diffText(before, after).paragraphs[0]);
  assert.match(out, /\[-37'de sabit tutulmasına\] \[\+37'den yüzde 36'ya indirilmesine\]/);
});

test("cümle bölme kısaltmalarda büyük harf gelmedikçe bölmez", () => {
  const tokens = sentenceTokens("The U.S. economy grew. Inflation at 2:00 p.m. today was high. Next one.");
  assert.deepEqual(tokens, ["The U.S. economy grew.", "Inflation at 2:00 p.m. today was high.", "Next one."]);
});

test("kelime farkı: silme eklemeden önce gelir", () => {
  assert.deepEqual(wordDiff("rates were held", "rates were raised"), [
    { op: "same", text: "rates were" },
    { op: "del", text: "held" },
    { op: "ins", text: "raised" },
  ]);
});
