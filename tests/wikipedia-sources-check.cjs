const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'nutug-wikipedia-'));
const entries = [
  { id: 'reviewed-en', page: 'Reviewed article', title: 'ᠲᠡᠦᠬᠡ', revisionId: 99 },
  { id: 'reviewed-mn', language: 'mn', page: 'Түүх', title: 'ᠲᠡᠦᠬᠡ', revisionId: 203 },
  { id: 'redirected-en', page: 'Alias_name', title: 'ᠲᠡᠦᠬᠡ' },
];
const mock = `
globalThis.fetch = async (input) => {
  const url = new URL(input);
  const language = url.hostname.split('.')[0];
  const pinned = url.searchParams.get('revids');
  const title = language === 'mn' ? 'Түүх' : pinned ? 'Reviewed article' : 'Canonical article';
  const revisions = pinned
    ? [{ revid: Number(pinned) + 1 }, { revid: Number(pinned) }]
    : [{ revid: 301 }];
  if (!['en', 'mn'].includes(language)) throw new Error('Unexpected Wikipedia language');
  return { ok: true, json: async () => ({ query: {
    normalized: [{ from: 'Alias_name', to: 'Alias name' }],
    redirects: [{ from: 'Alias name', to: 'Canonical article' }],
    pages: [{ pageid: language === 'mn' ? 20 : 10, title, revisions,
      canonicalurl: 'https://' + language + '.wikipedia.org/wiki/' + encodeURIComponent(title) }]
  } }) };
};
`;
try {
  fs.mkdirSync(path.join(temporary, 'content-source'));
  fs.writeFileSync(
    path.join(temporary, 'content-source/wikipedia-pages.json'),
    JSON.stringify(entries),
  );
  fs.writeFileSync(path.join(temporary, 'content-source/data.js'), 'const SOURCES = {};\n');
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'data:text/javascript;base64,' + Buffer.from(mock).toString('base64'),
      path.join(root, 'scripts/update-wikipedia-sources.mjs'),
    ],
    { cwd: temporary, encoding: 'utf8', timeout: 20000 },
  );
  assert.equal(result.status, 0, result.stderr);
  const sources = vm.runInNewContext(
    fs.readFileSync(path.join(temporary, 'content-source/data.js'), 'utf8') + ';SOURCES',
  );
  assert.equal(sources['reviewed-en'].revisionId, 99, 'Keep the revision actually reviewed');
  assert.equal(sources['reviewed-en'].url, 'https://en.wikipedia.org/w/index.php?oldid=99');
  assert.equal(sources['reviewed-mn'].language, 'mn');
  assert.equal(sources['reviewed-mn'].url, 'https://mn.wikipedia.org/w/index.php?oldid=203');
  assert.equal(sources['redirected-en'].originalTitle, 'Canonical article');
  assert.equal(sources['redirected-en'].revisionId, 301);
  for (const source of Object.values(sources)) {
    assert.equal(source.license.name, 'CC BY-SA 4.0');
    assert(source.attributionUrl.endsWith('?action=history'));
  }
  console.log('PASS: Wikipedia languages, reviewed revision retention, redirects and attribution.');
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
