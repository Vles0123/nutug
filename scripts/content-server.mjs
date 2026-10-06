import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(process.env.CONTENT_DIRECTORY || 'content-dist'),
  port = Number(process.env.CONTENT_PORT) || 8787;
const server = createServer(async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'If-None-Match',
    'Access-Control-Expose-Headers': 'ETag',
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, headers);
    res.end();
    return;
  }
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname),
      file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) throw new Error('Not found');
    const bytes = await readFile(file),
      etag = '"' + createHash('sha256').update(bytes).digest('hex') + '"';
    headers.ETag = etag;
    headers['Cache-Control'] = path.endsWith('/manifest.json')
      ? 'no-cache'
      : 'public, max-age=31536000, immutable';
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
    headers['Content-Length'] = bytes.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch {
    res.writeHead(404, headers);
    res.end('{}');
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Content: http://127.0.0.1:${port}/manifest.json`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
