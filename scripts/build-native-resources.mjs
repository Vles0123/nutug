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
await writeFile(
  root + '/content-config.json',
  JSON.stringify({
    manifestUrl:
      process.env.NUTUG_CONTENT_MANIFEST ||
      'https://raw.githubusercontent.com/Vles0123/nutug/refs/heads/chore/content-feed/manifest.json',
  }) + '\n',
);
console.log(`Prepared ${files.size + 3} UI, font and calendar resources for native targets`);
