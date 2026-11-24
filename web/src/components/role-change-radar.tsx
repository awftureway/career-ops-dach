"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Capture = { text: string; hash: string; capturedAt: string | null; source: string; basis?: string; chronologyUncertain?: boolean };
type Excerpt = { text: string; start: number; end: number } | null;
type Comparison = { id: string; captureHash: string; source: string; checkedAt: string; reviewedAt: string | null; warnings: string[]; changes: { categories: string[]; summary: string; before: Excerpt; after: Excerpt }[] };
type State = { baseline: Capture | null; captures: Capture[]; comparisons: Comparison[]; lastCheck: { at: string; status: string; error?: string } | null };
const date = (value: string | null) => value ? new Date(value).toLocaleString("de-DE") : "Erfassungsdatum unbekannt";

export function RoleChangeRadar({ id, company, title }: { id: string; company: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [source, setSource] = useState("public");
  const [text, setText] = useState("");
  const [selected, setSelected] = useState("");
  async function act(action: string, comparisonId?: string) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/role-change-radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, source, text, comparisonId }) });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Prüfung nicht möglich");
      setState(data);
      if (action !== "review") setSelected(data.comparisons.at(-1)?.id || "");
      setNotice(action === "load" ? "Gespeicherte Ergebnisse werden angezeigt. Es lief keine neue Prüfung." : action === "review" ? "Vergleich als geprüft markiert." : data.lastCheck?.status === "success" ? `Prüfung abgeschlossen ${date(data.lastCheck.at)}.` : data.lastCheck?.status === "baseline-saved" ? "Basis für künftige Prüfungen gespeichert." : "");
    } catch (err) { setError(err instanceof Error ? err.message : "Prüfung nicht möglich"); }
    finally { pending.current = false; setBusy(false); }
  }
  const comparison = state?.comparisons.find(c => c.id === selected);
  const latest = state?.captures.find(c => c.hash === comparison?.captureHash && c.source === comparison?.source);
  const failure = error || (state?.lastCheck?.status === "failed" ? state.lastCheck.error : "");
  return <section className="my-6 rounded-xl border border-border bg-surface p-4 print:hidden" aria-labelledby="radar-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="radar-title" className="font-display text-xl">Rollen-Änderungsradar</h2>
      <Button variant="outline" disabled={busy} aria-expanded={open} aria-controls="radar-panel" onClick={() => { setOpen(!open); if (!open) void act("load"); }}>Auf Änderungen prüfen</Button>
    </div>
    {open && <div id="radar-panel" className="mt-4 space-y-4" aria-busy={busy}>
      <p className="text-sm text-muted">{title} · {company}</p>
      <p role="status" className="text-sm">{busy ? "Prüft …" : notice}</p>
      {failure && <div role="alert" className="rounded-md border border-border p-3 text-sm"><p>{failure}</p><p>Fügen Sie die vollständige Stellenanzeige ein. Eine nicht erreichbare Anzeige beweist nicht, dass die Stelle geschlossen wurde.</p>{comparison && <p className="font-medium">Unten sehen Sie das letzte erfolgreiche Ergebnis; es ist keine neue Prüfung.</p>}</div>}
      {state && <>
        {state.baseline ? <div className="text-sm text-muted"><p>{state.baseline.basis} · {date(state.baseline.capturedAt)}</p><p className="break-words">Quelle: {state.baseline.source}</p>{state.baseline.chronologyUncertain && <p>Einige Archivdaten sind unbekannt; die zeitliche Reihenfolge lässt sich nicht sicher bestimmen. Dies ist kein geprüfter Stand zum Zeitpunkt der Bewerbung.</p>}</div> : <p>Keine Basis vorhanden. Ein Verlaufsvergleich ist nicht möglich. Speichern Sie die aktuelle Beschreibung als Basis für künftige Prüfungen.</p>}
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-2 text-sm font-medium">Quelle der aktuellen Beschreibung</legend>
          <label className="mr-4 inline-flex items-center gap-2 text-sm"><input type="radio" name={`radar-source-${id}`} checked={source === "public"} onChange={() => setSource("public")} />Öffentliche Stellenanzeige abrufen</label>
          <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name={`radar-source-${id}`} checked={source === "paste"} onChange={() => setSource("paste")} />Text einfügen</label>
          {source === "paste" && <div><label htmlFor="radar-text" className="block text-sm">Vollständige aktuelle Stellenbeschreibung</label><textarea id="radar-text" value={text} onChange={e => setText(e.target.value)} maxLength={59999} rows={8} className="mt-2 w-full rounded-md border border-border bg-background p-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-brand" /><p className="text-xs text-muted">Vom Nutzer eingegebener Text wird nicht unabhängig geprüft. Bestätigen Sie, dass er zu dieser Stelle gehört. Mindestens 100 Zeichen.</p></div>}
          <Button disabled={busy || (source === "paste" && text.trim().length < 100)} onClick={() => void act(state.baseline ? "check" : "baseline")}>{state.baseline ? "Mit Basis vergleichen" : "Aktuelle Beschreibung als Basis speichern"}</Button>
        </fieldset>
        {state.baseline && !comparison && <p className="text-sm">Bereit zur Prüfung. Die gesicherte Basis wird nicht überschrieben.</p>}
        {!!state.comparisons.length && <div><label htmlFor="radar-history" className="block text-sm">Vergleichsverlauf</label><select id="radar-history" value={selected} onChange={e => setSelected(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm">{[...state.comparisons].reverse().map(c => <option key={c.id} value={c.id}>{date(c.checkedAt)} · {c.changes.length} Änderungen · {c.reviewedAt ? "Geprüft" : "Ungeprüft"}</option>)}</select></div>}
        {comparison && latest && <div className="space-y-3">
          <h3 className="font-medium">{comparison.changes.length ? `${comparison.changes.length} geänderte Passagen` : "Keine Textänderungen erkannt"}</h3>
          <p className="break-words text-sm text-muted">Letzte Erfassung: {date(latest.capturedAt)} · {latest.source}</p>
          <p className="text-sm text-muted">Vergleich: {date(comparison.checkedAt)} · {comparison.reviewedAt ? `Geprüft ${date(comparison.reviewedAt)}` : "Ungeprüft"}</p>
          {comparison.warnings.map(w => <p key={w} className="text-sm">{w}</p>)}
          {[...new Set(comparison.changes.flatMap(c => c.categories))].map(category => <section key={category} aria-label={category} className="space-y-2"><h4 className="font-medium">{category}</h4>{comparison.changes.map((change, index) => change.categories.includes(category) && <div key={index} className="rounded-md border border-border p-3 text-sm"><p className="mb-2 font-medium">{change.summary}</p><div className="grid gap-3 sm:grid-cols-2">{(["before", "after"] as const).map(side => <div key={side}><p className="text-xs text-muted">{side === "before" ? "Vorher" : "Nachher"}{change[side] ? ` · Zeichen ${change[side]!.start}–${change[side]!.end}` : ""}</p><pre className="whitespace-pre-wrap break-words font-sans">{change[side]?.text || "In dieser Passage nicht angegeben"}</pre></div>)}</div></div>)}</section>)}
          <details className="rounded-md border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Vollständiger Textvergleich</summary><div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2"><div className="min-w-0"><h4 className="text-sm font-medium">Basis</h4><pre className="whitespace-pre-wrap break-words text-sm font-sans">{state.baseline?.text}</pre></div><div className="min-w-0"><h4 className="text-sm font-medium">Aktuell</h4><pre className="whitespace-pre-wrap break-words text-sm font-sans">{latest.text}</pre></div></div></details>
          <Button variant="outline" disabled={busy || !!comparison.reviewedAt} onClick={() => void act("review", comparison.id)}>{comparison.reviewedAt ? "Geprüft" : "Vergleich als geprüft markieren"}</Button>
        </div>}
      </>}
    </div>}
  </section>;
}
