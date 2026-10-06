import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, rm, readFile } from 'node:fs/promises';
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
  // Preserve immutable objects and directory pages used by existing clients.
  for (const path of ['objects', 'revisions', '_headers', 'manifest.json'])
    await cp(resolve(root, 'content-dist', path), join(checkout, path), { recursive: true });
  git(['add', '--', 'objects', 'revisions', '_headers', 'manifest.json'], checkout);
  const changed = git(['diff', '--cached', '--name-only'], checkout);
  if (changed) {
    const manifest = JSON.parse(await readFile(join(checkout, 'manifest.json'), 'utf8'));
    git(['commit', '--quiet', '-m', `Publish content revision ${manifest.revision}`], checkout);
    git(['push', 'origin', `HEAD:refs/heads/${branch}`], checkout);
    console.log(`Published ${manifest.revision} (${manifest.counts.entries} entries)`);
  } else console.log('Published content already matches the source');
  git(['worktree', 'remove', checkout]);
  await rm(temporary, { recursive: true });
} catch (error) {
  console.error(`Content publication did not complete. Work is preserved at ${checkout}`);
  throw error;
}
