import test from "node:test";
import assert from "node:assert/strict";
import { employerLinkFromPanel } from "../src/lib/apply/apply-link.mjs";

const board = "www.arbeitsagentur.de";
const panel = [
  { text: "a@bridging-it.de", href: "mailto:a@bridging-it.de" },
  { text: "Karriereseite!", href: "https://www.fastahead.com/jobs?utm=1" },
  { text: "Homepage", href: "http://www.bridging-it.de/" },
  { text: "Über Internetseite des Arbeitgebers", href: "https://bridging-it-gruppe.concludis.de/prj/apply/1866/9" },
];
test("follows the posting's own application link, not a careers page or homepage", () => {
  assert.equal(employerLinkFromPanel(panel, board), "https://bridging-it-gruppe.concludis.de/prj/apply/1866/9");
});
test("returns null without that link", () => {
  assert.equal(employerLinkFromPanel(panel.slice(0, 3), board), null);
});
test("never follows a link back onto the board", () => {
  const own = [{ text: "Über Internetseite des Arbeitgebers", href: "https://www.arbeitsagentur.de/jobsuche/x" }];
  assert.equal(employerLinkFromPanel(own, board), null);
});
