import { test } from "node:test";
import assert from "node:assert/strict";
import { bucketTable, cycleTable, pathTable, seriesTable } from "../src/lib/chart-tables";

test("seri tablosu: aynı değerli satırlar atılır, ilk ve son kalır", () => {
  const data = [
    { label: "1 Eki", x: 3.75 },
    { label: "2 Eki", x: 3.75 },
    { label: "3 Eki", x: 3.5 },
    { label: "4 Eki", x: 3.5 },
    { label: "5 Eki", x: 3.5 },
  ];
  const t = seriesTable(data, [{ key: "x", name: "Faiz" }], "rate", "tr", "Tarih");
  assert.deepEqual(t.head, ["Tarih", "Faiz"]);
  assert.deepEqual(t.rows.map((r) => r[0]), ["1 Eki", "3 Eki", "5 Eki"]);
  assert.equal(t.rows[0][1], "%3,75");
});

test("seri tablosu: eksik değer çizgi, olasılık tam sayı, dile göre yüzde", () => {
  const t = seriesTable([{ label: "a", p: null }, { label: "b", p: 62.4 }], [{ key: "p", name: "P" }], "prob", "en", "Date");
  assert.deepEqual(t.rows, [["a", "—"], ["b", "62%"]]);
});

test("döngü tablosu: tarih TRT, bp işaretli, eksik banka çizgi", () => {
  const t = cycleTable(
    [{ t: Date.UTC(2026, 9, 28, 12), fed: -25 }, { t: Date.UTC(2026, 10, 5, 12), fed: -25, boe: 0 }],
    [{ key: "fed", name: "Fed" }, { key: "boe", name: "BoE" }],
    "tr",
    "Tarih",
  );
  assert.deepEqual(t.rows[0], ["28 Eki 2026", "−25 bp", "—"]);
  assert.equal(t.rows[1][2], "0 bp");
});

test("bant ve patika tabloları: yüzde ve aralık biçimi", () => {
  assert.deepEqual(
    bucketTable([{ label: "3,50–3,75", probabilityPct: 62.04 }], { band: "Bant", probability: "Olasılık" }, "tr").rows,
    [["3,50–3,75", "%62,0"]],
  );
  const p = pathTable(
    [{ label: "Oca–Mar", band: [350, 400], mean: 375 }],
    { period: "Dönem", mean: "Ortalama", band: "Aralık" },
    "en",
  );
  assert.deepEqual(p.rows, [["Oca–Mar", "3.75%", "3.50–4.00%"]]);
});
