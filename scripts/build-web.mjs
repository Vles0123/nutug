import { build, context } from 'esbuild';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { dictionary, getLocalizationScript } from 'react-aria-components/i18n';
import { LocalizedStringDictionary } from '@internationalized/string';

await mkdir('public/assets', { recursive: true });
const strings = {
  ...dictionary.getStringsForLocale('en-US'),
  '@react-aria/overlays': { dismiss: 'ᠬᠠᠭᠠᠬᠤ' },
  '@react-aria/searchfield': { 'Clear search': 'ᠠᠷᠢᠯᠭᠠᠬᠤ' },
};
await writeFile(
  'public/assets/locale.js',
  getLocalizationScript(
    'mn-Mong',
    new LocalizedStringDictionary({ 'mn-Mong': strings }, 'mn-Mong'),
  ),
);
const files = ['index.html', 'tribes.html', 'tribes-mobile.html', 'calendar.html', 'almanac.html'];
const data = [
  'data.js',
  'tribes-data.js',
  'knowledge-data.js',
  'tribal-knowledge-data.js',
  'calendar-data.js',
  'almanac-data.js',
  'vendor/lunar-1.7.7.js',
  'chinese-almanac-core.js',
];
const template = await readFile('src/document.html', 'utf8');
const formatting = await resolveConfig('src/document.html');
for (const file of files)
  await writeFile(
    'public/' + file,
    await format(
      template.replace(
        '<!-- DATA -->',
        data.map((src) => `<script src="${src}"></script>`).join('\n'),
      ),
      { ...formatting, parser: 'html' },
    ),
  );
const options = {
  entryPoints: ['src/main.jsx'],
  bundle: true,
  outfile: 'public/assets/nutug.js',
  format: 'iife',
  external: ['../fonts/*'],
  target: ['safari17', 'chrome110'],
  minify: true,
  legalComments: 'linked',
  loader: { '.woff2': 'file' },
  metafile: true,
  define: { 'process.env.NODE_ENV': '"production"' },
};
if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('Watching React interface sources');
} else {
  const result = await build(options);
  const packages = new Set(
    Object.keys(result.metafile.inputs)
      .filter((p) => p.startsWith('node_modules/'))
      .map((p) =>
        p
          .split('/')
          .slice(0, p.split('/')[1].startsWith('@') ? 3 : 2)
          .join('/'),
      ),
  );
  const notices = [];
  for (const folder of packages) {
    const pkg = JSON.parse(await readFile(folder + '/package.json', 'utf8'));
    for (const file of await readdir(folder)) {
      if (/^(?:licen[cs]e|notice)(?:\.|$)/i.test(file))
        notices.push(`${pkg.name} ${pkg.version}\n${await readFile(folder + '/' + file, 'utf8')}`);
    }
  }
  await writeFile('public/assets/THIRD_PARTY_LICENSES.txt', notices.join('\n\n'));
  console.log('Built React interface for five routes');
}
