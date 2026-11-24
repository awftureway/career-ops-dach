"use client";

import { Loader2, Wand2, Asterisk, Paperclip, Sparkles, ArrowUpRight, ShieldCheck, RotateCcw, FileCheck2, AlertTriangle, Terminal, Check, ScanLine, PenLine, CheckCircle2, Info, ExternalLink, MousePointerClick, ArrowLeft, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApplyIssue, DriveStep } from "@/lib/apply/issue";
import { useApply } from "@/components/apply/apply-provider";
import { needsLeaveConfirmation, resolveReturnPath } from "@/lib/apply/exit.mjs";
import { markAppliedEnabled } from "@/lib/apply/mark-applied.mjs";
import { showPrefilledBanner } from "@/lib/apply/prefilled-banner.mjs";
import { reopenApplyOptions } from "@/lib/apply/reopen-options.mjs";
import { checklistHrefFor } from "@/lib/apply/checklist-href.mjs";
import { resumeFieldNotice } from "@/lib/apply/handoff-gate.mjs";
import type { ApplyField } from "@/lib/apply/extract";
import { cn } from "@/lib/cn";
import { Fragment, useEffect, useId, useRef, useState } from "react";

// Co-located UI animations (HMR-proof vs Tailwind v4's stale globals.css):
// field cascade-in, per-field "just drafted" flash, skeleton shimmer, hero orb.
const STYLE = `
@keyframes co-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.co-rise{animation:co-rise .55s cubic-bezier(.22,1,.36,1) both}
@keyframes co-flash{0%{box-shadow:0 0 0 0 hsl(26 82% 55% / 0)}22%{box-shadow:0 0 0 3px hsl(26 82% 55% / .38)}100%{box-shadow:0 0 0 0 hsl(26 82% 55% / 0)}}
.co-flash{animation:co-flash 1.15s ease both;border-radius:.6rem}
@keyframes co-shim{0%{background-position:-200% 0}100%{background-position:200% 0}}
.co-skel{background:linear-gradient(90deg, color-mix(in srgb,var(--fg) 5%, transparent) 25%, color-mix(in srgb,var(--fg) 12%, transparent) 37%, color-mix(in srgb,var(--fg) 5%, transparent) 63%);background-size:200% 100%;animation:co-shim 1.6s linear infinite;border-radius:.5rem}
@keyframes co-orb{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.35);opacity:.9}}
.co-orb{animation:co-orb 2.4s ease-in-out infinite}
@keyframes co-spin{to{transform:rotate(360deg)}}
.co-ring{animation:co-spin 3s linear infinite}
@media (prefers-reduced-motion: reduce){.co-rise,.co-flash,.co-skel,.co-orb,.co-ring{animation:none}}
`;

