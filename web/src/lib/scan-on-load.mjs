// A scan starts from a click on Explore, or from the CV hand-off that
// puts `run=1` on /explore. Opening Pipeline never starts one, even if
// that query is present.

import { isEmployerPreset } from "./employer-preset.mjs";

export function pipelineFindRolesHref() {
  return "/explore";
}

/**
 * @param {string} pathname
 * @param {string} search query string, with or without the leading ?
 */
export function shouldStartScanOnLoad(pathname, search) {
  const path = String(pathname ?? "").replace(/\/+$/, "") || "/";
  if (path === "/pipeline" || path.startsWith("/pipeline/")) return false;
  if (path !== "/explore") return false;
  const params = new URLSearchParams(String(search ?? "").replace(/^\?/, ""));
  if (isEmployerPreset(params.get("preset"))) return false;
  return params.get("run") === "1";
}
