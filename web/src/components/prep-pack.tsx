import { ChevronDown } from "lucide-react";
import { prepQuestions, readMachineSummary } from "@/lib/machine-summary.mjs";

const MATCH_LABEL: Record<string, { text: string; className: string }> = {
  strong: { text: "belegen", className: "text-emerald-800 dark:text-emerald-400" },
  partial: { text: "Tiefe zeigen", className: "text-amber-800 dark:text-amber-400" },
  missing: { text: "Lückenplan", className: "text-red-700 dark:text-red-400" },
};

export function PrepPack({ report, company }: { report: string; company: string }) {
  const summary = readMachineSummary(report);
  const questions = summary ? prepQuestions(summary) : [];
  if (questions.length === 0) return null;
  return (
    <details data-testid="prep-pack" className="group mt-3 overflow-hidden rounded-xl border border-border bg-surface/30">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-4 py-3 transition-colors hover:bg-surface-hover">
        <span className="text-sm font-medium">Interviewvorbereitung</span>
        <span className="hidden truncate text-xs text-faint sm:inline print:hidden">
          {questions.length} wahrscheinliche Frage{questions.length === 1 ? "" : "n"} zu den Anforderungen, die diese Rolle am stärksten gewichtet
        </span>
        <ChevronDown className="ml-auto size-4 shrink-0 text-faint transition-transform group-open:rotate-180 print:hidden" />
      </summary>
      <div className="border-t border-border px-4 py-3">
        <ol className="space-y-3">
          {questions.map((q) => (
            <li key={q.requirement} className="text-sm">
              <p className="text-foreground">{q.question}</p>
              <p className="mt-0.5 text-xs text-faint">
                {q.requirement} · {q.importance} ·{" "}
                <span className={MATCH_LABEL[q.match].className}>{MATCH_LABEL[q.match].text}</span>
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted">
          Ordnen Sie jeder Frage eine STAR-Story aus Ihrem Interviewplan zu. Für ausformulierte Antworten und ein Firmenprofil führen Sie{" "}
          <code className="text-foreground">/career-ops interview-prep</code> für {company || "diese Rolle"} in Ihrer KI-CLI aus.
        </p>
      </div>
    </details>
  );
}
