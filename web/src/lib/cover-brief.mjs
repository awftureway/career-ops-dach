/**
 * cover-brief.mjs — the cover letter request a web user sends from the report page.
 *
 * modes/cover.md Step 6 refuses to draft until the candidate has answered four
 * prompts. A headless run cannot ask them, so the report page collects them up
 * front and this module checks the request at the route boundary.
 */
import path from "node:path";
import { COVER_TONES } from "./cover-tones.mjs";

export { COVER_TONES };

const MAX_ANSWER = 1000;
const ANSWER_FIELDS = ["why", "problem", "approach"];

/**
 * @typedef {{why: string, problem: string, approach: string, tone: keyof typeof COVER_TONES}} CoverBrief
 */

/**
 * @param {{input: string, brief: unknown, root: string, findReportFile: (n: string) => string | null}} args
 * @returns {{ok: true, reportFile: string, brief: CoverBrief} | {ok: false, error: string}}
 */
export function parseCoverRequest({ input, brief, root, findReportFile }) {
  if (typeof input !== "string") {
    return { ok: false, error: "Ungültige Berichtsauswahl: Erwartet wird eine Berichtsnummer als Zeichenkette." };
  }
  if (!/^\d+$/.test(input)) return { ok: false, error: `Ungültige Berichtsauswahl: „${input}“` };

  const incomplete = { ok: false, error: "Beantworten Sie zuerst alle vier Fragen zum Anschreiben." };
  if (brief === null || typeof brief !== "object") return incomplete;
  const answers = ANSWER_FIELDS.map((field) => (typeof brief[field] === "string" ? brief[field].trim() : ""));
  if (answers.some((a) => !a) || typeof brief.tone !== "string" || !Object.hasOwn(COVER_TONES, brief.tone)) {
    return incomplete;
  }
  if (answers.some((a) => a.length > MAX_ANSWER)) return { ok: false, error: `Halten Sie jede Antwort bei höchstens ${MAX_ANSWER} Zeichen.` };

  const reportFile = findReportFile(input);
  if (!reportFile) return { ok: false, error: `Bericht #${input} nicht gefunden. Bewerten Sie diese Stellenanzeige zuerst.` };

  const [why, problem, approach] = answers;
  return {
    ok: true,
    reportFile: path.relative(root, reportFile).split(path.sep).join("/"),
    brief: { why, problem, approach, tone: brief.tone },
  };
}
