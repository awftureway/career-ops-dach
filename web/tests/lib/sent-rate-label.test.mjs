import assert from "node:assert/strict";
import { test } from "node:test";
import { sentRateLabel, sentRateTitle } from "../../src/lib/analytics/sent-rate-label.mjs";

test("an insights rate is a share of applications sent, not of the row count", () => {
  assert.equal(sentRateLabel(21), "21\u00a0% der Versendeten");
  assert.equal(sentRateLabel(0), "0\u00a0% der Versendeten");
  assert.equal(sentRateLabel(null), "—");
  assert.equal(sentRateLabel(undefined), "—");
});

test("the hover title says the share counts applications from the group that advanced", () => {
  assert.equal(sentRateTitle(21), "21\u00a0% der aus dieser Gruppe versendeten Bewerbungen kamen weiter");
  assert.equal(sentRateTitle(null), undefined);
  assert.equal(sentRateTitle(Number.NaN), undefined);
});
