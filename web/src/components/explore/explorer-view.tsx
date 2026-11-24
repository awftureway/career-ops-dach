"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, ChevronDown, RotateCcw, AlertTriangle, Sparkles, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { pageFrameWidthClass } from "@/components/page-frame";
import { instrumentSerif } from "@/lib/fonts";
import { normalizeTextKey } from "@/lib/core/normalize-text-key.mjs";
import { matchEvaluatedPosting } from "@/lib/evaluated-posting.mjs";
import { paramsToFilters, paramsToAi, type ExploreFilters, type EmployerSource } from "@/lib/explore";
import { isEmployerPreset, DACH_PRESET, DACH_SOURCES } from "@/lib/employer-preset.mjs";
import { shouldStartScanOnLoad } from "@/lib/scan-on-load.mjs";
import { FilterBuilder } from "./filter-builder";
import { DiscoveringState } from "./discovering-state";
import { AiHuntView } from "./ai-hunt-view";
import { ExploreModeToggle } from "./explore-mode-toggle";
import { AiSearchBox } from "./ai-search-box";
import { ResultsList, type EnrichedOffer } from "./results-list";
import { useExplore } from "./explore-provider";
import { ScheduleJobAction } from "./schedule-job-action";

// Same shape as core normalizeTextKey(s, " ") — never [^a-z0-9] (#2666).
const norm = (s: string) => normalizeTextKey(s, " ");
const CLI_NAMES: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  gemini: "Gemini CLI",
  opencode: "OpenCode",
  copilot: "Copilot CLI",
  qwen: "Qwen CLI",
  antigravity: "Antigravity CLI",
};

