// The score screen only claims levers the rubric says move the 1-5 score.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ignoredByScore, leverCopy, scoreBandSummary, scoringDimensions } from "../../src/lib/score-claims.mjs";
import { scoreLevers } from "../../src/lib/machine-summary.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

test("the methodology lists the five scoring dimensions and not a sixth", () => {
  const names = scoringDimensions().map((row) => row.name);
  assert.deepEqual(names, ["Lebenslauf-Match", "North-Star-Passung", "Vergütung", "Kultursignale", "Warnsignale"]);
  const joined = scoringDimensions().map((row) => `${row.name} ${row.detail}`).join("\n");
  assert.match(joined, /unbekannt und verändert den Score nicht/);
  assert.match(joined, /nicht ein mittlerer Wert/);
  assert.equal(joined.includes("Overall"), false);
  assert.equal(ignoredByScore().some((item) => /Block B/i.test(item)), true);
  assert.equal(ignoredByScore().some((item) => /Block G/i.test(item)), true);
  assert.equal(ignoredByScore().some((item) => /Belastbarkeit/i.test(item)), true);
});

test("the band lines come from the shared table", () => {
  const lines = scoreBandSummary().join("\n");
  assert.match(lines, /Strong apply beginnt bei 4\.5/);
  assert.match(lines, /Apply beginnt bei 4\.0/);
  assert.match(lines, /Maybe beginnt bei 3\.0/);
  assert.match(lines, /Skip liegt unter 3\.0/);
});

test("holding-it-down copy is limited to red flags", () => {
  const copy = leverCopy();
  const redFlags = scoringDimensions().find((row) => row.name === "Warnsignale");
  assert.match(redFlags.detail, /Ausschlusskriterium erzwingt/i);
  assert.match(redFlags.detail, /ändert den Score nicht/i);
  assert.match(copy.holdingHint, /erzwingen „Skip“/i);
  assert.match(copy.holdingHint, /Sie ändern den Score nicht/i);
  assert.equal(/lower the score|move the score down/i.test(copy.holdingHint), false);
  assert.equal(/requirement/i.test(copy.holdingHint), false);
  assert.match(copy.sectionTitle, /score/i);
  assert.match(copy.sectionTitle, /Empfehlung/i);
  assert.match(copy.verifyHint, /ändert den Score von 1 bis 5 nicht/);
  const screen = readFileSync(path.join(HERE, "../../src/components/score-methodology.tsx"), "utf8");
  assert.equal(screen.includes("six dimensions"), false);
  assert.equal(screen.includes("Overall"), false);
  const levers = readFileSync(path.join(HERE, "../../src/components/score-levers.tsx"), "utf8");
  assert.match(levers, /copy\.sectionTitle/);
  assert.equal(levers.includes("What would change this score"), false);
});

test("a missing requirement is not returned as a score lever", () => {
  const levers = scoreLevers({
    decision: "Consider",
    strengths: [],
    hardStops: [],
    softGaps: ["Light on stakeholder updates"],
    requirements: [{ requirement: "Kubernetes", importance: "critical", match: "missing" }],
    confidenceGaps: [],
    unknownEvidence: ["Compensation"],
  });
  assert.deepEqual(levers.holding, []);
  assert.deepEqual(levers.close, [{ text: "Light on stakeholder updates", importance: null }]);
  assert.deepEqual(levers.verify, ["Belege zu „Compensation“ sind unbekannt"]);
});
