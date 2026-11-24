// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

import { htmlToText } from './_html-to-text.mjs';
import { intInRange } from './_config-utils.mjs';
import { sleep } from './_http.mjs';

// stellenanzeigen.de provider — German job board (aggregator, many employers), so it
// goes in the `job_boards:` list of portals.yml.
//
// Reads the public, server-rendered result pages of the site search
// (`/suche/?fulltext=<query>&page=<n>`, 25 postings per page, relevance-ordered).
// The posting cards carry title, employer, location, and often salary and
// employment type, so no per-posting request is needed. scan.mjs applies
// title_filter + location_filter + dedup afterwards.
//
//   - name: stellenanzeigen.de — KI & Digitalisierung
//     provider: stellenanzeigen
//     stellenanzeigen:
//       keywords: ["KI Berater", "Leiter Digitalisierung"]  # required, one search each
//       max_pages: 2        # pages per keyword (1–10, default 2)
//     enabled: true
//
// Public pages only: no login, a small bounded number of requests, a pause between them.
// The `/ajax/jobview/` and `/job/preview/` paths that robots.txt excludes are never touched.

const ORIGIN = 'https://www.stellenanzeigen.de';
const TRUSTED_HOST = 'www.stellenanzeigen.de';
const DEFAULT_MAX_PAGES = 2;
const MAX_PAGES_CAP = 10;
const MAX_KEYWORDS = 10;
const PER_PAGE = 25;
const INTER_REQUEST_DELAY_MS = 400;
const CARD_MARKER = 'jat-hitzone jobTeaser-hitzone';

/** @param {string} s */
function decode(s) {
  return htmlToText(String(s ?? '')).replace(/\s+/g, ' ').trim();
}

/** @param {string} chunk @param {RegExp} re */
function firstGroup(chunk, re) {
  const m = re.exec(chunk);
  return m ? decode(m[1]) : '';
}

/**
 * Resolve a card's posting link to an absolute https URL on the trusted host.
 * Anything else (off-host, non-https, a non-/job/ path) is dropped.
 * @param {string} href
 */
function postingUrl(href) {
  try {
    const u = new URL(href, ORIGIN);
    if (u.protocol !== 'https:' || u.hostname !== TRUSTED_HOST) return '';
    if (!u.pathname.startsWith('/job/')) return '';
    return `${u.origin}${u.pathname}`;
  } catch {
    return '';
  }
}

/**
 * Parse one result page into normalized jobs. Exported for unit tests.
 *
 * Card fields → Job: `jat-position-title-link` → title + url, `jat-company-name-text`
 * → company, `jat-locations-text` → location, the money-bill tag → `salaryText`,
 * `jat-employment-type-item` → `employmentTypeText`. The trailing numeric id of the
 * posting slug is the externalId. A card without title, https URL or employer is
 * dropped: a posting without a named employer is not employer-attributed.
 *
 * @param {string} html
 * @returns {Array<{ title: string, url: string, company: string, location: string, externalId?: string, salaryText?: string, employmentTypeText?: string }>}
 */
export function parseStellenanzeigenPage(html) {
  if (typeof html !== 'string' || !html) return [];
  const parts = html.split(CARD_MARKER).slice(1);
  /** @type {Map<string, any>} */
  const seen = new Map();
  for (const part of parts) {
    // A card ends where the next one starts; the split already bounds it.
    const link = /class="jat-position-title-link"[^>]*href="([^"]+)"[^>]*>([^<]*)</.exec(part)
      || /href="([^"]+)"[^>]*class="jat-position-title-link"[^>]*>([^<]*)</.exec(part);
    if (!link) continue;
    const url = postingUrl(link[1].replace(/&amp;/g, '&'));
    const title = decode(link[2]);
    const company = firstGroup(part, /class="jat-company-name-text"[^>]*>([^<]*)</);
    if (!url || !title || !company) continue;
    if (seen.has(url)) continue;
    const location = firstGroup(part, /class="jat-locations-text"[^>]*>([^<]*)</);
    const salary = /fa-money-bill[^"]*"[^>]*><\/i><span>([^<]*)</.exec(part);
    const employment = /class="jat-employment-type-item"[^>]*>.*?<span>([^<]*)</s.exec(part);
    /** @type {any} */
    const job = { title, url, company, location };
    const id = /-(\d{4,})\/?$/.exec(new URL(url).pathname);
    if (id) job.externalId = id[1];
    if (salary && decode(salary[1])) job.salaryText = decode(salary[1]);
    if (employment && decode(employment[1])) job.employmentTypeText = decode(employment[1]);
    seen.set(url, job);
  }
  return [...seen.values()];
}

/** @param {any} entry */
function resolveConfig(entry) {
  const cfg = entry?.stellenanzeigen ?? {};
  const keywords = (Array.isArray(cfg.keywords) ? cfg.keywords : [])
    .filter((k) => typeof k === 'string' && k.trim())
    .map((k) => k.trim())
    .slice(0, MAX_KEYWORDS);
  if (!keywords.length) {
    throw new Error('stellenanzeigen: set stellenanzeigen.keywords (a non-empty list of search terms) on the entry');
  }
  return { keywords, maxPages: intInRange(cfg.max_pages, DEFAULT_MAX_PAGES, 1, MAX_PAGES_CAP) };
}

/** @type {Provider} */
export default {
  id: 'stellenanzeigen',

  async fetch(entry, ctx) {
    const { keywords, maxPages } = resolveConfig(entry);
    const out = [];
    const seen = new Set();
    for (const keyword of keywords) {
      for (let page = 1; page <= maxPages; page++) {
        const q = new URLSearchParams({ fulltext: keyword });
        if (page > 1) q.set('page', String(page));
        const html = await ctx.fetchText(`${ORIGIN}/suche/?${q}`, { redirect: 'error' });
        const jobs = parseStellenanzeigenPage(html);
        for (const j of jobs) {
          if (seen.has(j.url)) continue;
          seen.add(j.url);
          const { salaryText: _s, employmentTypeText: _e, ...job } = j;
          out.push(job);
        }
        if (jobs.length < PER_PAGE) break; // short page → last page for this keyword
        await sleep(INTER_REQUEST_DELAY_MS);
      }
    }
    return out;
  },
};
