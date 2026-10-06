import { build, context } from 'esbuild';
import { readFile, writeFile, mkdir, readdir, rm, rename } from 'node:fs/promises';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
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
const pages = ['index.html', 'tribes.html', 'tribes-mobile.html', 'calendar.html', 'almanac.html'];
const template = await readFile('src/document.html', 'utf8'),
  formatting = await resolveConfig('src/document.html');
async function finish(result) {
  if (result.errors.length) return;
  const [entry, entryInfo] = Object.entries(result.metafile.outputs).find(
    ([path, info]) => path.endsWith('.js') && info.entryPoint,
  );
  const js = 'assets/' + basename(entry),
    css = 'assets/' + basename(entryInfo.cssBundle);
  const html = await format(
    template
      .replace(
        '<!-- DATA -->',
        '<script src="vendor/lunar-1.7.7.js"></script>\n<script src="chinese-almanac-core.js"></script>',
      )
      .replace('assets/nutug.js', js)
      .replace('assets/nutug.css', css),
    { ...formatting, parser: 'html' },
  );
  for (const page of pages) {
    await writeFile('public/' + page + '.tmp', html);
    await rename('public/' + page + '.tmp', 'public/' + page);
  }
  const assets = [
    ...pages,
    js,
    css,
    'assets/locale.js',
    'fonts/OnonSoninSans.woff2',
    'vendor/lunar-1.7.7.js',
    'chinese-almanac-core.js',
  ];
  const hash = createHash('sha256');
  for (const path of assets) hash.update(await readFile('public/' + path));
  const sw = await readFile('src/service-worker.template.js', 'utf8');
  await writeFile(
    'public/sw.js',
    sw
      .replace('__VERSION__', hash.digest('hex').slice(0, 16))
      .replace('__ASSETS__', JSON.stringify(assets)),
  );
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
  for (const file of [
    'data.js',
    'knowledge-data.js',
    'tribes-data.js',
    'tribal-knowledge-data.js',
    'calendar-data.js',
    'almanac-data.js',
    'native-search.json',
  ])
    await rm('public/' + file, { force: true });
  console.log('Built UI-only application with fingerprinted assets');
}
const options = {
  entryPoints: ['src/bootstrap.jsx'],
  bundle: true,
  outdir: 'public/assets',
  entryNames: 'nutug-[hash]',
  format: 'iife',
  external: ['../fonts/*'],
  target: ['safari17', 'chrome110'],
  minify: true,
  legalComments: 'linked',
  metafile: true,
  define: {
    'process.env.NODE_ENV': '"production"',
    __NUTUG_CONTENT_MANIFEST__: JSON.stringify(
      process.env.NUTUG_CONTENT_MANIFEST ||
        'https://raw.githubusercontent.com/Vles0123/nutug/refs/heads/chore/content-feed/manifest.json',
    ),
  },
  plugins: [
    {
      name: 'application-shell',
      setup(build) {
        build.onEnd(finish);
      },
    },
  ],
};
if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('Watching interface sources');
} else await build(options);
