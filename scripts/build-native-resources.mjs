import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { build } from 'esbuild';
const root = 'apple/Resources/public';
const html = await readFile('public/index.html', 'utf8');
const assets = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
  .map((m) => m[1])
  .filter((path) => !path.includes('://') && !path.startsWith('/'));
const files = new Set([
  'index.html',
  'interface-copy.json',
  'fonts/OnonSoninSans.ttf',
  'fonts/OnonSoninSans.woff2',
  'fonts/OnonSoninSans-NOTICE.txt',
  'assets/THIRD_PARTY_LICENSES.txt',
  'vendor/lunar-1.7.7-LICENSE.txt',
  ...assets,
]);
await rm(root, { recursive: true, force: true });
for (const file of files) {
  await mkdir(dirname(root + '/' + file), { recursive: true });
  await cp('public/' + file, root + '/' + file);
}
await build({
  entryPoints: ['shared/calendar-events.mjs'],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  globalName: 'NutugSchedule',
  target: 'safari17',
  minify: true,
  outfile: root + '/calendar-events.js',
});
await cp('src/native-text-input.html', root + '/text-input.html');
// Mongolian names for almanac terms, shared with the web calendar's bundled copy.
const almanac = new Function(
  (await readFile('content-source/almanac-data.js', 'utf8')) + '\nreturn CHINESE_ALMANAC_CONFIG;',
)();
await writeFile(
  root + '/almanac.json',
  JSON.stringify({
    ui: almanac.ui,
    activities: almanac.activities,
    directions: almanac.directions,
    animals: almanac.animals,
    solarTerms: almanac.solarTerms,
    stems: almanac.stems,
    branches: almanac.branches,
    sources: almanac.sources,
  }) + '\n',
);
await writeFile(
  root + '/content-config.json',
  JSON.stringify({
    manifestUrl:
      process.env.NUTUG_CONTENT_MANIFEST ||
      'https://raw.githubusercontent.com/Vles0123/nutug/refs/heads/chore/content-feed/manifest.json',
  }) + '\n',
);
console.log(`Prepared ${files.size + 4} UI, font and calendar resources for native targets`);
