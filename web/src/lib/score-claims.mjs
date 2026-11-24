/**
 * What the score screen is allowed to claim.
 * The rubric in modes/_shared.md scores five dimensions. Requirement
 * importance, posting legitimacy, evidence confidence, and role clarity do not
 * move the 1-5 number. The bands come from the shared score-action table.
 */
import { APPLY_MIN, MAYBE_MIN, SCORE_BANDS, STRONG_APPLY_MIN } from "./core/score-action.mjs";

export function scoringDimensions() {
  return [
    { name: "Lebenslauf-Match", detail: "Wie gut Ihr Lebenslauf zu den genannten Anforderungen passt. Das verändert den Score." },
    { name: "North-Star-Passung", detail: "Wie nah die Stelle an dem Karriereziel in Ihrem Profil liegt. Das verändert den Score." },
    { name: "Vergütung", detail: "Das Gehalt, das die Stellenanzeige nennt. Nennt sie keines, ist es unbekannt und verändert den Score nicht." },
    { name: "Kultursignale", detail: "Hinweise auf die Unternehmenskultur in der Stellenanzeige. Ohne Hinweise gilt: unbekannt, nicht ein mittlerer Wert. Unbekannt verändert den Score nicht." },
    { name: "Warnsignale", detail: "Warnungen können den Score senken. Ein Ausschlusskriterium erzwingt „Skip“ und ändert den Score nicht." },
  ];
}

export function ignoredByScore() {
  return [
    "Seriosität der Stellenanzeige (Berichtsblock G)",
    "Wie wichtig eine Anforderung ist (Block B)",
    "Belastbarkeit der Belege",
    "Klarheit der Rolle",
  ];
}

export function scoreBandSummary() {
  const strong = SCORE_BANDS.find((band) => band.id === "strong_apply");
  const apply = SCORE_BANDS.find((band) => band.id === "apply");
  const maybe = SCORE_BANDS.find((band) => band.id === "maybe");
  const skip = SCORE_BANDS.find((band) => band.id === "skip");
  return [
    `${strong.label} beginnt bei ${STRONG_APPLY_MIN.toFixed(1)}. Die Empfehlung lautet ${strong.decision}.`,
    `${apply.label} beginnt bei ${APPLY_MIN.toFixed(1)}. Die Empfehlung lautet ${apply.decision}.`,
    `${maybe.label} beginnt bei ${MAYBE_MIN.toFixed(1)}. Die Empfehlung lautet ${maybe.decision}. Bewerben Sie sich nur mit einem guten Grund.`,
    `${skip.label} liegt unter ${MAYBE_MIN.toFixed(1)}. Die Empfehlung lautet ${skip.decision}.`,
  ];
}

export function leverCopy() {
  return {
    sectionTitle: "Score und Empfehlung",
    holdingTitle: "Was den Score drückt",
    holdingHint: "Ausschlusskriterien erzwingen „Skip“. Sie ändern den Score nicht.",
    closeTitle: "Lücken im Lebenslauf",
    closeHint: "Lücken zwischen Ihrem Lebenslauf und der Stelle. Die Match-Dimension kann den Score verändern.",
    verifyTitle: "Belege prüfen",
    verifyHint: "Offene Fragen. Die Belastbarkeit der Belege ändert den Score von 1 bis 5 nicht.",
    strengthsTitle: "Was für Sie spricht",
    strengthsHint: "Die stärksten Übereinstimmungen für diese Stelle.",
  };
}
