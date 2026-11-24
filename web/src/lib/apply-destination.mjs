const HTTP = /^https?:\/\//i;

/**
 * @typedef {{ kind: "apply", href: "/apply", url: string, n: string }} ApplyGo
 * @typedef {{ kind: "need-cv" | "need-link", message: string, nextHref: string | null, nextLabel: string | null }} ApplyStop
 */

/**
 * @param {{ n?: string, pdfOnDisk?: boolean, postingUrl?: string, alreadyOnReport?: boolean }} [input]
 * @returns {ApplyGo | ApplyStop}
 */
export function applyDestination({ n, pdfOnDisk = false, postingUrl, alreadyOnReport = false } = {}) {
  const id = String(n ?? "").trim();
  const reportHref = `/pipeline/${encodeURIComponent(id)}`;
  if (!pdfOnDisk) {
    if (alreadyOnReport) {
      return {
        kind: "need-cv",
        message: "Erstellen Sie auf dieser Seite den angepassten Lebenslauf, bevor Sie sich bewerben. Das Bewerben öffnet den Formular-Leser, sobald die Datei auf der Festplatte liegt.",
        nextHref: null,
        nextLabel: null,
      };
    }
    return {
      kind: "need-cv",
      message: "Für diese Stelle muss zuerst ein angepasster Lebenslauf auf der Festplatte liegen.",
      nextHref: reportHref,
      nextLabel: "Bericht öffnen, um den Lebenslauf zu erstellen",
    };
  }
  const url = typeof postingUrl === "string" ? postingUrl.trim() : "";
  if (!HTTP.test(url)) {
    return {
      kind: "need-link",
      message: "Diese Stelle hat keinen Bewerbungslink, daher kann der Formular-Leser sie nicht öffnen.",
      nextHref: alreadyOnReport ? null : reportHref,
      nextLabel: alreadyOnReport ? null : "Bericht öffnen",
    };
  }
  return { kind: "apply", href: "/apply", url, n: id };
}

/**
 * @param {{ dest: ApplyGo | ApplyStop, company?: string, from?: string }} input
 * @returns {{ href: string, url: string, opts: { prefill: true, company: string, n: string, from: string } } | null}
 */
export function applyOpenArgs({ dest, company = "", from = "" }) {
  if (!dest || dest.kind !== "apply") return null;
  return {
    href: dest.href,
    url: dest.url,
    opts: { prefill: true, company, n: dest.n, from },
  };
}
