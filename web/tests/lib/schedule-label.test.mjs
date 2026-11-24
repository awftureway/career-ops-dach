import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_SCHEDULES_HINT,
  SCHEDULED_SCANS_INTRO,
  scanEngineDetail,
  scanEngineLabel,
  scheduleCadenceLabel,
} from "../../src/lib/schedule-label.mjs";

test("one day is Daily, two days stay counted, and seven days are Weekly", () => {
  assert.equal(scheduleCadenceLabel(1, "days"), "Täglich");
  assert.equal(scheduleCadenceLabel(2, "days"), "Alle 2 Tage");
  assert.equal(scheduleCadenceLabel(7, "days"), "Wöchentlich");
  assert.equal(scheduleCadenceLabel(14, "days"), "Alle 2 Wochen");
});

test("hours and minutes get the same plain treatment", () => {
  assert.equal(scheduleCadenceLabel(1, "hours"), "Stündlich");
  assert.equal(scheduleCadenceLabel(24, "hours"), "Täglich");
  assert.equal(scheduleCadenceLabel(6, "hours"), "Alle 6 Stunden");
  assert.equal(scheduleCadenceLabel(1, "minutes"), "Jede Minute");
  assert.equal(scheduleCadenceLabel(15, "minutes"), "Alle 15 Minuten");
});

test("a broken cadence does not print Every NaN", () => {
  assert.equal(scheduleCadenceLabel("nope", "days"), "Nach Zeitplan");
  assert.equal(scheduleCadenceLabel(0, "days"), "Nach Zeitplan");
});

test("scheduled-scan copy talks about checking job boards", () => {
  const copy = [
    SCHEDULED_SCANS_INTRO,
    EMPTY_SCHEDULES_HINT,
    scanEngineLabel("full"),
    scanEngineLabel("portals"),
    scanEngineDetail("full"),
    scanEngineDetail("portals"),
    scheduleCadenceLabel(1, "days"),
  ].join("\n");
  assert.match(copy, /Jobbörsen/i);
  assert.equal(/crawler/i.test(copy), false);
  assert.equal(/zero-token/i.test(copy), false);
  assert.equal(/\bATS\b/.test(copy), false);
  assert.equal(copy.includes("Alle 1 Tage"), false);
});
