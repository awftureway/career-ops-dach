"use client";

import { useState } from "react";
import { pdfDownloadHref, pdfRevealHref } from "@/lib/cv-pdf-query.mjs";

export function CvPdfFileActions({ viewHref, className }: { viewHref: string; className: string }) {
  const [error, setError] = useState("");

  async function reveal() {
    setError("");
    try {
      const res = await fetch(pdfRevealHref(viewHref), { method: "POST" });
      if (!res.ok) {
        const text = (await res.text()).trim();
        setError(text || "Datei konnte nicht angezeigt werden.");
      }
    } catch {
      setError("Datei konnte nicht angezeigt werden.");
    }
  }

  return (
    <>
      <a href={pdfDownloadHref(viewHref)} className={className}>
        PDF herunterladen
      </a>
      <button type="button" className={className} title="Datei anzeigen" onClick={reveal}>
        Im Finder zeigen
      </button>
      {error ? (
        <span role="alert" className="text-xs text-red-700 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </>
  );
}
