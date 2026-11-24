// The Explore card's "posted" label counts days the way the inbox does. Its own
// Math.round over UTC midnight called a posting from today "1d ago" from 12:00
// UTC on. The instants are built from local components so the local day is the
// same in every zone.

import assert from "node:assert/strict";
import { test } from "node:test";
import { postedAgo } from "../../src/lib/inbox.ts";

test("postedAgo labels by local day, not by rounded hours since UTC midnight", () => {
  const afternoon = new Date(2026, 10, 16, 13).getTime();
  assert.equal(postedAgo("2026-11-16", afternoon), "heute");
  assert.equal(postedAgo("2026-11-15", afternoon), "vor 1 Tag");
  assert.equal(postedAgo("2026-11-13", afternoon), "vor 3 Tagen");
  assert.equal(postedAgo("2026-11-16", new Date(2026, 10, 16, 1).getTime()), "heute");
  assert.equal(postedAgo("recently", afternoon), "");
});
