// The cost-honesty taxonomy — a single source for the FREE vs $ boundary that the
// Explorer teaches by repetition. Discovery (finding roles) is structurally free:
// it calls no LLM. Only evaluation (scoring a role against your CV) spends tokens,
// and only when the user chooses it. The framing is always local-first: "your key,
// your AI, your machine."

export type CostClass = "free" | "free-network" | "spend" | "free-gemini";

export const COST_META: Record<CostClass, { label: string; tip: string }> = {
  "free-network": {
    label: "Kostenlos",
    tip: "Durchsucht das öffentliche ATS-Netzwerk per HTTP. Keine KI, keine Tokens, nichts wird gesendet. Es wird nichts gespeichert, bis Sie eine Rolle hinzufügen.",
  },
  free: {
    label: "Kostenlos",
    tip: "Keine Tokens. Liest oder schreibt nur lokale Dateien.",
  },
  spend: {
    label: "Verbraucht Tokens",
    tip: "Führt eine echte A–F-Bewertung mit Ihrer eigenen KI aus. Nur das verbraucht Tokens, und nur, wenn Sie eine Rolle auswählen.",
  },
  "free-gemini": {
    label: "Kostenlos · Gemini",
    tip: "Bewerten Sie mit dem kostenlosen Gemini-Kontingent von Google, ohne Token-Kosten.",
  },
};
