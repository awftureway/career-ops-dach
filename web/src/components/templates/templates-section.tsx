"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { TemplateEditor } from "@/components/templates/template-editor";
import { editLocks, editingAfterReload, latestOnly, loadFailureView, pendingAfterReload, settleChoice } from "@/lib/templates-state.mjs";

// The CV templates the core resolves, each shown filled with a fictional resume
// so the design is visible before it is chosen. Choosing one writes cv.template
// in config/profile.yml, the key the CLI reads, so web and CLI agree.

type Template = { name: string; displayName: string; layer: "user" | "system"; isDefault: boolean };
type Pending = { name: string; mode: "duplicate" | "rename" | "delete" };

// Matches isValidTemplateName() on the server, which stays the authority.
const NAME_HINT = "Kleinbuchstaben und Ziffern, verbunden durch einzelne Bindestriche.";

const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;
const THUMB_WIDTH = 200;

const COPY = {
  cv: { id: "cv-templates-heading", title: "Lebenslauf-Vorlagen", note: "Die Vorschauen zeigen einen erfundenen Lebenslauf, nicht Ihren. Die Standardvorlage gilt für neue Lebensläufe." },
  cover: { id: "cover-templates-heading", title: "Anschreiben-Vorlagen", note: "Die Vorschauen zeigen ein erfundenes Anschreiben, nicht Ihres. Die Standardvorlage gilt für neue Anschreiben." },
} as const;

