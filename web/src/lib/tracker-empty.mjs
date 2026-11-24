/**
 * Copy for a pipeline list that has nothing to show.
 *
 * Plain module with no filesystem access: the pipeline view is a client
 * component, and the tracker parser (which reads the alias table) is not.
 *
 * A tracker with rows that the current tab or search hid keeps the filter
 * hint. A file with no rows does not tell the reader to clear a search.
 *
 * @param {{ shape: string, query?: string, min?: number | null, tab?: string }} state
 * @returns {{ kind: "filtered" | "empty" | "malformed", title: string, detail: string }}
 */
export function trackerEmptyMessage({ shape, query, min, tab }) {
  if (shape === "malformed") {
    return {
      kind: "malformed",
      title: "Die Tracker-Datei ist keine Tabelle",
      detail: "data/applications.md ist keine Tracker-Tabelle. Die Datei wurde nicht geändert.",
    };
  }
  if (shape === "rows") {
    return {
      kind: "filtered",
      title: "Keine Treffer",
      detail: "Wechseln Sie den Tab oder setzen Sie die Suche zurück.",
    };
  }
  return {
    kind: "empty",
    title: "Noch keine Bewerbungen",
    detail: "Bewertete und hinzugefügte Rollen erscheinen hier.",
  };
}
