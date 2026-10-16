const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const data = vm.runInNewContext(
  fs.readFileSync('content-source/knowledge-data.js', 'utf8') + '; KNOWLEDGE',
);
function sourceKey(value) {
  const url = new URL(value);
  url.hash = '';
  url.hostname = url.hostname.replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/$/, '');
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_') || key === 'hl') url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.href;
}
const sources = new Map();
for (const article of data.articles) {
  const words = [article.title, article.summary, ...article.body]
    .join(' ')
    .trim()
    .split(/\s+/u).length;
  for (const key of new Set(article.sources.map((source) => sourceKey(source.url)))) {
    const record = sources.get(key) || { words: 0, articles: [] };
    record.words += words;
    record.articles.push(article.id);
    sources.set(key, record);
  }
}
// Count the full article against each cited source after normalizing URL variants.
const excessive = [...sources].filter(([, record]) => record.words > 200);
assert.equal(excessive.length, 0, JSON.stringify(excessive, null, 2));
console.log(
  JSON.stringify({
    articles: data.articles.length,
    sources: sources.size,
    sharedSources: [...sources.values()].filter((x) => x.articles.length > 1).length,
    conservativeSourceWordLimit: 200,
    passed: true,
  }),
);