export function ExplorerView({
  seed,
  inboxUrls,
  evaluated,
  rootExists,
}: {
  seed: { filters: ExploreFilters; seededFrom: string[] };
  inboxUrls: string[];
  evaluated: { n: string; company: string; role: string; url?: string }[];
  rootExists: boolean;
}) {
  const { filters, setFilters, initFilters, phase, running, offers, discover, loadFresh, status, employerOutcome, error, scannerMissing, mode, setMode, aiIntent, setAiIntent, discoverAI, companiesScanned, companiesAvailable, capHit, droppedNoDate, partial } = useExplore();
  const scanNote =
    companiesScanned > 0
      ? `${companiesScanned.toLocaleString("de-DE")}${companiesAvailable > companiesScanned ? ` von ${companiesAvailable.toLocaleString("de-DE")}` : ""} ${companiesScanned === 1 ? "Firma" : "Firmen"} gescannt${partial ? " · einige Quellen waren nicht erreichbar" : ""}.`
      : undefined;
  const inited = useRef(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [cli, setCli] = useState<{ id: string | null; name?: string }>({ id: null });
  const [firstRun, setFirstRun] = useState(false);

  useEffect(() => {
    try {
      const id = JSON.parse(localStorage.getItem("career-ops:config") || "{}").cliId || null;
      setCli({ id, name: id ? CLI_NAMES[id] || id : undefined });
    } catch {
      setCli({ id: null });
    }
  }, []);

  // Initialize once from the URL (shareable search) or the server seed — without
  // clobbering anything the assistant set before this mount.
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const sp = new URLSearchParams(window.location.search);
    const ai = paramsToAi(sp);
    if (ai !== null) {
      setMode("ai");
      setAiIntent(ai);
    } else if (sp.get("view") === "fresh") {
      // Today's "See all N" (#84) hands off here instead of a bare config form —
      // load the SAME /api/whats-new offers it already showed, through the normal
      // results-phase UI. The config form (Refine search / Re-cast) stays reachable.
      // Force scan mode: a session restored in "ai" mode (sessionStorage rehydrate)
      // must not show the AI-search UI for this scan-only hand-off.
      setMode("scan");
      initFilters(seed.filters);
      void loadFresh();
    } else {
      const dachDefault = (f: ExploreFilters): ExploreFilters => ({ ...f, preset: DACH_PRESET, employers: [...DACH_SOURCES] as EmployerSource[] });
      // A URL that names no source (older links, the CV hand-off) gets the DACH default; ?preset=ats keeps join.com.
      initFilters(sp.toString() ? (sp.has("preset") ? paramsToFilters(sp) : dachDefault(paramsToFilters(sp))) : dachDefault(seed.filters));
      // Onboarding hand-off: ?run=1 on Explore starts the scan. Pipeline never does.
      if (shouldStartScanOnLoad(window.location.pathname, window.location.search)) {
        setFirstRun(true);
        void discover();
      }
    }
  }, [seed.filters, initFilters, setMode, setAiIntent, discover, loadFresh]);

  const enriched: EnrichedOffer[] = useMemo(() => {
    const trackedUrls = new Set(inboxUrls);
    return offers.map((o) => {
      const inPipeline = trackedUrls.has(o.url);
      const ev = matchEvaluatedPosting(evaluated, o, norm);
      return { ...o, inPipeline, evaluatedN: ev?.n };
    });
  }, [offers, inboxUrls, evaluated]);

  const isAi = mode === "ai";
  const isResults = phase === "results";
  const employer = isEmployerPreset(filters.preset);
  const canDiscover = !running && (employer ? (filters.employers?.length ?? 0) > 0 : filters.ats.length > 0);
  const scanRunning = running && !isAi && !employer;
  // Keep one ResultsList mounted across scanning → revealing → results so
  // filter/sort/scroll and co-rise survive the 850ms reveal handoff.
  const showScanList = !isAi && offers.length > 0 && (scanRunning || isResults);

  if (running && isAi) return <AiHuntView cliName={cli.name} />;

  return (
    <div className={scanRunning ? undefined : cn("mx-auto px-5 py-8 md:px-8", pageFrameWidthClass.wide)}>
      <p role="status" aria-live="polite" aria-atomic="true" className="mb-4 text-sm text-muted">{!isAi && (employerOutcome?.message || (employer && running ? "Scanne ausgewählte Arbeitgeber …" : ""))}</p>
      {scanRunning && <DiscoveringState />}
      {!scanRunning && (
        <>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <Compass className="size-6 text-brand-text" />
            <h1 className={`${instrumentSerif.className} text-3xl text-foreground`}>Explorer</h1>
          </div>
          <div className="w-full sm:ml-auto sm:w-auto">
            <ExploreModeToggle mode={mode} onChange={setMode} cliConfigured={!!cli.id} />
          </div>
        </div>
        {!isResults && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
            {isAi
              ? "Beschreiben Sie die Rolle in eigenen Worten – eine KI sucht sie im offenen Web, über Ihre eigene KI. Kandidaten bleiben ungeprüft, bis Sie sie bewerten."
              : filters.preset === DACH_PRESET ? "Deutsche Jobbörsen durchsuchen (Bundesagentur für Arbeit, Arbeitnow, GermanTechJobs, stellenanzeigen.de) mit Ihren Rollen- und Ortsbegriffen, ohne Token-Kosten. Originalanzeige beim Arbeitgeber prüfen." : employer ? "Ausgewählte Arbeitgeber-Seiten mit Ihren Rollen- und Ortsbegriffen scannen, ohne Token-Kosten. Öffnen Sie die Original-Stellenanzeige, um Details zu prüfen." : "Öffentliches ATS-Netzwerk scannen – join.com (DACH). Neue, zu Ihnen passende Stellenanzeigen, ohne Token-Kosten. Kosten entstehen erst, wenn Sie eine Stelle bewerten."}
          </p>
        )}
      </header>

      {!rootExists && (
        <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Ihr career-ops-Verzeichnis ist noch nicht eingerichtet – die Entdeckung braucht einen Checkout mit Profil als Grundlage.
        </div>
      )}

      {isAi ? (
        phase === "blocked" ? (
          <BlockedCard />
        ) : (
          <div className="space-y-6">
            <AiSearchBox
              intent={aiIntent}
              onIntent={setAiIntent}
              onSubmit={() => void discoverAI()}
              cliConfigured={!!cli.id}
              cliName={cli.name}
              onRunScan={() => setMode("scan")}
            />
            {phase === "results" && <ResultsList offers={enriched} />}
            {phase === "empty-loose" && (
              <EmptyState
                tone="loose"
                title="Noch keine öffentlichen Treffer."
                body="Die KI-Suche liest nur öffentliche Inhalte. Fassen Sie Ihr Anliegen weiter oder starten Sie den kostenlosen Scan über das ATS-Netzwerk."
                onRerun={() => setMode("scan")}
                rerunLabel="Kostenlosen Scan starten"
              />
            )}
            {phase === "failed" && <FailedCard msg={error || status} scannerMissing={scannerMissing} onRetry={() => void discoverAI()} />}
          </div>
        )
      ) : (
        <>
          {isResults && !employer ? (
            <div className="mb-6 rounded-xl border border-border bg-surface/30">
              <button type="button" onClick={() => setRefineOpen((v) => !v)} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground">
                <Compass className="size-4 text-brand-text" /> Suche verfeinern
                <ChevronDown className={cn("ml-auto size-4 text-muted transition-transform", refineOpen && "rotate-180")} />
              </button>
              {refineOpen && (
                <div className="space-y-4 border-t border-border p-4">
                  <FilterBuilder filters={filters} onChange={setFilters} seededFrom={seed.seededFrom} disabled={running} />
                  <DiscoverBar canDiscover={canDiscover} onDiscover={discover} label="Neu auswerfen (kostenlos)" filters={filters} />
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border border-border bg-surface/30 p-5">
              <FilterBuilder filters={filters} onChange={setFilters} seededFrom={seed.seededFrom} disabled={running} />
              <div className="mt-5">
                <DiscoverBar canDiscover={canDiscover} onDiscover={discover} label="Entdecken (kostenlos)" filters={filters} />
              </div>
            </div>
          )}

          {isResults && firstRun && !employerOutcome && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <p className="text-[13px] leading-relaxed text-foreground">
                Das sind aktuelle Stellen, die zu Ihrem Lebenslauf passen. <span className="text-emerald-800 dark:text-emerald-400">Bisher hat Sie kein Token gekostet.</span> Wählen Sie die Stelle, die Sie am meisten interessiert, und bewerten Sie sie – dann sehen Sie genau, wie Sie abschneiden und warum.
              </p>
            </div>
          )}

          {isResults && capHit && (
            <CappedBanner companiesScanned={companiesScanned} companiesAvailable={companiesAvailable} onRefine={() => setRefineOpen(true)} />
          )}
        </>
      )}
      </>
      )}

      {showScanList && (
        <div className={scanRunning ? cn("relative z-[1] mx-auto px-5 pb-10 md:px-8", pageFrameWidthClass.wide) : undefined}>
          <ResultsList offers={enriched} />
        </div>
      )}

      {!scanRunning && !isAi && (
        <>
          {!employerOutcome && phase === "empty-current" && (
            <EmptyState
              tone="good"
              title="Sie sind auf dem neuesten Stand."
              body="Seit dem letzten Scan gibt es nichts Neues. Ihre Pipeline ist aktuell – genau das ist das Ziel."
              note={scanNote}
              onRerun={() => {
                setFilters({ ...filters, sinceDays: Math.max(filters.sinceDays, 30) });
                void discover();
              }}
              rerunLabel="30 Tage zurückblicken"
            />
          )}
          {!employerOutcome && phase === "empty-loose" && (
            <EmptyState
              tone="loose"
              title="Noch keine neuen Treffer."
              body="Die Entdeckung ist kostenlos – lockern Sie die Kriterien und werfen Sie das Netz so oft neu aus, wie Sie möchten."
              note={scanNote}
              onRerun={() => {
                setFilters({ ...filters, sinceDays: 30, block: [], allow: [] });
                void discover();
              }}
              rerunLabel="Auf 30 Tage erweitern · Ort zurücksetzen"
            />
          )}
          {!employerOutcome && phase === "degraded" && (
            <DegradedCard
              onRetry={() => void discover()}
              companiesScanned={companiesScanned}
              companiesAvailable={companiesAvailable}
              capHit={capHit}
              droppedNoDate={droppedNoDate}
              partial={partial}
            />
          )}
          {!employerOutcome && phase === "failed" && <FailedCard msg={error || status} scannerMissing={scannerMissing} onRetry={() => void discover()} />}
        </>
      )}
    </div>
  );
}

