import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pdfDownloadHref, pdfRevealHref } from "../../src/lib/cv-pdf-query.mjs";

test("download keeps the view query and adds download=1", () => {
  assert.equal(
    pdfDownloadHref("/api/cv-pdf?n=12&company=Acme"),
    "/api/cv-pdf?n=12&company=Acme&download=1",
  );
  assert.equal(
    pdfDownloadHref("/api/cv-pdf?n=12&kind=cover"),
    "/api/cv-pdf?n=12&kind=cover&download=1",
  );
});

test("reveal keeps the view query on the reveal route", () => {
  assert.equal(
    pdfRevealHref("/api/cv-pdf?n=12&company=Northwind&kind=cover"),
    "/api/cv-reveal?n=12&company=Northwind&kind=cover",
  );
});

test("the report, the studio, and the checklist keep the view link and add download and reveal", () => {
  const root = new URL("../../src/", import.meta.url);
  const pdf = readFileSync(new URL("./components/generate-pdf-button.tsx", root), "utf8");
  const studio = readFileSync(new URL("./components/cv-studio/cv-studio.tsx", root), "utf8");
  const checklist = readFileSync(new URL("./components/apply-checklist.tsx", root), "utf8");
  const actions = readFileSync(new URL("./components/cv-pdf-file-actions.tsx", root), "utf8");
  for (const src of [pdf, studio, checklist]) assert.match(src, /CvPdfFileActions/);
  assert.match(actions, /PDF herunterladen/);
  assert.match(actions, /Im Finder zeigen/);
  assert.match(actions, /title="Datei anzeigen"/);
  assert.match(actions, /pdfDownloadHref\(viewHref\)/);
  assert.match(pdf, /Angepassten Lebenslauf ansehen/);
  assert.match(studio, /\{save\.pdf\} öffnen/);
  assert.match(checklist, /href=\{file\.downloadHref\}/);
  assert.match(checklist, />\s*Ansehen\s*</);
});
