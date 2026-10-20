import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TARGET = process.env.API_TARGET || 'https://econx-three.vercel.app';
const PORT = +(process.env.PORT || 8099);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      const r = await fetch(TARGET + req.url, {
        method: req.method,
        headers: { 'user-agent': req.headers['user-agent'] || 'nx-dev', ...(body.length ? { 'content-type': req.headers['content-type'] || 'application/json' } : {}) },
        body: body.length ? body : undefined,
      });
      const buf = Buffer.from(await r.arrayBuffer());
      const headers = {};
      for (const [k, v] of r.headers) if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(k)) headers[k] = v;
      res.writeHead(r.status, headers);
      res.end(buf);
    } catch (e) {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (e, b) => {
    if (e) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(b);
  });
}).listen(PORT, () => console.log('dev server http://localhost:' + PORT));
