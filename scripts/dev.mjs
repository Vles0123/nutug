import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const contentBuild = spawn(process.execPath, ['scripts/build-content.mjs'], { stdio: 'inherit' });
await new Promise((resolve, reject) =>
  contentBuild.on('exit', (code) =>
    code === 0 ? resolve() : reject(new Error('Content build failed')),
  ),
);
const content = spawn(process.execPath, ['scripts/content-server.mjs'], { stdio: 'inherit' });
const environment = {
  ...process.env,
  NUTUG_CONTENT_MANIFEST:
    process.env.NUTUG_CONTENT_MANIFEST ||
    `http://127.0.0.1:${process.env.CONTENT_PORT || 8787}/manifest.json`,
};
const build = spawn(process.execPath, ['scripts/build-web.mjs'], {
  stdio: 'inherit',
  env: environment,
});
await new Promise((ok, fail) => {
  build.on('exit', (code) => (code === 0 ? ok() : fail(new Error('Web build failed'))));
  build.on('error', fail);
});
const watch = spawn(process.execPath, ['scripts/build-web.mjs', '--watch'], {
  stdio: 'inherit',
  env: environment,
});
const root = resolve('public'),
  port = Number(process.env.PORT) || 8000;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = resolve(root, '.' + path);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
server.on('error', (error) => {
  console.error(error.message);
  watch.kill();
  content.kill();
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Nutug: http://127.0.0.1:${port}/tribes.html`));
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    watch.kill();
    content.kill();
    server.close(() => process.exit(0));
  });
