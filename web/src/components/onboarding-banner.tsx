"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X, Settings } from "lucide-react";
import { SETUP_BANNER_KEY, bannerStaysDismissed, setupBannerDismissKey, setupPaths } from "@/lib/home/setup-banner.mjs";
import { readSavedCliId, resolveCliId } from "@/lib/saved-cli";

type Doctor = { available: boolean; onboardingNeeded: boolean; missing: string[]; unpersonalized?: { path: string; reason: string }[]; warnings: string[] };

const LABELS: Record<string, string> = {
  "cv.md": "Ihren Lebenslauf",
  "config/profile.yml": "Ihr Profil — Zielrollen, Gehalt, Ort",
  "modes/_profile.md": "Ihre Personalisierung",
  "portals.yml": "die zu scannenden Firmen",
};

// Detect (via the core's doctor.mjs) whether setup is incomplete, and offer to
// finish it CONVERSATIONALLY — the assistant asks in plain language and writes
// the canonical files (no YAML to edit). This is the #1 adoption barrier.
export function OnboardingBanner() {
  const [d, setD] = useState<Doctor | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // null while resolveCliId() is in flight: the CTA shows, disabled, so it
  // neither flashes nor opens an assistant that has no CLI to send with.
  const [cli, setCli] = useState<boolean | null>(null);

  useEffect(() => {
    // Whether the assistant has a CLI it can run, by the same check a Run makes:
    // a saved id counts only while it is installed (#4012). Reading the saved
    // id alone kept "Set me up with the assistant" on screen for a stale id, so
    // the kickoff hit the "choose one in Config" error instead of this banner
    // sending the user to Config.
    let live = true;
    // The assistant sends with the saved id, so a pick that could not be
    // saved (blocked storage) does not count either.
    resolveCliId().then((id) => { if (live) setCli(!!id && readSavedCliId() === id); });
    // Re-read after setup changes. router.refresh() keeps this component's
    // state, so a dismissal for the old missing set would otherwise stick.
    const refresh = () => {
      fetch("/api/doctor")
        .then((r) => r.json())
        .then((doctor: Doctor) => {
          setD(doctor);
          try {
            setDismissed(bannerStaysDismissed(localStorage.getItem(SETUP_BANNER_KEY), setupPaths(doctor)));
          } catch {
            // A blocked storage read just shows the banner again.
            setDismissed(false);
          }
        })
        .catch(() => {});
    };
    refresh();
    window.addEventListener("co-onboarding-changed", refresh);
    return () => {
      live = false;
      window.removeEventListener("co-onboarding-changed", refresh);
    };
  }, []);

  if (dismissed || !d || !d.onboardingNeeded) return null;
  const paths = setupPaths(d);
  const items = paths.map(path => LABELS[path] ? LABELS[path] + " (" + path + ")" : path);
  const kickoff =
    `Hilf mir, die Einrichtung von career-ops abzuschließen. Es fehlen noch ${items.join(", ")} — führe mich im Gespräch nur durch diese Punkte und schreibe die Dateien für mich. Frag mich nichts, was bereits eingerichtet ist (zum Beispiel nicht nach meinem Lebenslauf, wenn er schon gespeichert ist).`;

  return (
    <div className="dot-bg relative mb-6 overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-surface/40 to-transparent p-5">
      <button
        onClick={() => {
          try {
            localStorage.setItem(SETUP_BANNER_KEY, setupBannerDismissKey(paths));
          } catch {
            // Dismiss still hides the banner for this visit.
          }
          setDismissed(true);
        }}
        className="absolute right-3 top-3 text-faint transition-colors hover:text-foreground"
        aria-label="Schließen"
      >
        <X className="size-4" />
      </button>
      <h2 className="font-display text-xl text-landing">Schließen wir die Einrichtung ab</h2>
      <p className="mt-1.5 max-w-xl text-sm text-muted">
        career-ops funktioniert am besten, wenn es Sie kennt. Es fehlen noch {items.join(", ")}.{" "}
        <span className="text-foreground">Kein YAML bearbeiten</span> — antworten Sie in einfachen Worten, der Assistent schreibt es für Sie.
      </p>
      {cli !== false ? (
        <button
          disabled={cli === null}
          onClick={() => window.dispatchEvent(new CustomEvent("co-assistant", { detail: { message: kickoff } }))}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-200 disabled:cursor-wait disabled:opacity-60"
        >
          <Sparkles className="size-4" /> Mit dem Assistenten einrichten
        </button>
      ) : (
        // The assistant needs a CLI to run — without one the kickoff would silently
        // drop. Send them to connect one first.
        <Link
          href="/config"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-200"
        >
          <Settings className="size-4" /> KI-CLI verbinden und loslegen
        </Link>
      )}
    </div>
  );
}
