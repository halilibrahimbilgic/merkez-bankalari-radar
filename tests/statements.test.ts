import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fedFraction,
  findRbaRelease,
  findTcmbRelease,
  parseBoeSummary,
  parseEcbStatement,
  parseFedStatement,
  parseRbaStatement,
  parseTcmbRate,
  parseTcmbStatement,
} from "../src/lib/sources/decision-statements";

// Örnekler 13 Ekim 2026'da kaynaklardan alınan sayfaların kısaltılmış hâli.

test("FOMC: bölünmez tireli kesir ve aralık okunur, iletişim satırı atılır", () => {
  const html = `<div id="article"><p class="article__time">January 28, 2026</p>
    <p>The Federal Open Market Committee approved the following statement for release by a 10 – 2 vote:</p>
    <p>In support of its goals, the Committee decided to maintain the target range for the federal funds rate at 3‑1/2 to 3‑3/4 percent.</p>
    <p>For media inquiries, please email us.</p>
    <p><a href="/x">Implementation Note issued January 28, 2026</a></p></div>`;
  const r = parseFedStatement(html);
  assert.equal(r.rateLower, 3.5);
  assert.equal(r.rate, 3.75);
  assert.equal(r.text.split("\n\n").length, 2);
  assert.equal(fedFraction("4"), 4);
  assert.equal(fedFraction("3-3/4"), 3.75);
});

test("FOMC: artırım cümlesi (by 1/4 percentage point to …)", () => {
  const html = `<div id="article"><p>The Committee decided to raise the target range for the federal funds rate by 1/4 percentage point<strong> </strong>to 3-3/4<strong> </strong>to 4 percent, in support of the Federal Reserve's dual mandate.</p></div>`;
  assert.deepEqual([parseFedStatement(html).rateLower, parseFedStatement(html).rate], [3.75, 4]);
});

test("ECB: tarih satırı atılır, mevduat faizi okunur (sabit ve artırım)", () => {
  const hold = `<main><div class="section"><p>23 July 2026</p><p>The Governing Council today decided to keep the three key ECB interest rates unchanged.</p><p>The interest rates on the deposit facility, the main refinancing operations and the marginal lending facility will remain unchanged at 2.25%, 2.40% and 2.65% respectively.</p></div></main>`;
  const r = parseEcbStatement(hold);
  assert.equal(r.rate, 2.25);
  assert.ok(!r.text.startsWith("23 July"));
  const hike = `<main><div class="section"><p>Accordingly, the interest rates on the deposit facility, the main refinancing operations and the marginal lending facility will be increased to 2.50%, 2.65% and 2.90% respectively, with effect from 16 September 2026.</p></div></main>`;
  assert.equal(parseEcbStatement(hike).rate, 2.5);
});

test("TCMB: künye atılır, Türkçe ve İngilizce karar cümlesi okunur", () => {
  const html = `<div class="tcmb-content type-prg"><p>Sayı: 2026-38</p><p>Toplantıya Katılan Kurul Üyeleri</p>
    <p>Para Politikası Kurulu (Kurul), politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 37’de sabit tutulmasına karar vermiştir.</p></div>`;
  const text = parseTcmbStatement(html);
  assert.ok(text.startsWith("Para Politikası Kurulu"));
  assert.equal(parseTcmbRate(text, "tr"), 37);
  assert.equal(
    parseTcmbRate("…oranının yüzde 42,5’ten yüzde 46’ya yükseltilmesine karar vermiştir.", "tr")
      ?? parseTcmbRate("politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 42,5’ten yüzde 46’ya yükseltilmesine", "tr"),
    46,
  );
  assert.equal(
    parseTcmbRate("has decided to reduce the policy rate (the one-week repo auction rate) from 38 percent to 37 percent.", "en"),
    37,
  );
});

test("TCMB listesi: o günün faiz duyurusu seçilir, diğer duyurular atlanır", () => {
  const list = `<a class="collection-title" href="/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/2026/DUY2026-39" class="type-link" title="E9 Emisyon Grubu (2026-39)">x</a>
		<div class="collection-tag">11/09/2026</div>
  <a class="collection-title" href="/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/2026/DUY2026-38" class="type-link" title="Faiz Oranlarına İlişkin Basın Duyurusu (2026-38)">y</a>
		<div class="collection-tag">10/09/2026</div>`;
  assert.equal(
    findTcmbRelease(list, "2026-09-10", "tr"),
    "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/2026/DUY2026-38",
  );
  assert.equal(findTcmbRelease(list, "2026-09-11", "tr"), undefined);
});

test("BoE: oy cümlesinden Bank Rate, özet bir sonraki başlıkta biter", () => {
  const html = `<h2>Monetary Policy Summary, September 2026</h2><p>At its meeting ending on 16 September 2026, the Monetary Policy Committee (MPC) voted by a majority of 6–3 to maintain Bank Rate at 3.75%. Three members voted to increase Bank Rate by 0.25 percentage points, to 4%.</p><h2>Minutes of the meeting</h2><p>Tutanak.</p>`;
  const r = parseBoeSummary(html);
  assert.equal(r.rate, 3.75);
  assert.ok(!r.text.includes("Tutanak"));
});

test("RBA: sınıfı değişse de karar duyurusu bulunur; 'target' kelimesi olmadan da okunur", () => {
  const list = `<article id="mr-26-19" class="item rss-mr-item"><a href="/media-releases/2026/mr-26-19.html"><span itemprop="headline">Statement by the Monetary Policy Board: Monetary Policy Decision</span></a><time datetime="2026-08-11T14:30+10:00">11 August 2026</time></article>
    <article id="mr-26-20" class="item rss-mr-item event-category-monetary-policy-board"><a href="/media-releases/2026/mr-26-20.html"><span itemprop="headline">Appointment to the Monetary Policy Board</span></a><time datetime="2026-08-14T12:00+10:00">14 August 2026</time></article>`;
  assert.equal(findRbaRelease(list, "2026-08-11"), "https://www.rba.gov.au/media-releases/2026/mr-26-19.html");
  assert.equal(findRbaRelease(list, "2026-08-14"), undefined);
  const old = `<div class="rss-mr-content"><p>At its meeting today, the Board decided to leave the cash rate unchanged at 3.60 per cent.</p></div>`;
  assert.equal(parseRbaStatement(old).rate, 3.6);
  const hike = `<div class="rss-mr-content"><p>At its meeting today, the Board decided to increase the cash rate target by 25 basis points to 4.60 per cent.</p><p>The Board&#146;s view.</p></div>`;
  const r = parseRbaStatement(hike);
  assert.equal(r.rate, 4.6);
  assert.ok(r.text.includes("Board’s"));
});
