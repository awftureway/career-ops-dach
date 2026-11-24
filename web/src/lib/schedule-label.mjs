// Words on the Scheduled scans page. The stored cadence stays
// `{ every, unit }`. This is only how that pair is said.

export const SCHEDULED_SCANS_INTRO =
  "Prüft Jobbörsen nach Zeitplan und fügt neue Stellen Ihrer Pipeline hinzu.";

export const EMPTY_SCHEDULES_HINT = "Legen Sie einen Zeitplan an, um Jobbörsen auf neue Stellen zu prüfen.";

/**
 * @param {string} engine "full" checks public boards. Anything else checks saved companies.
 */
export function scanEngineLabel(engine) {
  return engine === "full" ? "Alle Jobbörsen" : "Gespeicherte Firmen";
}

/**
 * @param {string} engine
 */
export function scanEngineDetail(engine) {
  return engine === "full"
    ? "Prüft öffentliche Jobbörsen (Greenhouse, Lever, Ashby, Workday)."
    : "Prüft die Firmen, die Sie gespeichert haben.";
}

/**
 * @param {number | string} every
 * @param {string} unit minutes, hours, or days
 * @returns {string}
 */
export function scheduleCadenceLabel(every, unit) {
  const count = Number(every);
  const name = String(unit ?? "").toLowerCase().replace(/s$/, "");
  if (!Number.isFinite(count) || count <= 0 || !name) return "Nach Zeitplan";
  if (name === "minute") return count === 1 ? "Jede Minute" : `Alle ${count} Minuten`;
  if (name === "hour") {
    if (count === 1) return "Stündlich";
    if (count === 24) return "Täglich";
    return `Alle ${count} Stunden`;
  }
  if (name === "day") {
    if (count === 1) return "Täglich";
    if (count === 7) return "Wöchentlich";
    if (count === 14) return "Alle 2 Wochen";
    return `Alle ${count} Tage`;
  }
  if (name === "week") return count === 1 ? "Wöchentlich" : `Alle ${count} Wochen`;
  return `Alle ${count} ${name}${count === 1 ? "" : "s"}`;
}
