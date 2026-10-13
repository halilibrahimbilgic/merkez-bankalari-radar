import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSoniaCsv, soniaOn } from "../src/lib/sources/boe-ois";
import { parseHicpCsv, parseOnsSeries, parseRbaG4 } from "../src/lib/sources/inflation";
import { midToUpper, listSmeDataFiles } from "../src/lib/sources/nyfed-sme";
import { parsePkaReleaseDates, parseTcmbSurveyHistory } from "../src/lib/sources/tcmb-survey";

// Örnekler 13 Ekim 2026'da kaynaklardan alınan yanıtların kısaltılmış hâli.

test("SONIA CSV: boş son satır atlanır, tatilde önceki gün kullanılır", () => {
  const sonia = parseSoniaCsv("DATE,IUDSOIA\n16 Sep 2026,3.7303\n17 Sep 2026,3.7304\n12 Oct 2026,\n");
  assert.equal(sonia.get("2026-09-17"), 3.7304);
  assert.equal(sonia.has("2026-10-12"), false);
  assert.equal(soniaOn(sonia, "2026-09-20"), 3.7304);
  assert.throws(() => parseSoniaCsv("<html>"), /başlığı/);
});

test("TCMB veri takvimi: dönem adı → yayım günü (TRT)", () => {
  const map = parsePkaReleaseDates({
    content: [
      { donem: "Eylül 2026", tarih: "2026-09-11T10:00:00.000Z" },
      { donem: "Ekim 2026", tarih: "2026-10-16T10:00:00.000Z" },
    ],
  });
  assert.equal(map.get("2026-09"), "2026-09-11");
  assert.equal(map.get("2026-10"), "2026-10-16");
});

test("TCMB anket geçmişi: her dolu ay, eskiden yeniye", () => {
  const all = parseTcmbSurveyHistory({
    items: [
      { Tarih: "2026-9", TP_PKAUO_S04_C_U: "37", TP_PKAUO_S04_F_U: "36" },
      { Tarih: "2026-8", TP_PKAUO_S04_C_U: "37", TP_PKAUO_S04_F_U: "36.5" },
      { Tarih: "2026-10", TP_PKAUO_S04_C_U: null },
    ],
  });
  assert.deepEqual(all.map((s) => s.period), ["2026-08", "2026-09"]);
});

test("NY Fed SME: orta nokta → aralığın üst sınırı, ızgara dışı medyan olduğu gibi", () => {
  assert.equal(midToUpper(0.0363), 3.75);
  assert.equal(midToUpper(0.0388), 4);
  assert.equal(midToUpper(0.035), 3.63);
  const files = listSmeDataFiles(
    `<a href="/medialibrary/media/markets/survey/2026/sep-2026-data.xlsx">x</a><a href="/medialibrary/media/markets/survey/2026/jul-2026-data.xlsx">y</a><a href="/medialibrary/media/markets/survey/2026/sep-2026-sme-results.pdf">z</a>`,
  );
  assert.deepEqual(files.map((f) => f.round), ["2026-09", "2026-07"]);
});

test("enflasyon: HICP öncü, ONS ve RBA G4 son dolu ay", () => {
  const hicp = parseHicpCsv(
    "KEY,FREQ,TIME_PERIOD,OBS_VALUE,OBS_STATUS\nHICP.M,M,2026-08,3.6,A\nHICP.M,M,2026-09,3.8,E\n",
  );
  assert.deepEqual(hicp, { period: "2026-09", value: 3.8, flash: true });
  assert.deepEqual(parseOnsSeries({ months: [{ date: "2026 JUL", value: "3.0" }, { date: "2026 AUG", value: "3.1" }] }), {
    period: "2026-08",
    value: 3.1,
  });
  const g4 = "﻿G4 CONSUMER PRICE INFLATION\nSeries ID,GCPIAGM,GCPIAGYPM,GCPIAGMP\n31/07/2026,104.1,3.5,0.4\n31/08/2026,104.5,4.0,0.4\n";
  assert.deepEqual(parseRbaG4(g4), { period: "2026-08", value: 4 });
});
