/** @typedef {{ kind: "empty-tab" } | { kind: "elsewhere", count: number } | { kind: "no-match" } | { kind: "below-min" }} TrackerEmptyState */
/** @typedef {"show-all" | "clear-search" | "clear-min"} TrackerEmptyActionId */
/** @typedef {{ heading: string, actions: { id: TrackerEmptyActionId, label: string }[] }} TrackerEmptyPresentation */

/**
 * @param {{ tabLabel: string | null, query: string, minScore: number | null, matchesInAll: number }} facts
 *   `tabLabel` is null on All. `matchesInAll` counts rows passing the same
 *   search and score filter with no tab restriction.
 * @returns {TrackerEmptyState}
 */
export function trackerEmptyState({ tabLabel, query, minScore, matchesInAll }) {
  if (query) {
    return tabLabel != null && matchesInAll > 0 ? { kind: "elsewhere", count: matchesInAll } : { kind: "no-match" };
  }
  return minScore != null ? { kind: "below-min" } : { kind: "empty-tab" };
}

/**
 * Heading and undo actions for an empty tracker table.
 * A search that misses while a score floor is set names both, because clearing
 * only the search leaves the table empty.
 * @param {TrackerEmptyState} state
 * @param {{ tabLabel: string | null, query: string, minScore: number | null }} facts
 * @returns {TrackerEmptyPresentation}
 */
export function trackerEmptyPresentation(state, { tabLabel, query, minScore }) {
  const clearSearch = { id: "clear-search", label: "Suche zurücksetzen" };
  const clearMin = { id: "clear-min", label: "Score-Filter zurücksetzen" };
  switch (state.kind) {
    case "empty-tab":
      return { heading: tabLabel ? `Noch keine Bewerbungen in „${tabLabel}“` : "Noch keine Bewerbungen", actions: [] };
    case "elsewhere":
      return {
        heading: `Keine Treffer für „${query}“ in „${tabLabel}“`,
        actions: [{ id: "show-all", label: `${state.count} in „Alle“ anzeigen` }, clearSearch],
      };
    case "no-match":
      if (minScore != null) {
        return {
          heading: `Keine Treffer für „${query}“ ab Score ${minScore.toFixed(1)}`,
          actions: [clearSearch, clearMin],
        };
      }
      return { heading: `Keine Treffer für „${query}“`, actions: [clearSearch] };
    case "below-min":
      return {
        heading: `${tabLabel ? `Keine Bewerbungen in „${tabLabel}“` : "Keine Bewerbungen"} mit Score ${minScore?.toFixed(1)} oder höher`,
        actions: [clearMin],
      };
    default: {
      const unhandled = /** @type {never} */ (state);
      throw new Error(`Unknown tracker empty state: ${JSON.stringify(unhandled)}`);
    }
  }
}
