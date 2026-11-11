import { test } from "node:test";
import assert from "node:assert/strict";
import { breadcrumbLd, faqLd, serializeJsonLd, websiteLd } from "../src/lib/json-ld";

test("JSON-LD: </script> içeren veri etiketi kapatamaz", () => {
  const out = serializeJsonLd({ name: "x</script><script>alert(1)</script>" });
  assert.ok(!out.includes("</script>"));
  assert.ok(!out.includes("<"));
  // Kaçışlanan hâli yine aynı JSON'a çözülür.
  assert.equal(JSON.parse(out).name, "x</script><script>alert(1)</script>");
});

test("JSON-LD: ekmek kırıntısı sıralı ve dile göre adresli", () => {
  const ld = breadcrumbLd("en", [
    { name: "Home", path: "/" },
    { name: "Fed", path: "/banka/fed" },
  ]);
  assert.equal(ld["@type"], "BreadcrumbList");
  assert.deepEqual(
    ld.itemListElement.map((i) => [i.position, new URL(i.item).pathname]),
    [
      [1, "/en"],
      [2, "/en/banka/fed"],
    ],
  );
});

test("JSON-LD: WebSite dili taşır, FAQ soru/cevap eşler", () => {
  assert.equal(websiteLd("tr").inLanguage, "tr");
  const faq = faqLd([{ q: "Soru?", a: "Cevap." }]);
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, "Cevap.");
});

test("JSON-LD: etkinlik başlangıcı Türkiye ofsetiyle; saati belli olmayan karar yalnızca gün", async () => {
  const { eventLd, trtIso } = await import("../src/lib/json-ld");
  assert.equal(trtIso("2026-12-10T11:00:00.000Z"), "2026-12-10T14:00:00+03:00");
  assert.equal(trtIso("2026-06-10T11:00:00.000Z"), "2026-06-10T14:00:00+03:00");
  const base = {
    lang: "tr" as const,
    id: "boj-2026-12-18",
    name: "BoJ faiz kararı",
    description: "x",
    organizer: { name: "Bank of Japan", url: "https://www.boj.or.jp" },
  };
  // BoJ: 03:00 UTC yer tutucu; saat gibi sunulmamalı.
  assert.equal(eventLd({ ...base, at: "2026-12-18T03:00:00.000Z", timeTbd: true }).startDate, "2026-12-18");
  const ev = eventLd({ ...base, at: "2026-12-18T03:00:00.000Z", timeTbd: false });
  assert.equal(ev.startDate, "2026-12-18T06:00:00+03:00");
  assert.equal(ev["@type"], "Event");
  assert.match(ev.url, /\/karar\/boj-2026-12-18$/);
});

test("JSON-LD: makale tarihleri ve dil", async () => {
  const { articleLd } = await import("../src/lib/json-ld");
  const a = articleLd({ lang: "en", slug: "reel-faiz-nedir", headline: "H", description: "D", updatedOn: "2026-10-13" });
  assert.equal(a["@type"], "Article");
  assert.equal(a.dateModified, "2026-10-13");
  assert.equal(a.inLanguage, "en");
  assert.match(a.mainEntityOfPage, /\/en\/rehber\/reel-faiz-nedir$/);
});
