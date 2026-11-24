const READING = new Set(["opening", "driving"]);
const READY = new Set(["ready", "prefilling", "filling", "done"]);

/**
 * @param {{ status?: string, issues?: { code?: string, level?: string }[] }} [input]
 * @returns {{ enabled: boolean, reason: "reading" | "error" | "idle" | "ready", hint: string }}
 */
export function markAppliedEnabled({ status, issues } = {}) {
  if (READING.has(status)) {
    return { enabled: false, reason: "reading", hint: "Verfügbar, sobald das Formular geladen ist." };
  }
  const blocked = Array.isArray(issues) && issues.some((issue) => issue && (issue.code === "not-found" || issue.level === "block"));
  if (status === "error" || blocked) {
    return { enabled: false, reason: "error", hint: "Dieses Formular wurde nicht geladen und kann daher nicht als beworben markiert werden." };
  }
  if (!READY.has(status)) {
    return { enabled: false, reason: "idle", hint: "Öffnen Sie ein Formular, bevor Sie es als beworben markieren." };
  }
  return { enabled: true, reason: "ready", hint: "Klicken Sie hier, nachdem Sie das echte Formular selbst abgeschickt haben." };
}
