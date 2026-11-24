// Only this action awaits a canonical tracker write. A failed transport is not
// evidence that the write did not land; only known pre-write failures may retry.
export class StatusWriteError extends Error {
  constructor(message, { unconfirmed = false, retryable = false } = {}) {
    super(message);
    this.unconfirmed = unconfirmed;
    this.retryable = retryable;
  }
}

export async function writeAssistantStatus(n, status, fetchFn = fetch) {
  let response;
  try {
    response = await fetchFn("/api/status", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n, status }), signal: AbortSignal.timeout(35_000),
    });
  } catch {
    throw new StatusWriteError("Die Statusänderung konnte nicht bestätigt werden. Prüfen Sie den aktuellen Status im Tracker, bevor Sie es erneut versuchen.", { unconfirmed: true });
  }
  const data = await response.json().catch(() => null);
  if (response.ok && data?.ok === true && data.status === status) return;
  const reason = typeof data?.error === "string" ? data.error : `HTTP ${response.status}`;
  if (response.status === 503 && data?.code === "lock-timeout") {
    throw new StatusWriteError(`Status nicht gespeichert: ${reason}. Sie können es erneut versuchen, sobald der Tracker verfügbar ist.`, { retryable: true });
  }
  if ([400, 404, 409].includes(response.status) || (response.status === 503 && data?.code === "core-script-missing")) {
    throw new StatusWriteError(`Status nicht gespeichert: ${reason}. Prüfen Sie den Tracker, bevor Sie eine korrigierte Anfrage senden.`);
  }
  throw new StatusWriteError(`Die Statusänderung konnte nicht bestätigt werden (${reason}). Prüfen Sie den aktuellen Status im Tracker, bevor Sie es erneut versuchen.`, { unconfirmed: true });
}
