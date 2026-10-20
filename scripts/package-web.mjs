import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const worker = await readFile('src/service-worker.template.js', 'utf8');
for (const [product, entry] of [
  ['calendar', 'calendar.html'],
  ['history', 'chronicle.html'],
]) {
  const destination = `build/web/${product}`;
  const html = await readFile(`public/${entry}`, 'utf8');
  const files = new Set([
    ...[...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
      .map((match) => match[1])
      .filter((path) => !/^[a-z]+:/i.test(path)),
    'interface-copy.json',
    'fonts/OnonSoninSans-NOTICE.txt',
    'vendor/lunar-1.7.7-LICENSE.txt',
    'assets/THIRD_PARTY_LICENSES.txt',
  ]);
  for (const file of [...files]) {
    if (file.endsWith('.js') && (await stat(`public/${file}.LEGAL.txt`).catch(() => null)))
      files.add(file + '.LEGAL.txt');
  }
  await rm(destination, { force: true, recursive: true });
  for (const file of files) {
    await mkdir(dirname(`${destination}/${file}`), { recursive: true });
    await cp(`public/${file}`, `${destination}/${file}`);
  }
  await writeFile(`${destination}/index.html`, html);
  await writeFile(`${destination}/${entry}`, html);
  await writeFile(
    `${destination}/sw.js`,
    worker
      .replace('__VERSION__', `${product}-${Date.now()}`)
      .replace('__ASSETS__', JSON.stringify(['index.html', entry, ...files])),
  );
  console.log(`${product}: ${destination} (${files.size + 3} files)`);
}
