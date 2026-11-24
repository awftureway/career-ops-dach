import { MAX_CV_SOURCE_CHARS } from "./upload.mjs";

/** Extract text locally, without rendering or executing document actions.
 * @param {ArrayBuffer} bytes
 */
export async function pdfText(bytes) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, stopAtErrors: true, verbosity: 0 });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 30) throw new Error("Dieses PDF hat mehr als 30 Seiten. Laden Sie nur die Seiten Ihres Lebenslaufs hoch.");
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const { items } = await page.getTextContent();
      text += items.map((item) => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("") + "\n\n";
      page.cleanup();
      if (text.length > MAX_CV_SOURCE_CHARS) throw new Error("Dieser Lebenslauf enthält zu viel Text. Laden Sie einen kürzeren hoch.");
    }
    if (!text.trim()) throw new Error("Dieses PDF enthält keinen lesbaren Text (möglicherweise gescannt). Laden Sie den TeX-Quelltext hoch oder fügen Sie den Lebenslauftext ein.");
    return text.trim();
  } catch (error) {
    if (error?.name === "PasswordException") throw new Error("Dieses PDF ist passwortgeschützt. Laden Sie eine entsperrte Kopie oder den TeX-Quelltext hoch.");
    if (error?.name === "InvalidPDFException") throw new Error("Dieses PDF konnte nicht gelesen werden. Laden Sie ein gültiges PDF oder den TeX-Quelltext hoch.");
    throw error;
  } finally {
    await task.destroy();
  }
}
