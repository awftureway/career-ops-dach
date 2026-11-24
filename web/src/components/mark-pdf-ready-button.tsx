"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

const PILL =
  "inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors max-sm:min-h-[44px] disabled:cursor-not-allowed disabled:opacity-60";

export function MarkPdfReadyButton({
  reportNum,
  ready = false,
  trackerMarked = false,
}: {
  reportNum: number | null;
  ready?: boolean;
  trackerMarked?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (reportNum == null) return null;
  const settled = ready && trackerMarked;
  const markedWithoutFile = (trackerMarked || saved) && !ready;

  async function mark() {
    if (busy || settled || saved) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pdf-ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: String(reportNum) }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "PDF konnte nicht als bereit markiert werden.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("PDF konnte nicht als bereit markiert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      {markedWithoutFile ? (
        <span className={`${PILL} border-border text-muted`}>Tracker markiert</span>
      ) : (
        <button
          type="button"
          onClick={mark}
          disabled={busy || settled || saved}
          className={
            settled
              ? `${PILL} border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400`
              : `${PILL} border-border text-muted hover:border-brand/40 hover:text-brand-text`
          }
        >
          {settled && <Check className="size-3.5" />}
          {busy ? "Speichert …" : settled ? "PDF bereit" : saved ? "Tracker markiert" : "PDF als bereit markieren"}
        </button>
      )}
      {markedWithoutFile && (
        <span className="text-xs text-muted">Erstellen Sie den angepassten Lebenslauf für diesen Bericht. Erneutes Markieren im Tracker fügt diese Datei nicht hinzu.</span>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
