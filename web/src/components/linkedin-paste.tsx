"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ImportResult = {
  added?: number;
  already?: number;
  found?: number;
  message?: string;
  error?: string;
  uncertain?: boolean;
};

export function LinkedInPaste() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(body: string) {
    const trimmed = body.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/linkedin-import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: body }),
      });
      const data = (await response.json()) as ImportResult;
      const saved = (data.added ?? 0) > 0;
      if (saved || data.uncertain) {
        if (saved) setText((current) => (current === body ? "" : current));
        router.refresh();
      }
      if (!response.ok || data.error) {
        setError(data.message || "Die Stellen konnten nicht hinzugefügt werden. Es wurde nichts gespeichert.");
        return;
      }
      setMessage(data.message || "");
    } catch {
      setError("Die Stellen konnten nicht hinzugefügt werden. Es wurde nichts gespeichert.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface/40 p-5" aria-label="LinkedIn-Job-Alerts">
      <h2 className="text-sm font-medium text-foreground">LinkedIn-Job-Alerts</h2>
      <p className="mt-1 max-w-xl text-sm text-muted">
        Öffnen Sie einen LinkedIn-Job-Alert. Alles markieren, kopieren und hier einfügen. CareerOps legt die Stellen in Ihrem Pipeline-Posteingang ab. Ein Google-Konto ist nicht nötig.
      </p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        placeholder="Alert-E-Mail oder eine Liste von LinkedIn-Stellenlinks einfügen"
        className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void submit(text)}
          disabled={busy || !text.trim()}
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-200 disabled:opacity-50"
        >
          {busy ? "Wird hinzugefügt …" : "Diese Stellen hinzufügen"}
        </button>
        <label className="cursor-pointer text-sm text-muted">
          Oder gespeicherte E-Mail wählen
          <input
            type="file"
            accept=".eml,.txt,.mbox,text/plain,message/rfc822"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void file.text().then(
                (contents) => {
                  setText(contents);
                  return submit(contents);
                },
                () => {
                  setMessage("");
                  setError("Die Datei konnte nicht gelesen werden. Kopieren Sie den E-Mail-Text und fügen Sie ihn hier ein.");
                },
              );
            }}
          />
        </label>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm text-foreground">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
