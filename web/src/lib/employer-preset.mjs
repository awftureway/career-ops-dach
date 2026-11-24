// Client-safe, fixed opt-in catalog. Never inferred from language or profile.
export const CHINA_PRESET = "china-employers";
export const CHINA_SOURCES = ["tencent", "bytedance", "meituan"];
export const DACH_PRESET = "dach-boards";
export const DACH_SOURCES = ["arbeitsagentur", "arbeitnow", "germantechjobs", "stellenanzeigen"];
const DACH_DEFAULT_KEYWORDS = ["KI", "Künstliche Intelligenz", "Digitalisierung", "Industrie 4.0"];
export const PRESET_SOURCES = {
  [CHINA_PRESET]: CHINA_SOURCES,
  [DACH_PRESET]: DACH_SOURCES,
};
export const isEmployerPreset = (preset) => Object.hasOwn(PRESET_SOURCES, preset ?? "");
export const EMPLOYER_LABEL = {
  arbeitsagentur: "Bundesagentur für Arbeit",
  arbeitnow: "Arbeitnow",
  germantechjobs: "GermanTechJobs",
  stellenanzeigen: "stellenanzeigen.de",
  tencent: "Tencent / 腾讯",
  bytedance: "ByteDance / 字节跳动",
  meituan: "Meituan / 美团",
};
export const EMPLOYER_ENTRIES = {
  tencent: {
    name: "Tencent",
    careers_url: "https://careers.tencent.com/search.html",
  },
  bytedance: {
    name: "ByteDance",
    careers_url: "https://jobs.bytedance.com",
    provider: "feishu-jobs",
  },
  meituan: {
    name: "Meituan",
    careers_url: "https://zhaopin.meituan.com/web/social",
  },
};

/** Provider entry for one source. DACH board providers need search terms. */
export function employerEntry(id, request) {
  if (Object.hasOwn(EMPLOYER_ENTRIES, id)) return EMPLOYER_ENTRIES[id];
  const keywords = request?.positive?.length ? request.positive : DACH_DEFAULT_KEYWORDS;
  if (id === "arbeitsagentur")
    return { name: "Bundesagentur für Arbeit", provider: "arbeitsagentur", arbeitsagentur: { keywords: keywords.slice(0, 10), days: 30, size: 100 } };
  if (id === "arbeitnow") return { name: "Arbeitnow", provider: "arbeitnow", max_pages: 3 };
  if (id === "germantechjobs") return { name: "GermanTechJobs", provider: "germantechjobs" };
  if (id === "stellenanzeigen")
    return { name: "stellenanzeigen.de", provider: "stellenanzeigen", stellenanzeigen: { keywords: keywords.slice(0, 10), max_pages: 2 } };
  return undefined;
}

/** Reject invalid/empty selections instead of silently substituting sources. */
export function employerRequest(raw) {
  if (!isEmployerPreset(raw?.preset)) throw new Error("Unknown employer preset.");
  const allowed = PRESET_SOURCES[raw.preset];
  if (
    !Array.isArray(raw.employers) ||
    !raw.employers.length ||
    raw.employers.some((id) => !allowed.includes(id))
  ) {
    throw new Error(
      raw.preset === DACH_PRESET
        ? "Select at least one of Bundesagentur, Arbeitnow, GermanTechJobs and stellenanzeigen.de."
        : "Select at least one of Tencent, ByteDance and Meituan.",
    );
  }
  const terms = (value) =>
    Array.isArray(value)
      ? [
          ...new Set(
            value
              .filter((v) => typeof v === "string")
              .map((v) => v.trim())
              .filter(Boolean),
          ),
        ]
      : [];
  // Deliberately exclude recency, negative/profile/YAML filters and scan depth.
  return {
    preset: raw.preset,
    employers: [...new Set(raw.employers)],
    positive: terms(raw.positive),
    allow: terms(raw.allow),
  };
}

/** One source can be incomplete even when it returned zero matches. */
export function employerOutcome(sources, count) {
  const complete = sources.filter((s) => s.state === "complete");
  const incomplete = sources.filter((s) => s.state !== "complete");
  const names = sources.map((s) => EMPLOYER_LABEL[s.id] ?? s.id).join(", ");
  const problems = incomplete
    .map((s) => `${EMPLOYER_LABEL[s.id] ?? s.id}: ${s.reason || s.state}`)
    .join("; ");
  if (!complete.length && sources.every((s) => s.state === "failed"))
    return { state: "failed", message: `Failed — ${problems}.` };
  if (incomplete.length)
    return {
      state: "partial",
      message: `Partial / incomplete — ${count} matches. ${problems}.`,
    };
  return {
    state: "complete",
    message: count
      ? `Completed — ${count} matches from ${names}.`
      : `No matches for this scan — ${names}.`,
  };
}