function DiscoverBar({ canDiscover, onDiscover, label, filters }: { canDiscover: boolean; onDiscover: () => void; label: string; filters: ExploreFilters }) {
  const { running } = useExplore();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={!canDiscover && !running}
        aria-disabled={!canDiscover}
        aria-describedby={isEmployerPreset(filters.preset) ? "employer-selection" : undefined}
        onClick={() => { if (canDiscover) onDiscover(); }}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition-all hover:brightness-110 disabled:opacity-50 max-sm:min-h-[44px]"
      >
        <Compass className="size-4" /> {label}
      </button>
      {!isEmployerPreset(filters.preset) && <ScheduleJobAction filters={filters} />}
      <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Eine spätere Bewertung kostet Tokens. Das Entdecken nie.
      </span>
    </div>
  );
}

function EmptyState({ tone, title, body, note, onRerun, rerunLabel }: { tone: "good" | "loose"; title: string; body: string; note?: string; onRerun: () => void; rerunLabel: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/30 px-6 py-12 text-center">
      <div className={cn("mx-auto grid size-12 place-items-center rounded-full", tone === "good" ? "bg-emerald-500/12 text-emerald-500" : "bg-brand-soft text-brand-text")}>
        <Sparkles className="size-6" />
      </div>
      <h2 className={`${instrumentSerif.className} mt-4 text-2xl text-foreground`}>{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{body}</p>
      {note && <p className="mx-auto mt-1 max-w-md text-[12px] text-faint">{note}</p>}
      <button onClick={onRerun} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/50 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-brand/40 hover:text-brand-text">
        <RotateCcw className="size-4" /> {rerunLabel}
      </button>
    </div>
  );
}

function DegradedCard({
  onRetry,
  companiesScanned,
  companiesAvailable,
  capHit,
  droppedNoDate,
  partial,
}: {
  onRetry: () => void;
  companiesScanned: number;
  companiesAvailable: number;
  capHit: boolean;
  droppedNoDate: number;
  partial: boolean;
}) {
  // 0 results, but the scan was NOT a clean full search → never "all caught up".
  // Pick the most informative reason (authoritative when the scanner's --json mode
  // is available; otherwise the 0-companies fallback).
  let title = "Der Scan lief, konnte aber keine Quelle erreichen.";
  let body =
    "Die öffentlichen ATS-Verzeichnisse haben nicht geantwortet – meist ein kurzer Netzwerkfehler oder ein Ratenlimit, daher konnte nichts durchsucht werden. Das heißt nicht „alles aktuell“; ein erneuter Versuch in einem Moment behebt es meist.";
  if (companiesScanned > 0 && capHit) {
    title = "Keine Treffer im durchsuchten Ausschnitt.";
    body = `Der Scan ist begrenzt und hat nur ${companiesScanned.toLocaleString("de-DE")}${companiesAvailable > companiesScanned ? ` von ${companiesAvailable.toLocaleString("de-DE")}` : ""} Firmen durchsucht – nicht das ganze Netzwerk. Erhöhen Sie die Scan-Tiefe (Suche verfeinern) oder grenzen Sie Ihre Rollen ein und werfen Sie das Netz neu aus.`;
  } else if (companiesScanned > 0 && droppedNoDate > 0) {
    title = "Neu wirkende Stellen wurden wegen fehlender Daten übersprungen.";
    body = `${droppedNoDate.toLocaleString("de-DE")} ${droppedNoDate === 1 ? "Stellenanzeige passte" : "Stellenanzeigen passten"}, ${droppedNoDate === 1 ? "hatte" : "hatten"} aber kein klares Veröffentlichungsdatum, daher ${droppedNoDate === 1 ? "hat sie" : "haben sie"} der Aktualitätsfilter aussortiert. Ein größeres Zeitfenster bringt oft datierte Entsprechungen zurück.`;
  } else if (companiesScanned > 0 && partial) {
    title = "Einige Jobbörsen waren nicht erreichbar.";
    body = `Der Scan hat ${companiesScanned.toLocaleString("de-DE")} Firmen durchsucht, aber mindestens eine Quelle hat nicht geantwortet – das Ergebnis ist unvollständig, nicht „alles aktuell“. Ein erneuter Versuch behebt es meist.`;
  }
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
      <AlertTriangle className="mx-auto size-6 text-amber-500" />
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">{body}</p>
      <button onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand-text">
        <RotateCcw className="size-4" /> Scan erneut versuchen
      </button>
    </div>
  );
}

