export function assertScheduledJobBody(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Anfrage für geplanten Scan muss ein Objekt sein.");
  }
  return value;
}
