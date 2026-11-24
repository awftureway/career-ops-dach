export const FOLLOWUPS_NETWORK_ERROR = "Nachfassen konnte nicht aktualisiert werden. Prüfen Sie Ihre Verbindung.";

// A dropped request is not a missing script. Keep the last list.
export function followupsAfterRefreshFailure(current) {
  if (current && typeof current === "object") {
    return { ...current, refreshFailed: true };
  }
  return {
    available: true,
    metadata: null,
    entries: [],
    upcoming: [],
    refreshFailed: true,
  };
}
