"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Radar, Wrench } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { useJobs, type Job } from "@/components/jobs/job-store";
import { cn } from "@/lib/cn";
import type { WatchedCompany } from "@/lib/portals-config.mjs";
import { showPortalsSetup } from "@/lib/portals-setup.mjs";

type Company = { name: string; status: string; detail: string };
type Result = { available: boolean; configured: boolean; companies: Company[]; error?: string };

const TONE: Record<string, { dot: string; label: string; chip: string }> = {
  live: { dot: "bg-emerald-500", label: "aktiv", chip: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400" },
  empty: { dot: "bg-amber-500", label: "aktiv · leer", chip: "bg-amber-500/15 text-amber-800 dark:text-amber-400" },
  broken: { dot: "bg-red-500", label: "defekt", chip: "bg-red-500/15 text-red-700 dark:text-red-400" },
  skipped: { dot: "bg-zinc-400", label: "kein ATS", chip: "bg-surface-hover text-muted" },
};
const ORDER: Record<string, number> = { broken: 0, empty: 1, live: 2, skipped: 3 };

export function PortalsView({
  watched,
  missing = false,
  target = "portals.yml",
}: {
  watched: WatchedCompany[];
  missing?: boolean;
  target?: string;
}) {
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const { jobs, startJob } = useJobs();

  // map the agentic "fix-portal" workers to the company they're repairing
  const fixByCompany = useMemo(() => {
    const m = new Map<string, (typeof jobs)[number]>();
    for (const j of jobs) {
      if (j.kind !== "fix-portal" || !j.input) continue;
      const ex = m.get(j.input);
      if (!ex || j.startedAt > ex.startedAt) m.set(j.input, j);
    }
    return m;
  }, [jobs]);

  function check() {
    setLoading(true);
    fetch("/api/portals/verify")
      .then((r) => r.json())
      .then(setRes)
      .catch(() => setRes({ available: false, configured: false, companies: [] }))
      .finally(() => setLoading(false));
  }

  const companies = res?.companies ?? [];
  const broken = companies.filter((c) => c.status === "broken");
  const liveN = companies.filter((c) => c.status === "live" || c.status === "empty").length;
  const sorted = [...companies].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={check}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-200 disabled:opacity-50 max-sm:min-h-[44px]"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
          Portal-Status prüfen
        </button>
        {loading && <span className="text-xs text-faint">Das ATS jeder Firma wird geprüft … (ca. 30–60 s)</span>}
      </div>

      {!res && watched.length > 0 && <WatchedList watched={watched} />}

      {res && !res.available && !res.error && (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface/30 p-4 text-sm text-muted">
          <code className="text-foreground">verify-portals.mjs</code> nicht gefunden – dafür wird ein vollständiges career-ops-Checkout benötigt (die Weboberfläche steuert den Validator des Kerns).
        </p>
      )}
      {res && !res.available && res.error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-muted">
          <span className="font-medium text-red-700 dark:text-red-400">Die Portal-Prüfung wurde nicht abgeschlossen</span> – es wurde
          kein Portal geprüft, daher wird keines als gesund angezeigt. Versuchen Sie es erneut oder führen Sie{" "}
          <code className="text-foreground">node verify-portals.mjs</code> aus, um die Ursache zu sehen.{" "}
          <code className="break-all font-mono text-xs text-faint">{res.error}</code>
        </p>
      )}
      {showPortalsSetup(missing, res) && (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-surface/30 p-4 text-sm text-muted">
          Noch keine <code className="break-all text-foreground">{target}</code>. Kopieren Sie{" "}
          <code className="text-foreground">templates/portals.example.yml</code> nach{" "}
          <code className="break-all text-foreground">{target}</code> und tragen Sie die zu beobachtenden Firmen ein. Eine Statusprüfung legt diese Datei nicht an.
        </p>
      )}

      {res && res.configured && (
        <div className="mt-5">
          <p className="text-sm text-muted">
            <span className="tabular-nums text-emerald-800 dark:text-emerald-400">{liveN}</span> aktiv ·{" "}
            <span className="tabular-nums text-red-700 dark:text-red-400">{broken.length}</span> defekt ·{" "}
            <span className="tabular-nums">{companies.length}</span> beobachtet
          </p>
          {broken.length > 0 && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
              <span className="font-medium text-red-700 dark:text-red-400">
                {broken.length} {broken.length === 1 ? "Firma fällt" : "Firmen fallen"} bei jedem
                Scan stillschweigend heraus
              </span>{" "}
              <span className="text-muted">
                – der Karriere-Link ist defekt. Korrigieren Sie die <code>careers_url</code> in <code>portals.yml</code> (oder lassen Sie
                den Assistenten sie reparieren).
              </span>
            </div>
          )}
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/40">
            {sorted.map((c) => {
              const t = TONE[c.status] ?? TONE.skipped;
              return (
                <li key={c.name} className="flex items-center gap-3 px-4 py-2.5">
                  <CompanyLogo name={c.name} size={20} />
                  <span className={cn("size-1.5 shrink-0 rounded-full", t.dot)} />
                  <span className="shrink-0 text-sm font-medium">{c.name}</span>
                  <span className="truncate font-mono text-xs text-faint">{c.detail}</span>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    {c.status === "broken" && <FixAffordance company={c.name} job={fixByCompany.get(c.name)} onFix={() => startJob({ title: `Reparatur · ${c.name}`, subtitle: "Portal-Slug reparieren", kind: "fix-portal", input: c.name, page: "/portals" })} />}
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", t.chip)}>{t.label}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function FixAffordance({ company, job, onFix }: { company: string; job?: Job; onFix: () => void }) {
  if (job?.status === "running")
    return (
      <Link href={`/jobs/${job.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-text">
        <Loader2 className="size-3 animate-spin" /> Repariert …
      </Link>
    );
  if (job?.status === "done")
    return (
      <Link href={`/jobs/${job.id}`} className="text-xs font-medium text-emerald-800 dark:text-emerald-400">
        repariert · erneut prüfen
      </Link>
    );
  return (
    <button
      onClick={onFix}
      title={`Portal-Slug von ${company} vom Agenten reparieren lassen`}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-brand/40 hover:text-brand-text"
    >
      <Wrench className="size-3" /> Reparieren
    </button>
  );
}

function WatchedList({ watched }: { watched: WatchedCompany[] }) {
  const scanned = watched.filter((c) => c.enabled).length;
  return (
    <div className="mt-5">
      <p className="text-sm text-muted">
        <span className="tabular-nums text-foreground">{scanned}</span> gescannt ·{" "}
        <span className="tabular-nums">{watched.length - scanned}</span> pausiert · starten Sie eine Statusprüfung, um zu sehen, welche Boards
        noch antworten
      </p>
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/40">
        {watched.map((c, i) => (
          <li key={`${i}-${c.name}`} className={cn("flex items-center gap-3 px-4 py-2.5", !c.enabled && "opacity-60")}>
            <CompanyLogo name={c.name} size={20} />
            <span className="shrink-0 text-sm font-medium">{c.name}</span>
            <span className="truncate font-mono text-xs text-faint">{c.host}</span>
            {!c.enabled && (
              <span className="ml-auto shrink-0 rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                pausiert
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
