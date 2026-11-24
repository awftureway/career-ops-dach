/**
 * @param {{ onDisk?: boolean, trackerMarked?: boolean, jobFinished?: boolean }} [input]
 * @returns {{ exists: boolean, stale: boolean, viewLabel: "Angepassten Lebenslauf ansehen" | null, note: string | null }}
 */
export function cvDiskState({ onDisk = false, trackerMarked = false, jobFinished = false } = {}) {
  if (onDisk) return { exists: true, stale: false, viewLabel: "Angepassten Lebenslauf ansehen", note: null };
  const stale = Boolean(trackerMarked || jobFinished);
  return {
    exists: false,
    stale,
    viewLabel: null,
    note: stale
      ? "Laut Tracker liegt ein angepasster Lebenslauf vor, aber in output/ ist keine Datei. Erstellen Sie ihn erneut, bevor Sie sich bewerben."
      : null,
  };
}
