import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMinutesOutput } from "../src/lib/minutes";
import {
  findBojOpinions,
  findEcbAccount,
  findTcmbSummary,
  parseBoeMinutes,
  parseEcbAccount,
  parseFedMinutes,
  parseRbaMinutes,
  parseTcmbSummary,
  wrapSentences,
} from "../src/lib/sources/minutes";

// Örnekler 15 Ekim 2026'da kaynakların kendi sayfalarından, kısaltılmış.

test("Fed tutanağı: makale gövdesi, katılımcı listesinden önce biter", () => {
  const html = `<div id="article" class="col-xs-12 col-sm-8 col-md-9">
    <h3>Minutes of the Federal Open Market Committee</h3>
    <p><strong>September 15–16, 2026</strong><br />
A joint meeting of the Federal Open Market Committee and the Board of Governors was held on Tuesday.</p>
<p><strong>Participants' Views on Current Conditions and the Economic Outlook</strong><br />
Participants noted that inflation remained elevated.</p>
<p><strong>Notation Vote</strong><br />
By notation vote completed on August 18, 2026, the Committee unanimously approved the minutes.</p>
<p><strong>Attendance</strong><br />
Kevin Warsh, Chairman<br />
John C. Williams, Vice Chair</p></div>`;
  const text = parseFedMinutes(html);
  assert.match(text, /^Minutes of the Federal Open Market Committee/);
  assert.match(text, /approved the minutes\.$/);
  assert.doesNotMatch(text, /Kevin Warsh/);
});

test("ECB tutanağı: listede toplantının son günü, gövde üye listesinde biter", () => {
  const list = `<dt isoDate="2026-10-08"><div class="date">8 October 2026</div></dt><dd><div class="title"><a href="/press/accounts/2026/html/ecb.mg261008~a10153d090.en.html"  >Meeting of 9-10 September 2026</a></div></dd>
<dt isoDate="2026-11-26"><div class="date">26 November 2026</div></dt><dd><div class="title"><a href="/press/accounts/2026/html/ecb.mg261126~0000000000.en.html"  >Meeting of 30 September-1 October 2026</a></div></dd>`;
  assert.equal(findEcbAccount(list, "2026-09-10"), "https://www.ecb.europa.eu/press/accounts/2026/html/ecb.mg261008~a10153d090.en.html");
  assert.equal(findEcbAccount(list, "2026-10-01"), "https://www.ecb.europa.eu/press/accounts/2026/html/ecb.mg261126~0000000000.en.html");
  assert.equal(findEcbAccount(list, "2026-09-09"), undefined);

  const html = `<main><h1>Account of the monetary policy meeting</h1>
<h2>1. Review of financial, economic and monetary developments and policy options</h2>
<p>Members exchanged views on the growth outlook.</p>
<h3>Members</h3><p>Ms Lagarde, President</p></main>`;
  const text = parseEcbAccount(html);
  assert.match(text, /Members exchanged views/);
  assert.doesNotMatch(text, /Lagarde/);
});

test("TCMB özeti: karardan sonraki ilk özet, künyedeki toplantı tarihi doğrulanır", () => {
  const item = (href: string, title: string, date: string) =>
    `<a class="collection-title" href="${href}" title="${title}">x</a><div class="collection-tag">${date}</div>`;
  const list = [
    item("/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/2026/DUY2026-42", "Para Politikası Kurulu Toplantı Özeti (2026-42)", "17/09/2026"),
    item("/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/2026/DUY2026-38", "Faiz Oranlarına İlişkin Basın Duyurusu (2026-38)", "10/09/2026"),
    item("/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/2026/DUY2026-32", "Para Politikası Kurulu Toplantı Özeti (2026-32)", "30/07/2026"),
  ].join("\n");
  assert.equal(findTcmbSummary(list, "2026-09-10", "tr"), "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/2026/DUY2026-42");
  assert.equal(findTcmbSummary(list, "2026-07-23", "tr"), "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/2026/DUY2026-32");
  // Sıradaki kararın özeti henüz yok.
  assert.equal(findTcmbSummary(list, "2026-10-22", "tr"), undefined);

  const page = `<div class="tcmb-content type-prg">
<p dir="ltr">Sayı: 2026-42</p>
<p dir="ltr" style="text-align: right;">17 Eylül 2026</p>
<h2 dir="ltr">Para Politikası Kurulu Toplantı Özeti</h2>
<p dir="ltr">Toplantı Tarihi: 10 Eylül 2026</p>
<h3 dir="ltr">Küresel Ekonomi</h3>
<p dir="ltr">1.&nbsp; &nbsp; Enerji fiyatlarındaki yüksek ve dalgalı seyir sürmektedir.</p>
<p dir="ltr">2.&nbsp; &nbsp; Kurul, sıkı duruşu sürdürecektir.</p></div>`;
  const text = parseTcmbSummary(page, "2026-09-10");
  assert.match(text, /^1\.\s+Enerji/);
  assert.doesNotMatch(text, /Sayı: 2026-42/);
  assert.throws(() => parseTcmbSummary(page, "2026-07-23"), /başka bir toplantıya ait/);
});

