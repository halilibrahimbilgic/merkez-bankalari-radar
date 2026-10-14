import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEcbWeekly, parseFedCalendar, parseUsTime } from "../src/lib/sources/speaking-calendars";
import { decodeEntities } from "../src/lib/sources/shared";

// Örnekler 13 Ekim 2026'da federalreserve.gov/json/calendar.json ve ECB'nin
// haftalık programından, kısaltılmış.

test("Fed takvimi: New York saati UTC'ye, unvan ve konuşmacı ayrılır, pencere dışı atlanır", () => {
  const json = {
    events: [
      { title: "Discussion - Chairman Kevin Warsh", type: "Speeches", month: "2026-10", days: "15", time: "11:30 p.m.", location: "At the Fireside Chat with IMF Managing Director Kristalina Georgieva, Bangkok, Thailand" },
      { title: "Speech - Vice Chair for Supervision Michelle W. Bowman", type: "Speeches", month: "2026-10", days: "14", time: "10:55 p.m.", location: "At the Bangkok Economic Festival 2026" },
      { title: "Beige Book", type: "Beige", month: "2026-10", days: "14", time: "2:00 p.m." },
      { title: "FOMC Meeting", type: "FOMC", month: "2026-10", days: "28", time: "2:00 p.m." },
      { title: "Speech - Governor Christopher J. Waller", type: "Speeches", month: "2026-09", days: "30", time: "9:00 a.m." },
    ],
  };
  const ev = parseFedCalendar(json, "2026-10-01", "2026-10-31");
  assert.equal(ev.length, 3);
  const warsh = ev.find((e) => e.speaker === "Kevin Warsh")!;
  assert.equal(warsh.role, "Chair");
  assert.equal(warsh.kind, "discussion");
  // 15 Ekim 23:30 EDT = 16 Ekim 03:30 UTC (06:30 TRT).
  assert.equal(warsh.at, "2026-10-16T03:30:00.000Z");
  assert.equal(ev.find((e) => e.speaker === "Michelle W. Bowman")!.role, "Vice Chair for Supervision");
  assert.equal(ev.find((e) => e.kind === "beige-book")!.at, "2026-10-14T18:00:00.000Z");
  assert.deepEqual(parseUsTime("12:15 a.m."), [0, 15]);
});

test("ECB programı: konuşma ve panel alınır, istatistik yayını ve düz katılım atlanır", () => {
  const html = `<dl><dt>Tuesday, 13 October 2026</dt>
<dd>
<strong>Board member:</strong> Philip R. Lane<br>
<strong>Event:</strong>
Speech by Mr Lane at pre-Summit dinner hosted by Miche&aacute;l Martin, Prime Minister of Ireland
<br>
<strong>Time:</strong> 20:30 CET<br>
</dd>
<dt>Monday, 12 October 2026</dt>
<dd>
<strong>Event:</strong>
Long term interest rates statistics (Dataset: IRS)
<br>
<strong>Time:</strong> 10:00<br>
</dd>
<dt>Tuesday, 13 October 2026</dt>
<dd>
<strong>Event:</strong>
Participation by Ms Lagarde and Mr Vujčić in IMF/World Bank annual meetings in Bangkok, Thailand
<br>
</dd>
<dt>Wednesday, 14 October 2026</dt>
<dd>
<strong>Board member:</strong> Christine Lagarde<br>
<strong>Event:</strong>
Participation by Ms Lagarde in fireside chat with Josh Lipsky
<br>
<strong>Time:</strong> 10:30 CET<br>
</dd></dl>`;
  const ev = parseEcbWeekly(html);
  assert.equal(ev.length, 2);
  // Yaz saati: "20:30 CET" Frankfurt saatidir (CEST) → 18:30 UTC.
  assert.equal(ev[0].at, "2026-10-13T18:30:00.000Z");
  assert.equal(ev[0].kind, "speech");
  assert.ok(ev[0].title.includes("Micheál"));
  assert.equal(ev[0].role, undefined);
  assert.equal(ev[1].role, "President");
  assert.equal(ev[1].kind, "discussion");
});

test("varlık çözücü: aksanlı harfler ve tipografik tırnaklar", () => {
  assert.equal(decodeEntities("World&rsquo;s Caf&eacute; &ldquo;x&rdquo; M&uuml;nchen"), "World’s Café “x” München");
});

test("TÜFE takvimleri: TÜİK, ONS, Japonya tablosu, ABS", async () => {
  const { parseTuikCalendar, parseOnsNextRelease, parseJapanSchedule, parseAbsNextReleases } = await import(
    "../src/lib/sources/release-calendars"
  );
  const tuik = parseTuikCalendar(
    {
      yayindaOlmayanlarList: [
        { adi: "Tüketici Fiyat Endeksi (TÜFE)", gTarih: "2026-11-03T10:00:00", donemi: "Ekim 2026", dilId: 1 },
        { adi: "Consumer Price Index", gTarih: "2026-11-03T10:00:00", dilId: 2 },
        { adi: "Yurt İçi Üretici Fiyat Endeksi (Yİ-ÜFE)", gTarih: "2026-11-03T10:00:00", dilId: 1 },
      ],
    },
    "2026-10-01",
    "2026-11-30",
  );
  assert.equal(tuik.length, 1);
  assert.equal(tuik[0].at, "2026-11-03T07:00:00.000Z");
  assert.equal(tuik[0].period, "Ekim 2026");
  assert.equal(parseOnsNextRelease({ description: { nextRelease: "21 October 2026" } }), "2026-10-21");
  // Yıl yalnızca ilk satırda; aralıktan ocağa geçişte artar.
  const row = (a: string, b: string) => `<tr><td>${a}</td><td>${b}</td><td>x</td><td>y</td><td></td></tr>`;
  assert.deepEqual(
    parseJapanSchedule(`<table>${row("December, 2025", "January 23, 2026")}${row("October", "November 20")}${row("November", "December 18")}${row("December", "January 22")}</table>`),
    ["2026-01-23", "2026-11-20", "2026-12-18", "2027-01-22"],
  );
  assert.deepEqual(parseAbsNextReleases("Future releases Next Release 28/10/2026 x Next Release 25/11/2026"), ["2026-10-28", "2026-11-25"]);
});
