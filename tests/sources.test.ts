import { test } from "node:test";
import assert from "node:assert/strict";
import { detectBank } from "../src/lib/sources/bis";
import { parseBojStatementList } from "../src/lib/sources/boj-rates";
import { parseRbaCashRate } from "../src/lib/sources/rba";
import { effectiveSince } from "../src/lib/sources/shared";
import { licenseFor } from "../src/lib/text-license";
import { toParagraphs } from "../src/lib/speech-format";

test("lisans konuşmacının unvanından okunur, etkinlik yerinden değil", () => {
  // Jefferson'ın bölgesel Fed'deki konuşması bir kez yanlışlıkla dışlanmıştı.
  const jefferson =
    "Speech by Mr Philip N Jefferson, Vice Chair of the Board of Governors of the Federal Reserve System, at a conference hosted by the Federal Reserve Bank of Kansas City, 1 October 2026.";
  assert.equal(licenseFor("fed", jefferson), "frb-public-domain");
  const williams =
    "Remarks by Mr John C Williams, President and Chief Executive Officer of the Federal Reserve Bank of New York, at the University at Buffalo, 29 September 2026.";
  assert.equal(licenseFor("fed", williams), undefined);
  assert.equal(licenseFor("boe", "Speech by Mr Andrew Bailey, Governor of the Bank of England, at LSE"), undefined);
  assert.equal(licenseFor("fed", undefined), undefined);
});

test("BIS banka tespiti", () => {
  assert.equal(detectBank("Member of the Executive Board of the European Central Bank"), "ecb");
  assert.equal(detectBank("Governor of the Central Bank of the Republic of Türkiye"), "tcmb");
  assert.equal(detectBank("Governor of the Bank of Canada"), null);
});

test("BoJ karar listesi: Reference ekleri atlanır, tarih okunur", () => {
  const html = `<table>
    <tr><td>Sept. 18, 2026</td><td><a href="/en/mopo/mpmdeci/state_2026/k260918a.pdf">Change in the Guideline for Money Market Operations</a></td></tr>
    <tr><td>Sept. 18, 2026</td><td><a href="/en/x.pdf">Statement on Monetary Policy (Reference)</a></td></tr>
    <tr><td>July 31, 2026</td><td><a href="/en/mopo/mpmdeci/state_2026/k260731a.pdf">Statement on Monetary Policy</a></td></tr>
  </table>`;
  const list = parseBojStatementList(html);
  assert.deepEqual(list.map((s) => s.date), ["2026-07-31", "2026-09-18"]);
  assert.ok(list[1].url.startsWith("https://www.boj.or.jp/en/mopo/"));
});

test("RBA F1 CSV ve yürürlük tarihi", () => {
  const csv = "Title,Cash Rate Target\nUnits,Per cent\n29-Sep-2026,4.35\n30-Sep-2026,4.60\n01-Oct-2026,4.60\n,\n";
  const obs = parseRbaCashRate(csv);
  assert.deepEqual(obs.at(-1), { date: "2026-10-01", value: 4.6 });
  // asOf "şu tarihten beri"dir, son gözlem günü değil (ARCHITECTURE.md §4).
  assert.equal(effectiveSince(obs), "2026-09-30");
});

test("tam metin biçimlemesi yalnızca boşlukları değiştirir", () => {
  const raw =
    "Introduction\nThank you for the invitation to speak here today about the economic outlook and\nmonetary policy in the euro area.\nInflation has been too high for too long and we remain determined to bring it\nback to our two per cent target in a timely manner.\n";
  const paragraphs = toParagraphs(raw);
  assert.ok(paragraphs.length >= 2);
  assert.equal(paragraphs.join("").replace(/\s/g, ""), raw.replace(/\s/g, ""));
});
