import { test } from "node:test";
import assert from "node:assert/strict";
import { zonedWallTimeToUtc } from "../src/lib/tz";
import { countdownLabel, formatDate, formatMeeting, formatTimeTrt, relativeTime } from "../src/lib/time";

// ARCHITECTURE.md §4: sabit ofset varsayımı yasak — bu değerler oradan.
test("Fed kararı yaz saatine göre TRT'ye çevrilir", () => {
  const sept = zonedWallTimeToUtc(2026, 9, 16, 14, 0, "America/New_York");
  const dec = zonedWallTimeToUtc(2026, 12, 9, 14, 0, "America/New_York");
  assert.equal(formatTimeTrt(sept.toISOString()), "21:00"); // EDT
  assert.equal(formatTimeTrt(dec.toISOString()), "22:00"); // EST
});

test("ECB kararı Eylül 15:15, Ekim sonu 16:15 TRT", () => {
  const sept = zonedWallTimeToUtc(2026, 9, 10, 14, 15, "Europe/Berlin");
  const nov = zonedWallTimeToUtc(2026, 10, 29, 14, 15, "Europe/Berlin");
  assert.equal(formatTimeTrt(sept.toISOString()), "15:15");
  assert.equal(formatTimeTrt(nov.toISOString()), "16:15");
});

test("tarih biçimi iki dilde", () => {
  const iso = "2026-10-22T11:00:00.000Z";
  assert.equal(formatDate(iso, "tr"), "22 Ekim 2026");
  assert.equal(formatDate(iso, "en"), "22 October 2026");
  assert.equal(formatMeeting(iso, true, "en"), "22 October 2026, Thursday · time not announced");
});

test("geri sayım etiketi TRT takvim gününe göre", () => {
  // 23:30 TRT'de ertesi gün 00:30'daki toplantı "Yarın"dır, "Bugün" değil.
  const now = new Date("2026-10-21T20:30:00Z");
  assert.equal(countdownLabel("2026-10-21T21:30:00Z", now, "tr"), "Yarın");
  assert.equal(countdownLabel("2026-10-25T11:00:00Z", now, "en"), "in 4 days");
  assert.equal(countdownLabel("2026-10-20T11:00:00Z", now, "tr"), "Dün");
});

test("göreli zaman", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  assert.equal(relativeTime("2026-10-13T11:00:00Z", now, "tr"), "1 saat önce");
  assert.equal(relativeTime("2026-10-13T11:59:00Z", now, "en"), "1 minute ago");
  assert.equal(relativeTime("2026-10-10T12:00:00Z", now, "en"), "3 days ago");
});