export function TemplatesSection({ kind = "cv" }: { kind?: "cv" | "cover" }) {
  const copy = COPY[kind];
  const [templates, setTemplates] = useState<Template[] | null>(null);
  // false: fine. "replace": the error stands in for the list. "alongside": the
  // list is current, so it stays and the error sits beside it.
  const [loadError, setLoadError] = useState<false | "replace" | "alongside">(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  // Bumped after a save so the card previews fetch the edited template.
  const [rev, setRev] = useState(0);

  // One guard per mounted section: a response applies only if its load is the
  // newest, and none applies after unmount.
  const guardRef = useRef(latestOnly());
  // Whether a list has ever loaded, read by a failing reload. Set from the load
  // handler, not during render.
  const hasListRef = useRef(false);
  // The Edit button that opened the editor, so closing it puts focus back there.
  const returnFocus = useRef<HTMLElement | null>(null);

  const load = useCallback((listIsCurrent = false) => {
    setLoadError(false);
    const current = guardRef.current();
    fetch(`/api/templates?kind=${kind}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        if (!current()) return;
        const list: Template[] = Array.isArray(d?.templates) ? d.templates : [];
        setTemplates(list);
        hasListRef.current = true;
        setPending((p) => pendingAfterReload(p, list));
        setEditing((e) => editingAfterReload(e, list));
      })
      .catch(() => {
        if (current()) setLoadError(loadFailureView(listIsCurrent, hasListRef.current));
      });
  }, [kind]);
  useEffect(() => {
    const guard = guardRef.current;
    load();
    return () => guard.stop();
  }, [load]);

  const choose = async (name: string) => {
    setBusy(name);
    setError(null);
    await settleChoice(
      async () => {
        const res = await fetch("/api/templates/default", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, kind }),
        });
        const j = await res.json().catch(() => ({}));
        return { ok: res.ok, error: typeof j.error === "string" ? j.error : undefined };
      },
      {
        applied: () => setTemplates((prev) => prev && prev.map((t) => ({ ...t, isDefault: t.name === name }))),
        // The list shown now is already right, so a failed reload must not hide it.
        reload: () => load(true),
        failed: setError,
      },
    );
    setBusy(null);
  };

  // Duplicate, rename and delete share one round trip: post, then reload the list
  // so the card set, defaults and layers all come from the server.
  const manage = async () => {
    if (!pending) return;
    setBusy(pending.name);
    setError(null);
    const body =
      pending.mode === "duplicate" ? { kind, from: pending.name, name: draft.trim() }
      : pending.mode === "rename" ? { kind, name: pending.name, to: draft.trim() }
      : { kind, name: pending.name };
    try {
      const res = await fetch(`/api/templates/${pending.mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setError(typeof j.error === "string" ? j.error : "Speichern nicht möglich.");
      else {
        setPending(null);
        setDraft("");
      }
      if (res.ok || res.status === 409) load();
    } catch {
      setError("Speichern nicht möglich.");
    }
    setBusy(null);
  };

  const ask = (name: string, mode: Pending["mode"]) => {
    setError(null);
    setPending({ name, mode });
    setDraft("");
  };

  return (
    <section aria-labelledby={copy.id} className="mt-8">
      <h2 id={copy.id} className="text-base font-semibold">
        {copy.title}
      </h2>
      <p className="mt-1 text-sm text-muted">{copy.note}</p>
      <p id={`${copy.id}-hint`} className="sr-only">
        {NAME_HINT}
      </p>

      {loadError === "replace" ? (
        <p role="alert" className="mt-3 text-sm text-red-500">
          Die Vorlagen konnten nicht geladen werden.{" "}
          <button type="button" className="underline" onClick={() => load(false)}>
            Erneut versuchen
          </button>
        </p>
      ) : templates === null ? (
        <Loader2 className="mt-3 size-4 animate-spin text-muted" aria-label="Vorlagen werden geladen" />
      ) : (
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {templates.map((t) => (
            <li key={t.name} className="rounded-xl border border-border bg-surface/40 p-3">
              <Thumb key={`${t.name}-${rev}`} kind={kind} name={t.name} title={`Vorschau von ${t.displayName}`} />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{t.displayName}</span>
                {t.isDefault ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Check className="size-3" aria-hidden /> Standard
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => choose(t.name)}
                    className={cn("rounded-md border border-border px-2 py-1 text-xs hover:bg-surface", busy !== null && "opacity-60")}
                  >
                    {busy === t.name ? "Speichert …" : "Als Standard festlegen"}
                  </button>
                )}
              </div>
              {pending?.name === t.name ? (
                <form
                  className="mt-2 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void manage();
                  }}
                >
                  {pending.mode === "delete" ? (
                    <p className="text-xs">{t.displayName} löschen? Das entfernt die zugehörige Datei.</p>
                  ) : (
                    <input
                      autoFocus
                      disabled={busy !== null}
                      aria-label={pending.mode === "rename" ? "Neuer Name" : "Name für die Kopie"}
                      aria-describedby={`${copy.id}-hint`}
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        setError(null);
                      }}
                      placeholder={pending.mode === "rename" ? "neuer-name" : "kopie-name"}
                      className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs"
                    />
                  )}
                  <div className="flex gap-2">
                    <button type="submit" disabled={busy !== null} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface">
                      {busy === t.name ? "Arbeitet …" : pending.mode === "delete" ? "Löschen" : pending.mode === "rename" ? "Umbenennen" : "Duplizieren"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        setPending(null);
                        setError(null);
                      }}
                      className="rounded-md px-2 py-1 text-xs underline disabled:opacity-60"
                    >
                      Abbrechen
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-2 flex gap-3 text-xs">
                  <button type="button" disabled={busy !== null} onClick={() => ask(t.name, "duplicate")} className="underline">
                    Duplizieren
                  </button>
                  {t.layer === "user" && (
                    <>
                      <button type="button" disabled={busy !== null || editLocks(editing, t.name).edit} title={editLocks(editing, t.name).edit ? "Schließen Sie zuerst den geöffneten Editor" : undefined} onClick={(e) => {
                          returnFocus.current = e.currentTarget;
                          setEditing(t.name);
                        }} className="underline">
                        Bearbeiten
                      </button>
                      <button type="button" disabled={busy !== null || editLocks(editing, t.name).rename} title={editLocks(editing, t.name).rename ? "Schließen Sie zuerst den Editor" : undefined} onClick={() => ask(t.name, "rename")} className="underline">
                        Umbenennen
                      </button>
                      <button type="button" disabled={busy !== null || t.isDefault || editLocks(editing, t.name).remove} title={t.isDefault ? "Legen Sie zuerst eine andere Vorlage als Standard fest" : editLocks(editing, t.name).remove ? "Schließen Sie zuerst den Editor" : undefined} onClick={() => ask(t.name, "delete")} className="underline">
                        Löschen
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {loadError === "alongside" && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          Die Vorlagen konnten nicht aktualisiert werden; die Liste oben ist möglicherweise veraltet.{" "}
          <button type="button" className="underline" onClick={() => load(true)}>
            Erneut versuchen
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {error}
        </p>
      )}
      {editing && templates?.some((t) => t.name === editing) && (
        <TemplateEditor
          key={editing}
          kind={kind}
          name={editing}
          title={templates.find((t) => t.name === editing)?.displayName ?? editing}
          onClose={() => {
            setEditing(null);
            returnFocus.current?.focus();
            returnFocus.current = null;
          }}
          onSaved={() => setRev((n) => n + 1)}
        />
      )}
    </section>
  );
}

// One template filled with the sample resume. The page is fetched and handed to
// the frame as srcDoc (as the CV Studio preview does) rather than loaded by URL,
// and only once the card scrolls into view, since each preview is a render.
function Thumb({ kind, name, title }: { kind: "cv" | "cover"; name: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setVisible(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    fetch(`/api/templates/preview?kind=${kind}&name=${encodeURIComponent(name)}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((h) => live && setHtml(h))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [visible, kind, name]);

  return (
    <div
      ref={box}
      className="relative overflow-hidden rounded-md bg-white shadow-sm"
      style={{ width: THUMB_WIDTH, height: (PAGE_HEIGHT * THUMB_WIDTH) / PAGE_WIDTH }}
    >
      {failed && <p className="p-3 text-xs text-neutral-500">Vorschau nicht verfügbar.</p>}
      {html !== null && (
        <iframe
          title={title}
          srcDoc={html}
          sandbox=""
          tabIndex={-1}
          style={{
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            border: 0,
            transform: `scale(${THUMB_WIDTH / PAGE_WIDTH})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
