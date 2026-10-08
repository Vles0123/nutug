import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, rm, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const branch = 'chore/content-feed';
const git = (args, cwd = root) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
execFileSync(process.execPath, ['scripts/build-content.mjs'], { cwd: root, stdio: 'inherit' });
git(['fetch', 'origin', `refs/heads/${branch}:refs/remotes/origin/${branch}`]);
const temporary = await mkdtemp(join(tmpdir(), 'nutug-content-'));
const checkout = join(temporary, 'feed');
git(['worktree', 'add', '--detach', checkout, `refs/remotes/origin/${branch}`]);
try {
  const manifest = JSON.parse(await readFile(resolve(root, 'content-dist/manifest.json'), 'utf8'));
  const release = `releases/${manifest.version}`;
  // A published version keeps its files so an open reader can finish using that version.
  if (
    await access(join(checkout, release)).then(
      () => true,
      () => false,
    )
  )
    throw new Error(`Content version ${manifest.version} is already published`);
  for (const path of [release, '_headers', 'manifest.json'])
    await cp(resolve(root, 'content-dist', path), join(checkout, path), { recursive: true });
  for (const path of ['objects', 'revisions'])
    await rm(join(checkout, path), { recursive: true, force: true });
  await writeFile(
    join(checkout, 'README.md'),
    '# Nutug content feed\n\nRead `manifest.json` and compare its `version` with the saved version. JSON resources are stored under `releases/<version>/`; article paths use their record IDs. Previous releases remain available for open readers.\n\nSource and client implementation: [Nutug](https://github.com/Vles0123/nutug).\n',
  );
  git(['add', '--all'], checkout);
  const changed = git(['diff', '--cached', '--name-only'], checkout);
  if (changed) {
    git(['commit', '--quiet', '-m', `Publish content version ${manifest.version}`], checkout);
    git(['push', 'origin', `HEAD:refs/heads/${branch}`], checkout);
    console.log(`Published ${manifest.version} (${manifest.counts.entries} entries)`);
  } else console.log('Published content already matches the source');
  git(['worktree', 'remove', checkout]);
  await rm(temporary, { recursive: true });
} catch (error) {
  console.error(`Content publication did not complete. Work is preserved at ${checkout}`);
  throw error;
}
