const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, 'public', name), 'utf8');
const data = vm.runInNewContext(read('data.js') + ';({ PEOPLE, SOURCES })');
const people = Object.entries(data.PEOPLE).map(([id, person]) => ({
  id,
  title: person.name,
  subtitle: person.alias,
  dates: person.years || '',
  paragraphs: [person.summary, person.note].filter(Boolean),
  sources: person.sources.map((key) => ({
    title: data.SOURCES[key].name,
    url: data.SOURCES[key].url,
  })),
}));
fs.writeFileSync(
  path.join(root, 'public/native-search.json'),
  JSON.stringify(people, null, 2) + '\n',
);