// The form-proxy UI: the real employer form is opened headlessly on the user's
// machine and re-rendered here in plain language, pre-filled from their CV. The
// user verifies every answer, then we fill the real form behind the scenes and
// bring it to the front for them to submit. We never submit.
export function ApplyView() {
  const a = useApply();
  const [input, setInput] = useState("");

  if (a.status === "idle" || a.status === "error") {
    return (
      <div>
        <div className="flex max-w-2xl items-center gap-2 rounded-full border border-border bg-surface/70 py-1.5 pl-4 pr-1.5 shadow-sm transition focus-within:border-brand/50 focus-within:shadow-md">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && a.open(input.trim(), reopenApplyOptions(input.trim(), a))}
            placeholder="URL eines Bewerbungsformulars einfügen (Ashby, Lever, Greenhouse …)"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-faint"
          />
          <button
            onClick={() => a.open(input.trim(), reopenApplyOptions(input.trim(), a))}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-200"
          >
            <Wand2 className="size-4" /> Formular lesen
          </button>
        </div>
        {a.blockedAts ? (
          <div className="mt-4 max-w-2xl rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-sm text-amber-800 dark:text-amber-300">{a.blockedAts.message}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {a.blockedAts.postingUrl ? (
                    <a href={a.blockedAts.postingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-text hover:underline">
                      Stellenanzeige öffnen <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                  {a.blockedAts.checklistHref ? (
                    <Link href={a.blockedAts.checklistHref} className="inline-flex items-center gap-1 text-xs font-medium text-brand-text hover:underline">
                      Lebenslauf-Pfad und Antworten
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : a.error ? (
          <div className="mt-4 max-w-2xl rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-sm text-amber-800 dark:text-amber-300">{a.error}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {a.url && /^https?:\/\//.test(a.url) && (
                    <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-text hover:underline">
                      Formular direkt öffnen <ExternalLink className="size-3" />
                    </a>
                  )}
                  {checklistHrefFor(a.n) && (
                    <Link href={checklistHrefFor(a.n) ?? ""} className="inline-flex items-center gap-1 text-xs font-medium text-brand-text hover:underline">
                      Lebenslauf-Pfad und Antworten
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {/* A session that failed still has a row and an origin behind it, so the
            way back and the way to record it must survive the failure. */}
        {a.status === "error" && <ApplyExitBar />}
      </div>
    );
  }

  const opening = a.status === "opening";
  const driving = a.status === "driving";
  const prefilling = a.status === "prefilling";
  const filling = a.status === "filling";
  const done = a.status === "done";
  const prefilled = showPrefilledBanner(a.status, a.issues);
  const busy = opening || driving;
  const phase = busy ? 0 : prefilling ? 1 : 2;

  return (
    <div className="mx-auto max-w-2xl">
      <style>{STYLE}</style>

      {/* journey: Read → Draft → Review */}
      <PhaseRail phase={phase} />

      {!busy && (
        <div className="co-rise mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl text-landing drop-shadow-sm">{a.title || "Bewerbung"}</h2>
          <button onClick={a.reset} className="inline-flex items-center gap-1 text-xs text-faint transition-colors hover:text-foreground">
            <RotateCcw className="size-3" /> neu
          </button>
        </div>
      )}

      {/* opening: big magic hero + skeleton fields (no layout jump when real ones arrive) */}
      {opening && (
        <>
          <ProcessingHero title="Formular wird gelesen …" subtitle="Die echte Bewerbung wird auf Ihrem Rechner geöffnet und jedes Feld gelesen." />
          <FieldSkeleton />
        </>
      )}

      {/* driving: watch the agent reach the form live (it navigates, never submits) */}
      {driving && <DrivePanel steps={a.driveSteps} />}

      {a.error && (
        <p className="co-rise mb-3 flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 backdrop-blur-sm dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {a.error}
        </p>
      )}

      {!busy && (
        <div className="co-rise">
          <ApplyIssues issues={a.issues} />
          {/* drafting banner while the planner writes the answers */}
          {prefilling && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft/60 px-4 py-3 backdrop-blur-sm">
              <span className="relative grid size-8 shrink-0 place-items-center">
                <span className="co-orb absolute inset-0 rounded-full bg-brand/40 blur-[6px]" />
                <Sparkles className="size-4 text-brand-text" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Ihre Antworten werden entworfen …</div>
                <RotatingStatus />
              </div>
              <Loader2 className="ml-auto size-4 shrink-0 animate-spin text-brand-text" />
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={a.prefill}
              disabled={prefilling || filling}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-soft px-3.5 py-1.5 text-sm font-medium text-brand-text transition-colors hover:bg-brand/15 disabled:opacity-50"
            >
              {prefilling ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {prefilling ? "Entwurf aus Ihrem Lebenslauf …" : "Aus meinem Lebenslauf vorausfüllen"}
            </button>
            <span className="text-xs text-muted">… oder bitten Sie den Assistenten in der Ecke, eine Antwort zu schreiben oder zu überarbeiten.</span>
          </div>

          {(prefilling || a.prefillLog.length > 0) && (
            <details className="mb-4 rounded-lg border border-border bg-surface/60 backdrop-blur-sm" open={false}>
              <summary className="flex cursor-pointer select-none items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted">
                <Terminal className="size-3.5" /> Diagnose zum Vorausfüllen
                {prefilling && <Loader2 className="size-3 animate-spin text-brand-text" />}
                <span className="ml-auto text-faint">{a.prefillLog.length} Schritte</span>
              </summary>
              <div className="max-h-52 overflow-y-auto border-t border-border px-3 py-2">
                <ol className="space-y-0.5 font-mono text-[11px] leading-relaxed text-muted">
                  {a.prefillLog.map((l, i) => (
                    <li key={i} className={l.startsWith("✗") ? "text-amber-800 dark:text-amber-400" : ""}>
                      {l}
                    </li>
                  ))}
                  {prefilling && <li className="text-faint">…</li>}
                </ol>
              </div>
            </details>
          )}

          {/* the questions — float on the blurred form image, cascade in, each
              flashes brand-orange the instant its drafted answer lands */}
          <div className="space-y-1 rounded-2xl border border-border/70 bg-surface/80 p-2 shadow-2xl shadow-black/10 backdrop-blur-md sm:p-3">
            {a.fields.map((f, i) => (
              <div key={f.id} className="co-rise rounded-xl px-3 py-2.5" style={{ animationDelay: `${Math.min(i * 45, 700)}ms` }}>
                <FieldRow
                  field={f}
                  value={a.answers[f.id] ?? ""}
                  needs={!!a.meta[f.id]?.needsConfirmation}
                  reason={a.meta[f.id]?.reason}
                  index={i}
                  drafting={prefilling}
                  cvAttached={a.cvAttached}
                  onChange={(v) => a.setAnswer(f.id, v)}
                />
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={a.fill}
              disabled={filling || prefilling}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground shadow-lg shadow-brand/25 transition-all hover:bg-brand-200 hover:shadow-brand/40 disabled:opacity-50"
            >
              {filling ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
              {filling ? "Echtes Formular wird ausgefüllt …" : "Echtes Formular ausfüllen und prüfen"}
            </button>
            <button
              onClick={a.agentFill}
              disabled={filling || prefilling}
              title="Die KI bedient das echte Formular und füllt es Feld für Feld aus (für knifflige oder mehrstufige Formulare). Sie sendet nie ab."
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:border-brand/40 hover:text-brand-text disabled:opacity-50"
            >
              <MousePointerClick className="size-4" /> KI ausfüllen lassen
            </button>
            <p className="inline-flex items-center gap-1.5 text-xs text-muted">
              <ShieldCheck className="size-3.5 text-emerald-500" /> Sendet nie ab – Sie klicken selbst auf Absenden.
            </p>
          </div>

          {/* agent filling the form live (full-agent escalation) */}
          {filling && a.driveSteps.length > 0 && <div className="mt-6"><DrivePanel steps={a.driveSteps} filling /></div>}

          {(filling || done) && a.steps.length > 0 && (
            <div className="co-rise mt-6">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Hinter den Kulissen</div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {a.steps.map((s, i) => (
                  <figure key={i} className="shrink-0">
                    {s.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.thumb} alt="" className="h-24 w-36 rounded-md border border-border object-cover" />
                    ) : (
                      <div className="flex h-24 w-36 items-center justify-center rounded-md border border-dashed border-border text-faint">…</div>
                    )}
                    <figcaption className={cn("mt-1 w-36 truncate text-[10px]", s.ok ? "text-faint" : "text-amber-500")}>{s.label || "Feld"}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
          {prefilled && (
            <div className="co-rise mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm backdrop-blur-sm">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
              <div>
                <span className="font-medium text-emerald-800 dark:text-emerald-400">Das echte Formular ist jetzt vorn und vorausgefüllt.</span>{" "}
                <span className="text-muted">Prüfen Sie es und klicken Sie selbst auf Absenden – career-ops sendet nie für Sie ab.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* the way out: back out of the form, or record that you sent it */}
      <ApplyExitBar />
    </div>
  );
}

// ── Leaving the page: back out, or record that you applied ─────────────────
// You submit the real form yourself on the employer's site, so the moment you
// apply happens outside career-ops — this is where you tell the tracker about
// it. The write goes through /api/status, the same route the tracker's own
// status control uses, so there is only ever one writer to the table.
function ApplyExitBar() {
  const a = useApply();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");
  // The status write outlives this bar when the user navigates while it is in
  // flight. The write still lands; what must not happen is dragging them back
  // off whatever page they moved on to once it returns.
  // Set on mount as well as cleared on unmount: React re-runs an effect after
  // its cleanup (StrictMode does this on every mount in development), so a
  // cleanup-only flag latches false while the bar is still on screen.
  const onPage = useRef(true);
  useEffect(() => {
    onPage.current = true;
    return () => {
      onPage.current = false;
    };
  }, []);

  // reset() also closes the headless form session on the user's machine —
  // navigating away without it strands the browser this page opened. The
  // destination is read before reset() clears the origin it comes from.
  //
  // The staleness check comes FIRST, before reset(). By the time a late status
  // response gets here the user may have started a different application, and
  // reset() is not addressed to a particular session: it would close whichever
  // one is open now, taking a form the user is in the middle of with it.
  // Leaving that session alone is the same outcome as navigating away from the
  // page by any other route.
  function leave() {
    if (!onPage.current) return;
    const target = resolveReturnPath(a.from);
    a.reset();
    router.push(target);
    router.refresh();
  }

  async function markApplied() {
    if (!markAppliedEnabled({ status: a.status, issues: a.issues }).enabled) return;
    setMarking(true);
    setError("");
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n: a.n, status: "Applied" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (!onPage.current) return; // moved on already; the row is unchanged
        setError(d.error || "Konnte nicht als beworben markiert werden – die Tracker-Zeile ist unverändert.");
        setMarking(false);
        return;
      }
      leave();
    } catch {
      if (!onPage.current) return; // moved on already
      // The route writes the tracker before it answers, so a connection that
      // drops on the way back leaves the write's fate genuinely unknown —
      // claiming the row is untouched here would be a guess.
      setError("Die Aktualisierung konnte nicht bestätigt werden – prüfen Sie die Zeile im Tracker, bevor Sie sich darauf verlassen.");
      setMarking(false);
    }
  }

  if (confirming) {
    return (
      <div className="co-rise mt-8 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 backdrop-blur-sm">
        <p className="text-sm font-medium text-foreground">Diese Bewerbung verlassen?</p>
        <p className="mt-1 text-xs text-muted">Ihre entworfenen Antworten existieren nur auf dieser Seite. Zurückgehen verwirft sie und schließt das Formular.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={leave}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600 max-sm:min-h-[44px]"
          >
            <ArrowLeft className="size-3.5" /> Verlassen und verwerfen
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground max-sm:min-h-[44px]"
          >
            Hier bleiben
          </button>
        </div>
      </div>
    );
  }

  const appliedGate = markAppliedEnabled({ status: a.status, issues: a.issues });
  return (
    <div className="mt-8 border-t border-border/70 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => (needsLeaveConfirmation({ status: a.status, answers: a.answers }) ? setConfirming(true) : leave())}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-brand/40 hover:text-brand-text max-sm:min-h-[44px]"
        >
          <ArrowLeft className="size-4" /> Zurück
        </button>
        {a.n && (
          <button
            onClick={markApplied}
            disabled={!appliedGate.enabled || marking}
            title={appliedGate.hint}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400 max-sm:min-h-[44px]"
          >
            {marking ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}
            {marking ? "Tracker wird aktualisiert …" : "Als beworben markieren"}
          </button>
        )}
        {a.n && <span className="text-xs text-muted">{appliedGate.hint}</span>}
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Watch the agent reach the form live (it navigates, never submits) ───────
const DRIVE_VERB: Record<string, string> = { click: "Geklickt", type: "Eingegeben in", select: "Ausgewählt", scroll: "Gescrollt", "parse-error": "Überlegt …", stuck: "Hängt fest", reached_form: "Formular erreicht" };
function DrivePanel({ steps, filling }: { steps: DriveStep[]; filling?: boolean }) {
  const last = steps[steps.length - 1];
  return (
    <div className="co-rise">
      <div className="flex flex-col items-center gap-3 py-7 text-center">
        <span className="relative grid size-14 place-items-center">
          <span className="co-orb absolute inset-0 rounded-full bg-brand/30 blur-lg" />
          <span className="co-ring absolute inset-0 rounded-full border-2 border-brand/30 border-t-brand" />
          <MousePointerClick className="size-6 text-brand-text" />
        </span>
        <div className="font-display text-2xl text-landing">{filling ? "KI füllt das Formular aus …" : "Ihr Formular wird erreicht …"}</div>
        <p className="max-w-sm text-sm text-muted">{filling ? "Die KI bedient das echte Formular Feld für Feld auf Ihrem Rechner – sie sendet nie ab; Sie prüfen und senden selbst ab." : "Die KI navigiert auf Ihrem Rechner durch die echte Bewerbung, um das Formular zu erreichen – sie sendet nie ab."}</p>
      </div>
      {last?.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={last.thumb} alt="" className="w-full rounded-xl border border-border shadow-xl shadow-black/10" />
      ) : (
        <div className="co-skel h-56 w-full rounded-xl" />
      )}
      {steps.length > 0 && (
        <ol className="mt-3 space-y-1.5 rounded-xl border border-border/70 bg-surface/70 p-3 backdrop-blur-sm">
          {steps.map((s, i) => (
            <li key={i} className={cn("flex items-center gap-2 text-xs", i === steps.length - 1 ? "text-foreground" : "text-muted")}>
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand-text">{s.turn}</span>
              <span className="shrink-0 font-medium">{DRIVE_VERB[s.action] ?? s.action}</span>
              <span className="truncate text-faint">{s.detail}</span>
              {/* `submit-control` is the guard doing its job (good news, distinct
                  color); `not-offered`/`gone` are the page moving under us
                  (a caution, not a protection) — same amber as before this
                  field had a consumer at all. */}
              {s.note &&
                (s.refusal === "submit-control" ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-emerald-800 dark:text-emerald-400">
                    <ShieldCheck className="size-3" /> {s.note}
                  </span>
                ) : (
                  <span className="shrink-0 text-amber-500">· {s.note}</span>
                ))}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ── Issues the interpreter surfaced — never fail mute ───────────────────────
function ApplyIssues({ issues }: { issues: ApplyIssue[] }) {
  if (!issues.length) return null;
  const warns = issues.filter((i) => i.level === "warn" || i.level === "block");
  const infos = issues.filter((i) => i.level === "info");
  return (
    <div className="mb-4 space-y-2">
      {warns.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 backdrop-blur-sm">
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-400">
            <AlertTriangle className="size-4" /> Einiges zu prüfen
          </div>
          <ul className="space-y-1 text-xs text-amber-800/90 dark:text-amber-300/90">
            {warns.map((i, k) => (
              <li key={k} className="flex gap-1.5">
                <span className="mt-px text-amber-500">•</span> {i.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {infos.map((i, k) => (
        <div key={k} className="flex items-center gap-1.5 text-xs text-muted">
          <Info className="size-3.5 shrink-0 text-faint" /> {i.message}
        </div>
      ))}
    </div>
  );
}

// ── Journey rail: Reading → Drafting → Review ───────────────────────────────
function PhaseRail({ phase }: { phase: number }) {
  const steps = [
    { label: "Formular lesen", icon: ScanLine },
    { label: "Antworten entwerfen", icon: PenLine },
    { label: "Prüfen und absenden", icon: CheckCircle2 },
  ];
  return (
    <div className="mb-6 flex items-center gap-2.5">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const state = i < phase ? "done" : i === phase ? "active" : "todo";
        return (
          <Fragment key={i}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "relative grid size-6 place-items-center rounded-full border transition-colors",
                  state === "done" && "border-brand bg-brand text-brand-foreground",
                  state === "active" && "border-brand text-brand-text",
                  state === "todo" && "border-border text-faint",
                )}
              >
                {state === "done" ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                {state === "active" && <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-brand/30" />}
              </span>
              <span className={cn("hidden text-xs font-medium sm:inline", i <= phase ? "text-foreground" : "text-faint")}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <span className="relative h-px flex-1 overflow-hidden rounded bg-border">
                <span className={cn("absolute inset-y-0 left-0 bg-brand transition-all duration-700", i < phase ? "w-full" : "w-0")} />
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// Honest, calming rotation of what the planner is actually doing, so the (~1-2min)
// draft doesn't feel stalled. Crossfades every ~2.8s.
const DRAFT_MSGS = [
  "Ihr Lebenslauf wird gelesen …",
  "Stelle und Firma werden gelesen …",
  "Ihre Erfahrung wird jeder Frage zugeordnet …",
  "Jede Antwort wird in Ihrer eigenen Stimme geschrieben …",
  "Alles, was Ihre Entscheidung braucht, wird markiert …",
];
function RotatingStatus() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % DRAFT_MSGS.length), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <div key={i} className="co-rise truncate text-xs text-muted">
      {DRAFT_MSGS[i]}
    </div>
  );
}

function ProcessingHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="co-rise flex flex-col items-center gap-3 py-14 text-center">
      <span className="relative grid size-16 place-items-center">
        <span className="co-orb absolute inset-0 rounded-full bg-brand/30 blur-lg" />
        <span className="co-ring absolute inset-0 rounded-full border-2 border-brand/30 border-t-brand" />
        <Sparkles className="size-7 text-brand-text" />
      </span>
      <div className="font-display text-3xl text-landing">{title}</div>
      <p className="max-w-sm text-sm text-muted">{subtitle}</p>
    </div>
  );
}

function FieldSkeleton() {
  return (
    <div className="co-rise space-y-3 rounded-2xl border border-border/70 bg-surface/70 p-5 backdrop-blur-md" style={{ animationDelay: "120ms" }}>
      {[64, 80, 48, 72, 56].map((w, i) => (
        <div key={i} className="space-y-2">
          <div className="co-skel h-3" style={{ width: `${w}px` }} />
          <div className="co-skel h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

function FileNotice({ label, cvAttached }: { label: string; cvAttached: boolean }) {
  const notice = resumeFieldNotice({ label, cvAttached });
  if (notice.claim) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-400">
        <FileCheck2 className="size-4 shrink-0" /> {notice.text}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted">
      <Paperclip className="size-4 shrink-0" /> {notice.text}
    </div>
  );
}

function FieldRow({
  field: f,
  value,
  needs,
  reason,
  index,
  drafting,
  cvAttached,
  onChange,
}: {
  field: ApplyField;
  value: string;
  needs: boolean;
  /** Why the field was left for the user, e.g. an AI-directed question (#7193). */
  reason?: string;
  index: number;
  drafting: boolean;
  cvAttached: boolean;
  onChange: (v: string) => void;
}) {
  const controlId = useId();
  const confirmationId = `${controlId}-confirmation`;
  const reasonId = `${controlId}-reason`;
  const describedBy = [needs ? confirmationId : null, reason ? reasonId : null].filter(Boolean).join(" ");
  // Announce the employer's requirement without imposing native validation on
  // this draft editor; the user still reviews/submits the real form separately.
  const controlProps = {
    id: controlId,
    "aria-required": f.required || undefined,
    "aria-describedby": describedBy || undefined,
  };
  const labelText = f.label || "Unbenanntes Feld";

  // Flash brand-orange the moment a drafted answer first lands (empty → value).
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!prev.current && value) {
      setFlash(true);
      // outlast the staggered animation-delay (≤900ms) + the 1.15s flash
      const t = setTimeout(() => setFlash(false), 2300);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);

  const base = cn(
    "w-full rounded-lg border bg-surface/60 px-3 py-2 text-sm outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20",
    needs ? "border-amber-500/50" : "border-border",
  );
  // While the planner is drafting, an empty answer shimmers like it's being
  // written; it flashes into the real value the instant the draft lands.
  const writing = drafting && !value && f.type !== "file";
  return (
    <div className={flash ? "co-flash" : ""} style={flash ? { animationDelay: `${Math.min(index * 70, 900)}ms` } : undefined}>
      <div className="mb-1.5 flex items-center gap-1 text-sm font-medium">
        {f.type === "file" || f.type === "checkbox" ? (
          <span className={f.label ? undefined : "text-faint"}>{labelText}</span>
        ) : (
          <label htmlFor={controlId} className={f.label ? undefined : "text-faint"}>{labelText}</label>
        )}
        {f.required && <Asterisk aria-hidden="true" className="size-3 text-brand-text" />}
        {needs && <span id={confirmationId} className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-400">Sie bestätigen</span>}
      </div>
      {reason && <p id={reasonId} className="mb-1.5 text-xs text-amber-800 dark:text-amber-400">{reason}</p>}
      {writing ? (
        <div className={cn("co-skel", f.type === "textarea" ? "h-[68px]" : "h-9")} />
      ) : f.type === "textarea" ? (
        <textarea {...controlProps} rows={3} maxLength={f.maxLength} value={value} onChange={(e) => onChange(e.target.value)} placeholder={needs ? "Dieses füllen Sie aus." : "…"} className={cn(base, "resize-none")} />
      ) : (f.type === "select" || f.type === "radio") && f.options && f.options.length > 0 ? (
        <select {...controlProps} value={value} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">Auswählen …</option>
          {f.options.map((o, i) => (
            <option key={i} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : f.type === "checkbox" ? (
        <label className="flex items-center gap-2 text-sm text-muted">
          <input {...controlProps} type="checkbox" checked={value === "true" || value === "yes"} onChange={(e) => onChange(e.target.checked ? "true" : "")} className="size-4 accent-brand" /> {f.label || "Ja"}
        </label>
      ) : f.type === "file" ? (
        <FileNotice label={f.label} cvAttached={cvAttached} />
      ) : (
        <input {...controlProps} type={["email", "tel", "url", "number", "date"].includes(f.type) ? f.type : "text"} maxLength={f.maxLength} value={value} onChange={(e) => onChange(e.target.value)} placeholder={needs ? "Dieses füllen Sie aus." : "…"} className={base} />
      )}
    </div>
  );
}
