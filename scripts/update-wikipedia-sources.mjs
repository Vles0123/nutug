import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { assertSource } from '../shared/content-contract.mjs';
const entries = JSON.parse(await readFile('content-source/wikipedia-pages.json', 'utf8'));
const sources = {};
for (const language of new Set(entries.map((entry) => entry.language || 'en'))) {
  if (!['en', 'mn'].includes(language)) throw new Error('Unsupported Wikipedia language');
  for (const pinned of [true, false]) {
    const group = entries.filter(
      (entry) => (entry.language || 'en') === language && Boolean(entry.revisionId) === pinned,
    );
    for (let offset = 0; offset < group.length; offset += 50) {
      const batch = group.slice(offset, offset + 50);
      const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
      url.search = new URLSearchParams({
        action: 'query',
        prop: 'info|revisions',
        inprop: 'url',
        ...(pinned
          ? { revids: batch.map((entry) => entry.revisionId).join('|') }
          : { titles: batch.map((entry) => entry.page).join('|'), redirects: '1' }),
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
      const redirects = new Map(
        [...(result.query.normalized || []), ...(result.query.redirects || [])].map((entry) => [
          entry.from,
          entry.to,
        ]),
      );
      for (const entry of batch) {
        let title = entry.page;
        const visited = new Set();
        while (redirects.has(title) && !visited.has(title)) {
          visited.add(title);
          title = redirects.get(title);
        }
        const page = result.query.pages.find((page) =>
          pinned
            ? page.revisions?.some((revision) => revision.revid === entry.revisionId)
            : page.title === title,
        );
        const revision = pinned
          ? page?.revisions?.find((revision) => revision.revid === entry.revisionId)
          : page?.revisions?.[0];
        if (!revision) throw new Error('Wikipedia page unavailable: ' + entry.page);
        if (sources[entry.id]) throw new Error('Duplicate Wikipedia source ID: ' + entry.id);
        sources[entry.id] = assertSource({
          kind: 'wikipedia',
          title: entry.title,
          name: entry.title,
          url: `https://${language}.wikipedia.org/w/index.php?oldid=${revision.revid}`,
          canonicalUrl: page.canonicalurl,
          pageId: page.pageid,
          revisionId: revision.revid,
          originalTitle: page.title,
          language,
          retrievedAt: new Date().toISOString(),
          license: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
          attributionUrl: page.canonicalurl + '?action=history',
        });
      }
    }
  }
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
