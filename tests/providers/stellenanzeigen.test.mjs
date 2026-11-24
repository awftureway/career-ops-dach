// tests/providers/stellenanzeigen.test.mjs — stellenanzeigen.de result-page provider.
import { pass, fail, ROOT } from '../helpers.mjs';
import { join } from 'path';
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';

console.log('\nProvider — stellenanzeigen');

try {
  const mod = await import(pathToFileURL(join(ROOT, 'providers/stellenanzeigen.mjs')).href);
  const provider = mod.default;
  const { parseStellenanzeigenPage } = mod;

  if (provider.id === 'stellenanzeigen') pass('stellenanzeigen.id is "stellenanzeigen"');
  else fail(`id is ${JSON.stringify(provider.id)}`);

  const html = readFileSync(join(ROOT, 'tests/fixtures/stellenanzeigen-page.html'), 'utf8');
  const jobs = parseStellenanzeigenPage(html);
  const first = jobs[0];
  if (jobs.length >= 1 && first.title && first.company && first.url.startsWith('https://www.stellenanzeigen.de/job/')) {
    pass(`parseStellenanzeigenPage reads ${jobs.length} cards with title, employer and https job URL`);
  } else fail(`parse result = ${JSON.stringify(jobs.slice(0, 1))}`);
  if (jobs.every((j) => j.company && j.location !== undefined)) pass('every parsed card has an employer');
  else fail('a card without employer was kept');
  if (first.externalId && /^\d+$/.test(first.externalId)) pass('externalId is the numeric id of the posting slug');
  else fail(`externalId = ${first.externalId}`);

  // Cards without employer or from another host are dropped.
  const synthetic = (href, company) => `<div class="jat-hitzone jobTeaser-hitzone"><h3><a class="jat-position-title-link" href="${href}">Titel</a></h3><span class="jat-company-name-text">${company}</span></div>`;
  const dropped = parseStellenanzeigenPage(synthetic('/job/x-12345/', '') + synthetic('https://evil.example/job/x-12345/', 'Evil GmbH'));
  if (dropped.length === 0) pass('cards without employer or on a foreign host are dropped');
  else fail(`kept ${JSON.stringify(dropped)}`);
  const decoded = parseStellenanzeigenPage(synthetic('/job/y-99999/', 'A &amp; B GmbH'));
  if (decoded[0]?.company === 'A & B GmbH') pass('HTML entities in the employer are decoded');
  else fail(`company = ${decoded[0]?.company}`);

  // fetch(): requires keywords, pages through a keyword until a short page.
  let threw = false;
  try { await provider.fetch({}, { fetchText: async () => '' }); } catch { threw = true; }
  if (threw) pass('fetch throws without stellenanzeigen.keywords');
  else fail('fetch accepted an entry without keywords');

  const urls = [];
  const full = (n) => Array.from({ length: 25 }, (_, i) => synthetic(`/job/p${n}-${i}-1${String(n).padStart(2, '0')}${String(i).padStart(2, '0')}0/`, 'Firma')).join('');
  const out = await provider.fetch(
    { stellenanzeigen: { keywords: ['KI Berater'], max_pages: 3 } },
    { fetchText: async (u) => { urls.push(u); return urls.length === 1 ? full(1) : synthetic('/job/last-77777/', 'Firma'); } },
  );
  if (urls.length === 2 && urls[0].includes('fulltext=KI+Berater') && urls[1].includes('page=2') && out.length === 26) {
    pass('fetch builds ?fulltext=…&page=N URLs and stops at the short page');
  } else fail(`urls=${JSON.stringify(urls)} jobs=${out.length}`);
} catch (e) {
  fail(`stellenanzeigen provider test crashed: ${e.message}`);
}
