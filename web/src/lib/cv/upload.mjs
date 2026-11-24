export const CV_UPLOAD_ACCEPT = ".pdf,.tex,.md,.markdown,.txt,.docx";
export const MAX_CV_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_CV_SOURCE_CHARS = 60_000;

/** @param {{name: string, size: number}} file */
export function cvUploadError(file) {
  if (!/\.(pdf|tex|md|markdown|txt|docx)$/i.test(file.name)) return "Wählen Sie eine PDF-, TeX-, Markdown-, Text- oder Word-Datei.";
  if (!file.size) return "Diese Datei ist leer. Wählen Sie einen Lebenslauf mit Text.";
  if (file.size > MAX_CV_UPLOAD_BYTES) return "Diese Datei ist zu groß. Wählen Sie einen Lebenslauf unter 10 MB.";
  return null;
}
