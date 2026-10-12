import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDate, parseFeed } from "../src/lib/sources/feeds";
import { passesMediaFilter } from "../src/lib/news";

// Gerçek akışlardan kısaltılmış örnekler (12 Ekim 2026).
const FED_RSS = `<rss><channel><item>
  <title>Federal Reserve Board announces enforcement action</title>
  <link><![CDATA[https://www.federalreserve.gov/newsevents/pressreleases/enforcement20261008a.htm]]></link>
  <description><![CDATA[Federal Reserve Board announces enforcement action]]></description>
  <pubDate><![CDATA[Thu, 8 Oct 2026 20:30:00 GMT]]></pubDate>
</item></channel></rss>`;

const TCMB_ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
  <title type="text"><![CDATA[Başkan Fatih Karahan&rsquo;ın &ldquo;Enflasyon ve Para Politikası&rdquo; Başlıklı Sunumu]]></title>
  <link rel="alternate" type="text/html" href="http://www.tcmb.gov.tr/wps/wcm/connect/x/SunumB07_10_2026.pdf?MOD=AJPERES"></link>
  <published>7 Eki 2026 11:00:00</published>
</entry></feed>`;

const RBA_RDF = `<rdf:RDF xmlns="http://purl.org/rss/1.0/"><item rdf:about="https://www.rba.gov.au/media-releases/2026/mr-26-28.html">
  <title>Monetary Policy Decision</title><link>https://www.rba.gov.au/media-releases/2026/mr-26-28.html</link>
  <description>&lt;p&gt;At its meeting today, the Board decided to raise the cash rate target.&lt;/p&gt;</description>
  <dc:date>2026-09-29T14:30:00+10:00</dc:date>
</item></rdf:RDF>`;

test("Fed RSS: CDATA içindeki bağlantı ve tarih", () => {
  const [e] = parseFeed(FED_RSS);
  assert.equal(e.link, "https://www.federalreserve.gov/newsevents/pressreleases/enforcement20261008a.htm");
  assert.equal(e.publishedAt, "2026-10-08T20:30:00.000Z");
});

test("TCMB Atom: Türkçe tarih TRT kabul edilir, HTML varlıkları çözülür, https'e çevrilir", () => {
  const [e] = parseFeed(TCMB_ATOM);
  assert.equal(e.title, 'Başkan Fatih Karahan\'ın "Enflasyon ve Para Politikası" Başlıklı Sunumu');
  assert.equal(e.publishedAt, "2026-10-07T08:00:00.000Z");
  assert.ok(e.link.startsWith("https://www.tcmb.gov.tr/"));
});

test("RBA RDF: kodlanmış HTML açıklama düz metne iner", () => {
  const [e] = parseFeed(RBA_RDF);
  assert.equal(e.description, "At its meeting today, the Board decided to raise the cash rate target.");
  assert.equal(e.publishedAt, "2026-09-29T04:30:00.000Z");
});

test("tarih okunamazsa öğe tarihsiz kalır (atlanır)", () => {
  assert.equal(parseDate("yarın"), undefined);
  assert.equal(parseDate("9 Xyz 2026 00:00:00"), undefined);
});

test("basın süzgeci: konuyla ilgili olanı geçirir, şirket haberini geçirmez", () => {
  assert.ok(passesMediaFilter("Higher rates could be needed, says Fed's Hammack"));
  assert.ok(passesMediaFilter("Bakan Şimşek: Enflasyonla mücadele sürecek"));
  assert.ok(!passesMediaFilter("Meta is back on the AI leaderboard with its new models"));
});
