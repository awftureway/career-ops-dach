export const NO_REPORT_EXPLANATION =
  "Für diese Zeile gibt es keine Berichtsdatei. „Lebenslauf erstellen“ und die Bewerbungs-Checkliste bleiben aus, bis eine Bewertung vorliegt.";

/**
 * @param {boolean} hasReport
 * @returns {{ generateCv: boolean, checklist: boolean, explanation: string | null }}
 */
export function reportSpendActions(hasReport) {
  if (hasReport) return { generateCv: true, checklist: true, explanation: null };
  return { generateCv: false, checklist: false, explanation: NO_REPORT_EXPLANATION };
}
