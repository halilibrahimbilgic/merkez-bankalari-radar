import { test } from "node:test";
import assert from "node:assert/strict";
import { googleCalendarUrl, meetingIcsHref } from "../src/lib/calendar-links";
import type { Meeting } from "../src/lib/types";

const meeting = (over: Partial<Meeting>): Meeting =>
  ({ id: "fed-2026-10-28", bankCode: "fed", meetingAt: "2026-10-28T18:00:00.000Z", timeTbd: false, type: "rate_decision", ...over }) as Meeting;

test("Google Takvim: saatli karar bir saatlik UTC blok", () => {
  const url = new URL(googleCalendarUrl(meeting({}), "tr"));
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  assert.equal(url.searchParams.get("text"), "Fed faiz kararı");
  assert.equal(url.searchParams.get("dates"), "20261028T180000Z/20261028T190000Z");
  assert.match(url.searchParams.get("details")!, /\/banka\/fed$/);
  assert.equal(new URL(googleCalendarUrl(meeting({}), "en")).searchParams.get("text"), "Fed rate decision");
});

test("Google Takvim: saati duyurulmayan BoJ kararı Tokyo gününde tüm gün", () => {
  // meetings.json'daki gerçek kayıt: 12:00 Tokyo yer tutucu saattir, gösterilmez.
  const boj = meeting({ id: "boj-2026-10-30", bankCode: "boj", meetingAt: "2026-10-30T03:00:00.000Z", timeTbd: true });
  assert.equal(new URL(googleCalendarUrl(boj, "tr")).searchParams.get("dates"), "20261030/20261031");
  assert.equal(meetingIcsHref(boj), "/takvim/takvim.ics?toplanti=boj-2026-10-30");
});