test("BoE tutanağı: karar özetinin sayfasında kendi bölümü", () => {
  const html = `<section class="page-section"><h2>Monetary Policy Summary, September 2026</h2><p>The MPC voted 6–3.</p></section>
<section class="page-section">
<h2>Minutes of the Monetary Policy Committee meeting ending on 16 September 2026</h2>
<p>1: Before turning to its immediate policy decisions, the MPC discussed developments.</p>
<p>2: Inflation had risen.</p></section>
<div class="col12"><h2 class="exclude-navigation">Other Monetary Policy Committee news</h2></div>`;
  assert.equal(
    parseBoeMinutes(html),
    "1: Before turning to its immediate policy decisions, the MPC discussed developments.\n\n2: Inflation had risen.",
  );
});

test("BoJ görüş özeti: dosya adı kararın günü (.pdf ya da .htm)", () => {
  const list = `<a href="/en/mopo/mpmsche_minu/opinion_2026/opi260918.pdf">Meeting on September 17 and 18, 2026 [PDF 227KB]</a>
<a href="/en/mopo/mpmsche_minu/opinion_2026/opi260123.htm">Meeting on January 22 and 23, 2026</a>`;
  assert.equal(findBojOpinions(list, "2026-09-18"), "https://www.boj.or.jp/en/mopo/mpmsche_minu/opinion_2026/opi260918.pdf");
  assert.equal(findBojOpinions(list, "2026-01-23"), "https://www.boj.or.jp/en/mopo/mpmsche_minu/opinion_2026/opi260123.htm");
  assert.equal(findBojOpinions(list, "2026-10-30"), undefined);
});

test("RBA tutanağı: içerik, kararın ilgili bağlantılarına kadar", () => {
  const html = `<a class="nav-page-contents" href="#mp-related-links">More on the September 2026 monetary policy decision</a>
<section><div id="content" tabindex="-1" role="main" class="column-content content-style">
<h1 class="page-title">Minutes of the Monetary Policy Board Meeting</h1>
<p><strong> Hybrid &ndash; 28 and 29 September 2026</strong></p>
<h2>Members participating</h2><p>Michele&nbsp;Bullock (Governor and Chair)</p>
<p>Members agreed that inflation risks had materialised.</p>
<h2 id="mp-related-links">More on the September 2026 monetary policy decision...</h2>
<p>Monetary Policy Board Statement</p></div></section>`;
  const text = parseRbaMinutes(html);
  assert.match(text, /inflation risks had materialised\.$/);
  assert.doesNotMatch(text, /Monetary Policy Board Statement/);
});

test("Tutanak özeti: geçerli çıktı okunur; puan yoksa reddedilir, aralık dışıysa kırpılır", () => {
  const base = {
    headline_tr: "Üyeler enflasyon risklerinin arttığında birleşti.",
    headline_en: "Members agreed that inflation risks had increased.",
    points_tr: ["İki üye daha büyük artırımı savundu."],
    points_en: ["Two members argued for a larger hike."],
    score_reason_tr: "Ek sıkılaşma vurgusu.",
    score_reason_en: "Emphasis on further tightening.",
  };
  assert.equal(parseMinutesOutput({ ...base, score: 5.44 }).score, 5.4);
  assert.equal(parseMinutesOutput({ ...base, score: -12 }).score, -10);
  assert.throws(() => parseMinutesOutput(base), /score sayı değil/);
  assert.throws(() => parseMinutesOutput({ ...base, score: 1, points_en: ["a", "b"] }), /madde sayısı/);
});

test("Satır bölme: uzun PDF akışı cümle sonlarından bölünür", () => {
  const text = wrapSentences("Bir. İki cümle. Üç cümle burada. Dört.", 20);
  assert.deepEqual(text.split("\n"), ["Bir. İki cümle.", "Üç cümle burada.", "Dört."]);
});
