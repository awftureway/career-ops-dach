import { ChevronDown, ExternalLink } from "lucide-react";
import { ignoredByScore, scoreBandSummary, scoringDimensions } from "@/lib/score-claims.mjs";

// Native <details>, no client JS. The dimension list is the rubric in
// modes/_shared.md. Bands come from lib/score-action.mjs.

const BLOCKS: [string, string][] = [
  ["A", "Kurzfassung der Rolle in einfacher Sprache"],
  ["B", "Eine Tabelle dazu, wie Ihr Lebenslauf zu jeder Anforderung passt, wie wichtig jede Anforderung für diese Stellenanzeige ist, und welche Lücken bestehen. Die Gewichtung ändert den Score von 1 bis 5 nicht."],
  ["C", "Strategie. Wie Sie sich für diese Rolle positionieren."],
  ["D", "Vergütung. Unbekannt, wenn die Stellenanzeige kein Gehalt nennt."],
  ["E", "Hinweise zur Personalisierung Ihrer Bewerbung"],
  ["F", "Interviewvorbereitung. STAR-Stories, zugeschnitten auf diese Stelle."],
  ["G", "Seriosität der Stellenanzeige. Eine Prüfung, ob die Anzeige echt ist. Sie ändert den Score von 1 bis 5 nicht."],
];

export function ScoreMethodology() {
  return (
    <details className="group mt-10 overflow-hidden rounded-2xl border border-border bg-surface/30">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors hover:bg-surface-hover">
        So hat career-ops bewertet – und warum es für <span className="text-landing">Sie</span> gilt
        <ChevronDown className="ml-auto size-4 text-faint transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-5 border-t border-border px-5 py-4 text-sm">
        <p className="text-muted">
          Jede Rolle erhält anhand von fünf Dimensionen einen Score von <strong className="text-foreground">1,0 bis 5,0</strong>.
          Der Gesamtscore ist dieses Urteil. Er ist keine sechste Eingabe.
        </p>
        <ul className="space-y-1 text-muted">
          {scoreBandSummary().map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Die fünf Dimensionen</div>
          <ul className="space-y-1.5">
            {scoringDimensions().map((row) => (
              <li key={row.name}>
                <span className="font-medium text-foreground">{row.name}.</span> <span className="text-muted">{row.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-muted">
          Diese Faktoren beeinflussen den Score nicht: {ignoredByScore().join(", ")}.
        </p>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Was jeder Berichtsblock bedeutet</div>
          <ul className="space-y-2">
            {BLOCKS.map(([k, v]) => (
              <li key={k} className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded bg-brand-soft text-xs font-semibold text-brand-text">
                  {k}
                </span>
                <span className="text-muted">{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <a
          href="https://career-ops.org/methodology"
          target="_blank"
          rel="noreferrer"
          aria-label="Vollständige Methodik (öffnet in neuem Tab)"
          className="inline-flex min-h-[24px] items-center gap-1 text-xs text-brand-text transition-colors hover:underline max-sm:min-h-[44px]"
        >
          Vollständige Methodik <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
    </details>
  );
}
