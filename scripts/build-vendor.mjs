import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
await build({
  stdin: { contents: "export * from 'd3-force';", resolveDir: root },
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'NutugForce',
  outfile: resolve(root, 'tests/fixtures/legacy/vendor/d3-force-3.0.0.js'),
  banner: { js: '/*! d3-force 3.0.0 and dependencies; licenses: d3-LICENSE.txt */' },
});
const packages = ['d3-force', 'd3-dispatch', 'd3-quadtree', 'd3-timer'];
const notices = await Promise.all(
  packages.map(
    async (name) =>
      `${name}\n\n${await readFile(resolve(root, 'node_modules', name, 'LICENSE'), 'utf8')}`,
  ),
);
await writeFile(resolve(root, 'tests/fixtures/legacy/vendor/d3-LICENSE.txt'), notices.join('\n\n'));
