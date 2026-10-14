import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEcbWeekly, parseFedCalendar, parseUsTime } from "../src/lib/sources/speaking-calendars";
import { decodeEntities } from "../src/lib/sources/shared";
import { parseTcmbCalendar, parseTcmbReleases } from "../src/lib/sources/tcmb";

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

test("TÜFE açıklaması: ait olduğu ay ve haber işinin bakacağı ekonomiler", async () => {
  const { cpiReferenceMonth, dueCpiReleases } = await import("../src/lib/cpi-release");
  assert.equal(cpiReferenceMonth("2026-10-14T12:30:00.000Z"), "2026-09");
  assert.equal(cpiReferenceMonth("2027-01-13T13:30:00.000Z"), "2026-12"); // yıl dönümü
  // Japonya: 22 Ekim 23:30 UTC = 23 Ekim TRT; ay yine Ekim → Eylül verisi.
  assert.equal(cpiReferenceMonth("2026-10-22T23:30:00.000Z"), "2026-09");
  const events = [
    { kind: "cpi" as const, bankCode: "fed" as const, at: "2026-10-14T12:30:00.000Z" },
    { kind: "cpi" as const, bankCode: "boe" as const, at: "2026-10-21T06:00:00.000Z" },
    { kind: "speech" as const, bankCode: "ecb" as const, at: "2026-10-14T10:00:00.000Z" },
  ];
  const readings = [
    { bankCode: "fed" as const, period: "2026-08" },
    { bankCode: "boe" as const, period: "2026-08" },
  ];
  assert.deepEqual(dueCpiReleases(events, readings, new Date("2026-10-14T13:00:00Z")), ["fed"]);
  // Rakam geldiyse ya da 12 saat geçtiyse bakılmaz; açıklanmamış olana da bakılmaz.
  assert.deepEqual(dueCpiReleases(events, [{ bankCode: "fed", period: "2026-09" }], new Date("2026-10-14T13:00:00Z")), []);
  assert.deepEqual(dueCpiReleases(events, readings, new Date("2026-10-15T01:00:00Z")), []);
  assert.deepEqual(dueCpiReleases(events, readings, new Date("2026-10-14T12:00:00Z")), []);
});

// TCMB duyuru takvimi, 15 Ekim 2026'da tcmb.gov.tr'den, üç satıra kısaltılmış.
const TCMB_TABLE = `<h2 dir="ltr">PARA POLİTİKASI KURULU TOPLANTILARI VE RAPOR TAKVİMİ</h2>
<table><tbody><tr>
			<td>
			<h3>Para Politikası Kurulu Toplantı Kararı</h3>
			</td>
			<td style="width: 27.5%">
			<h3>Para Politikası Kurulu Toplantı Özeti</h3>
			</td>
			<td style="width: 22.5%">
			<h3>Enflasyon Raporu</h3>
			</td>
			<td style="width: 22.5%">
			<h3>Finansal İstikrar Raporu</h3>
			</td>
		</tr>
<tr>
			<td style="text-align: center;">22 Nisan 2026</td>
			<td style="text-align: center;">30 Nisan 2026</td>
			<td style="text-align: center;">14 Mayıs 2026</td>
			<td style="text-align: center;">22 Mayıs 2026</td>
		</tr>
<tr>
			<td style="text-align: center;">11 Haziran 2026</td>
			<td style="text-align: center;">18 Haziran 2026</td>
			<td style="text-align: center;">&nbsp;</td>
			<td style="text-align: center;">&nbsp;</td>
		</tr>
<tr>
			<td style="text-align: center;">22 Ekim 2026</td>
			<td style="text-align: center;">30 Ekim 2026</td>
			<td style="text-align: center;">12 Kasım 2026</td>
			<td style="text-align: center;">27 Kasım 2026</td>
		</tr></tbody></table>`;

test("TCMB takvimi: karar sütunu 14:00 TRT, rapor sütunları gün düzeyinde", () => {
  assert.deepEqual(
    parseTcmbCalendar(TCMB_TABLE).map((m) => m.meetingAt),
    ["2026-04-22T11:00:00.000Z", "2026-06-11T11:00:00.000Z", "2026-10-22T11:00:00.000Z"],
  );
  const releases = parseTcmbReleases(TCMB_TABLE);
  assert.deepEqual(
    releases.map((e) => e.id),
    [
      "tcmb-2026-04-30-mpc-summary",
      "tcmb-2026-05-14-inflation-report",
      "tcmb-2026-05-22-fsr",
      "tcmb-2026-06-18-mpc-summary",
      "tcmb-2026-10-30-mpc-summary",
      "tcmb-2026-11-12-inflation-report",
      "tcmb-2026-11-27-fsr",
    ],
  );
  // Saat duyurulmuyor: TRT gün başı + timeTbd (sayfada "—").
  const summary = releases.find((e) => e.id === "tcmb-2026-10-30-mpc-summary")!;
  assert.equal(summary.at, "2026-10-29T21:00:00.000Z");
  assert.equal(summary.timeTbd, true);
});
