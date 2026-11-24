"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { PROFILE_CADENCE_KEYS, type ProfileCadenceKey } from "@/lib/followups";
import { cn } from "@/lib/cn";

// Follow-up cadence knobs → config/profile.yml (followup_cadence). Server-
// persisted (unlike the localStorage engine prefs above) because the core
// followup-cadence.mjs reads the same keys — the CLI and the web must agree.

const FIELDS: { key: ProfileCadenceKey; label: string; hint: string }[] = [
  { key: "applied_first_days", label: "Erstes Nachfassen", hint: "Tage nach der Bewerbung, bis das 1. Nachfassen fällig ist" },
  { key: "applied_subsequent_days", label: "Zwischen Nachfassen", hint: "Tage zwischen Erinnerungen im Status Applied" },
  { key: "applied_max_followups", label: "Max. Nachfassen", hint: "nach so vielen Nachfassen ohne Antwort gilt der Kontakt als erkaltet" },
  { key: "responded_initial_days", label: "Antwortfrist", hint: "Antwort der Firma innerhalb dieser Tage beantworten" },
  { key: "responded_subsequent_days", label: "Takt bei Responded / Assessment", hint: "Tage zwischen Kontakten im Status Responded oder Assessment" },
  { key: "interview_thankyou_days", label: "Dankesnachricht", hint: "fällig innerhalb dieser Tage nach Erreichen von Interview" },
];

export function CadenceSettings() {
  const router = useRouter();
  const [values, setValues] = useState<Record<ProfileCadenceKey, string> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [revision, setRevision] = useState<string | null>(null);
  const writePending = useRef(false);

  // On a failed load, do NOT fall back to defaults: the user would see 7/7/2/…
  // with no warning and a Save would overwrite their real profile.yml
  // overrides. Show an error + Retry instead.
  const load = useCallback(() => {
    setLoadError(false);
    fetch("/api/followups/cadence")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        // `effective` is already defaults+overrides, computed server-side from
        // the CORE's cadenceDefaults (#2369) — no local defaults table to merge
        // in. A key the core didn't supply renders empty rather than as an
        // invented number.
        setEnabled(d?.enabled !== false);
        setRevision(typeof d?.revision === "string" && d.revision ? d.revision : null);
        const eff = (d?.effective ?? {}) as Partial<Record<ProfileCadenceKey, number>>;
        setValues(Object.fromEntries(
          PROFILE_CADENCE_KEYS.map((k) => [k, eff[k] === undefined ? "" : String(eff[k])]),
        ) as Record<ProfileCadenceKey, string>);
      })
      .catch(() => setLoadError(true));
  }, []);
  useEffect(load, [load]);

  const save = async () => {
    if (!values || writePending.current) return;
    const payload: Partial<Record<ProfileCadenceKey, number>> = {};
    for (const k of PROFILE_CADENCE_KEYS) {
      // Number(), not parseInt(): "3.5" and "7abc" must be rejected, not truncated.
      const raw = values[k].trim();
      const n = raw === "" ? Number.NaN : Number(raw);
      if (!Number.isInteger(n) || n < 0) {
        setError(`„${FIELDS.find((f) => f.key === k)?.label}" muss eine ganze Zahl ≥ 0 sein.`);
        return;
      }
      payload[k] = n;
    }
    writePending.current = true;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/followups/cadence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(revision ? { ...payload, revision } : payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaved(false);
        setError(typeof j.error === "string" ? j.error : "Speichern fehlgeschlagen.");
        if (res.status === 409) load();
      } else {
        if (typeof j.revision === "string" && j.revision) setRevision(j.revision);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError("Speichern fehlgeschlagen.");
    }
    writePending.current = false;
    setSaving(false);
  };

  const toggle = async (next: boolean) => {
    if (writePending.current) return;
    writePending.current = true;
    setToggling(true);
    setError(null);
    try {
      const res = await fetch("/api/followups/cadence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Same revision check as save(). Without it a stale toggle skips the
        // conflict check, and a toggle that lands leaves the form holding the
        // old revision, so the next cadence save is refused.
        body: JSON.stringify(revision ? { enabled: next, revision } : { enabled: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Speichern fehlgeschlagen.");
        if (res.status === 409) load();
      } else {
        if (typeof j.revision === "string" && j.revision) setRevision(j.revision);
        setEnabled(next);
        // The nav is rendered on the server from the same setting. A router
        // refresh re-renders it without unloading running jobs.
        router.refresh();
      }
    } catch {
      setError("Speichern fehlgeschlagen.");
    }
    writePending.current = false;
    setToggling(false);
  };

  return (
    <div>
      <label className="mt-8 mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        Nachfass-Takt
      </label>
      <div className="rounded-xl border border-border bg-surface/50 p-4">
        <p className="text-xs leading-relaxed text-faint">
          Wann der <span className="text-muted">Nachfass</span>-Tracker Sie erinnert. Gespeichert in{" "}
          <span className="font-mono text-muted">config/profile.yml</span> – die CLI nutzt dieselben Werte.
        </p>
        {loadError ? (
          <div className="mt-3 text-sm text-muted">
            <p className="text-red-500">
              Die aktuellen Takt-Einstellungen konnten nicht gelesen werden – Standardwerte werden nicht angezeigt, um echte Werte in{" "}
              <span className="font-mono">config/profile.yml</span>{" "}
              nicht zu überschreiben.
            </p>
            <button
              type="button"
              onClick={load}
              className="mt-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-hover"
            >
              Erneut versuchen
            </button>
          </div>
        ) : values === null ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> Lädt …
          </div>
        ) : (
          <>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={enabled}
                disabled={toggling || saving}
                onChange={(e) => toggle(e.target.checked)}
                className="size-4 accent-brand"
              />
              Nachfassen verfolgen
              {toggling && <Loader2 className="size-3.5 animate-spin" />}
            </label>
            <p className="mt-0.5 text-xs text-faint">
              Aus blendet die Nachfass-Seite aus und plant keine Nachfass-Termine mehr. Gespeichert als{" "}
              <span className="font-mono text-muted">follow_ups.enabled</span>.
            </p>
            {enabled && (
              <>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {FIELDS.map((f) => (
                    <label key={f.key} className="block">
                      <span className="block text-sm font-medium text-foreground">{f.label}</span>
                      <span className="mt-0.5 block text-xs text-faint">{f.hint}</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={values[f.key]}
                        onChange={(e) => setValues((v) => (v ? { ...v, [f.key]: e.target.value } : v))}
                        className="mt-1.5 w-24 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-sm tabular-nums outline-none transition-colors focus:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/40"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || toggling}
                  className={cn(
                    "mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-hover",
                    "disabled:pointer-events-none disabled:opacity-60",
                  )}
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : saved ? <Check className="size-3.5 text-emerald-400" /> : null}
                  {saved ? "Gespeichert" : "Takt speichern"}
                </button>
              </>
            )}
            {error && <p role="alert" className="mt-3 text-xs text-red-500">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
