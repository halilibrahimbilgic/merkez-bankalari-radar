import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarEvent } from "../src/lib/sources/speaking-calendars";
import type { Meeting } from "../src/lib/types";
import { trtWeek, weekCardItems, WEEK_CARD_ROWS } from "../src/lib/week-card";

const meeting = (id: string, at: string): Meeting =>
  ({ id, bankCode: id.split("-")[0], meetingAt: at, type: "rate_decision", status: "scheduled", timeTbd: false }) as Meeting;
const event = (id: string, at: string, kind: CalendarEvent["kind"], bankCode = "fed"): CalendarEvent =>
  ({ id, at, kind, bankCode, timeTbd: false, title: id }) as CalendarEvent;

test("hafta Türkiye saatiyle pazartesi başlar, hafta sonu sıradaki haftayı verir", () => {
  const week = { start: "2026-12-07", end: "2026-12-14" };
  assert.deepEqual(trtWeek(new Date("2026-12-10T09:00:00Z")), week); // perşembe
  assert.deepEqual(trtWeek(new Date("2026-12-13T09:00:00Z")), { start: "2026-12-14", end: "2026-12-21" }); // pazar → sıradaki
  // Cuma 20:00 UTC = cuma 23:00 TRT: hâlâ bu hafta; 21:30 UTC = cumartesi 00:30 TRT: sıradaki.
  assert.deepEqual(trtWeek(new Date("2026-12-04T20:00:00Z")), { start: "2026-11-30", end: "2026-12-07" });
  assert.deepEqual(trtWeek(new Date("2026-12-04T21:30:00Z")), week);
});

test("kararların hepsi, yayınlar önem sırasıyla, konuşmalar hiç", () => {
  const now = new Date("2026-12-07T06:00:00Z");
  const meetings = [
    meeting("fed-2026-12-09", "2026-12-09T19:00:00Z"),
    meeting("tcmb-2026-12-10", "2026-12-10T11:00:00Z"),
    meeting("ecb-2026-12-17", "2026-12-17T13:15:00Z"), // gelecek hafta
  ];
  const events = [
    event("speech", "2026-12-08T15:00:00Z", "speech"),
    event("panel", "2026-12-08T16:00:00Z", "testimony", "ecb"),
    event("us-cpi", "2026-12-08T13:30:00Z", "cpi"),
    event("tr-cpi", "2026-12-07T07:00:00Z", "cpi", "tcmb"),
    ...Array.from({ length: 8 }, (_, i) => event(`cpi-${i}`, `2026-12-11T0${i}:00:00Z`, "cpi", "boe")),
  ];
  const { items, hidden } = weekCardItems(meetings, events, now);
  const ids = items.map((it) => ("meeting" in it ? it.meeting.id : it.event.id));
  assert.equal(items.length, WEEK_CARD_ROWS);
  assert.ok(ids.includes("fed-2026-12-09") && ids.includes("tcmb-2026-12-10"));
  assert.ok(!ids.includes("ecb-2026-12-17") && !ids.includes("speech") && !ids.includes("panel"));
  assert.ok(ids.includes("tr-cpi"), "Türkiye TÜFE'si önce girer");
  assert.equal(hidden, 10 - (WEEK_CARD_ROWS - 2));
  // Zamana göre sıralı.
  assert.deepEqual([...items].sort((a, b) => a.at.localeCompare(b.at)), items);
});
