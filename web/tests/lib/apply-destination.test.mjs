import { test } from "node:test";
import assert from "node:assert/strict";
import { applyDestination, applyOpenArgs } from "../../src/lib/apply-destination.mjs";

test("Apply with a CV and a link opens the form reader for that offer", () => {
  const dest = applyDestination({
    n: "15",
    pdfOnDisk: true,
    postingUrl: "https://jobs.example.com/apply/15",
  });
  assert.equal(dest.kind, "apply");
  assert.equal(dest.href, "/apply");
  const open = applyOpenArgs({ dest, company: "Example Co", from: "/pipeline/15" });
  assert.deepEqual(open, {
    href: "/apply",
    url: "https://jobs.example.com/apply/15",
    opts: { prefill: true, company: "Example Co", n: "15", from: "/pipeline/15" },
  });
});

test("Apply without a tailored CV names the missing file and the report", () => {
  const dest = applyDestination({ n: "15", pdfOnDisk: false, postingUrl: "https://jobs.example.com/apply/15" });
  assert.equal(dest.kind, "need-cv");
  assert.match(dest.message, /angepasster Lebenslauf/);
  assert.equal(dest.nextHref, "/pipeline/15");
  assert.match(dest.nextLabel, /Lebenslauf zu erstellen/);
  assert.equal(applyOpenArgs({ dest }), null);
});

test("Apply on the report itself points at the generate step on that page", () => {
  const dest = applyDestination({
    n: "15",
    pdfOnDisk: false,
    postingUrl: "https://jobs.example.com/apply/15",
    alreadyOnReport: true,
  });
  assert.equal(dest.kind, "need-cv");
  assert.match(dest.message, /Erstellen Sie auf dieser Seite den angepassten Lebenslauf/);
  assert.equal(dest.nextHref, null);
});

test("Apply with a CV but no link does not open the form reader", () => {
  const dest = applyDestination({ n: "4", pdfOnDisk: true, postingUrl: "" });
  assert.equal(dest.kind, "need-link");
  assert.match(dest.message, /keinen Bewerbungslink/);
  assert.equal(applyOpenArgs({ dest }), null);
});
