import { test } from "node:test";
import assert from "node:assert/strict";
import { meetingShape } from "../src/lib/api-shape";
import type { Meeting } from "../src/lib/types";

// "Biçim v1 içinde değişmez" sözü: alan adları burada sabitlenir. Bir alanı
// eklemek/yeniden adlandırmak bu testi bilerek değiştirmeyi gerektirir —
// kırılırsa /api/v2 açılır.

const upcoming: Meeting = {
  id: "ecb-2028-12-07",
  bankCode: "ecb",
  meetingAt: "2028-12-07T13:15:00.000Z",
  timeTbd: false,
  type: "rate_decision",
  status: "scheduled",
};

const decided: Meeting = {
  id: "fed-2021-03-17",
  bankCode: "fed",
  meetingAt: "2021-03-17T18:00:00.000Z",
  timeTbd: false,
  type: "projections",
  status: "done",
  decisionRate: 0.25,
  decisionRateLower: 0,
  previousRate: 0.25,
};

test("API v1 toplantı biçimi: alan adları sabit", () => {
  const keys = ["id", "bank", "type", "status", "at", "timeTbd", "trt", "decision", "url"];
  assert.deepEqual(Object.keys(meetingShape(upcoming)), keys);
  assert.deepEqual(Object.keys(meetingShape(decided)), keys);
  assert.deepEqual(Object.keys(meetingShape(upcoming).trt), ["date", "time"]);
  assert.deepEqual(Object.keys(meetingShape(decided).decision!), ["rate", "rateLower", "previousRate", "changeBp"]);
});

test("API v1: sonuçlanmamış karar decision=null, saat TRT", () => {
  const s = meetingShape(upcoming);
  assert.equal(s.decision, null);
  // 13:15 UTC, Aralık → TRT +3.
  assert.deepEqual(s.trt, { date: "2028-12-07", time: "16:15" });
  assert.match(s.url, /\/karar\/ecb-2028-12-07$/);
});

test("API v1: sonuç alanları ve değişim baz puan olarak", () => {
  const s = meetingShape({ ...decided, decisionRate: 0.5, decisionRateLower: 0.25, previousRate: 0.25 });
  assert.deepEqual(s.decision, { rate: 0.5, rateLower: 0.25, previousRate: 0.25, changeBp: 25 });
});

test("API v1: saati belli olmayan toplantıda trt.time null", () => {
  assert.equal(meetingShape({ ...upcoming, timeTbd: true }).trt.time, null);
});