function CappedBanner({ companiesScanned, companiesAvailable, onRefine }: { companiesScanned: number; companiesAvailable: number; onRefine: () => void }) {
  // Results ARE present, but the scan was capped — tell the user there's more, so a
  // partial list never reads as "everything there is".
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-2.5 text-[13px]">
      <span className="text-foreground">
        Begrenzter Ausschnitt – {companiesScanned.toLocaleString("de-DE")}
        {companiesAvailable > companiesScanned ? ` von ${companiesAvailable.toLocaleString("de-DE")}` : ""} Firmen durchsucht.
      </span>
      <button onClick={onRefine} className="font-medium text-brand-text hover:underline">
        Scan-Tiefe erhöhen, um tiefer zu suchen
      </button>
    </div>
  );
}

function FailedCard({ msg, scannerMissing, onRetry }: { msg: string; scannerMissing: boolean; onRetry: () => void }) {
  // The scanner-missing case (data-only / pre-scan-ats-full checkout) must NOT
  // offer a "Try again" that re-fails forever — give a real next step instead.
  // The caller decides this from the response body's SCANNER_MISSING code, never
  // from the error text and never from the bare 400: a runtime scan error ("The
  // scanner returned no readable output.") mentions the scanner too, and 400 is
  // a shared channel that also carries malformed-request and MODE_MISSING
  // failures. Neither may be misreported as a broken checkout.
  if (scannerMissing) {
    return (
      <div className="rounded-2xl border border-border bg-surface/30 px-6 py-10 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand-text">
          <Compass className="size-6" />
        </div>
        <h2 className={`${instrumentSerif.className} mt-4 text-2xl text-foreground`}>Die Entdeckung braucht das vollständige Toolkit</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
          Ihr career-ops-Verzeichnis enthält anscheinend nur Daten oder ist veraltet. Der kostenlose Scanner gehört zu einem vollständigen Checkout –
          aktualisieren Sie career-ops oder fügen Sie in der Pipeline eine Stellen-URL ein, um sie direkt zu bewerten.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/pipeline" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-brand-foreground transition hover:brightness-110">
            Pipeline öffnen
          </Link>
          <Link href="/config" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-brand/40 hover:text-brand-text">
            Einstellungen öffnen
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
      <AlertTriangle className="mx-auto size-6 text-amber-500" />
      <p className="mt-2 text-sm font-medium text-foreground">Die Suche konnte nicht abgeschlossen werden.</p>
      <p className="mt-1 text-[13px] text-muted">{msg}</p>
      <button onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand-text">
        <RotateCcw className="size-4" /> Erneut versuchen
      </button>
    </div>
  );
}

function BlockedCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface/30 px-6 py-12 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand-text">
        <Sparkles className="size-6" />
      </div>
      <h2 className={`${instrumentSerif.className} mt-4 text-2xl text-foreground`}>Die KI-Suche braucht eine CLI</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
        Verbinden Sie Claude Code, Gemini oder eine andere Agent-CLI – Ihr Schlüssel, Ihre Tokens, Ihr Rechner. Der kostenlose Scan bleibt auch ohne CLI verfügbar.
      </p>
      <Link href="/config" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-brand-foreground transition hover:brightness-110">
        <Settings className="size-4" /> Einstellungen öffnen
      </Link>
    </div>
  );
}
