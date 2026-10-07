import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { assertSource } from '../shared/content-contract.mjs';
const entries = JSON.parse(await readFile('content-source/wikipedia-pages.json', 'utf8'));
const url = new URL('https://en.wikipedia.org/w/api.php');
url.search = new URLSearchParams({
  action: 'query',
  prop: 'info|revisions',
  inprop: 'url',
  titles: entries.map((item) => item.page).join('|'),
  rvprop: 'ids|timestamp',
  format: 'json',
  formatversion: '2',
});
const response = await fetch(url, {
  headers: { 'User-Agent': 'Nutug/1.0 (https://github.com/Vles0123/nutug)' },
  signal: AbortSignal.timeout(20000),
});
if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
const result = await response.json();
if (result.error) throw new Error(result.error.info);
const sources = {};
for (const entry of entries) {
  const page = result.query.pages.find((page) => page.title === entry.page);
  if (!page?.revisions?.[0]) throw new Error('Wikipedia page unavailable: ' + entry.page);
  const revisionId = page.revisions[0].revid;
  sources[entry.id] = assertSource({
    kind: 'wikipedia',
    title: entry.title,
    name: entry.title,
    url: `https://en.wikipedia.org/w/index.php?oldid=${revisionId}`,
    canonicalUrl: page.canonicalurl,
    pageId: page.pageid,
    revisionId,
    originalTitle: page.title,
    language: page.pagelanguage,
    retrievedAt: new Date().toISOString(),
    license: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    attributionUrl: page.canonicalurl + '?action=history',
  });
}
const begin = '// Wikipedia source revisions.',
  end = '// End Wikipedia source revisions.';
const path = 'content-source/data.js';
const original = await readFile(path, 'utf8');
const block = begin + '\nObject.assign(SOURCES, ' + JSON.stringify(sources, null, 2) + ');\n' + end;
const start = original.indexOf(begin),
  stop = original.indexOf(end, start);
const updated =
  start >= 0
    ? original.slice(0, start) + block + original.slice(stop + end.length)
    : original + '\n' + block + '\n';
await writeFile(path, await format(updated, { ...(await resolveConfig(path)), parser: 'babel' }));
console.log(`Recorded ${entries.length} Wikipedia pages and their source revisions`);
