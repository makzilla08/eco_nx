import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TARGET = process.env.API_TARGET || 'https://econx-three.vercel.app';
const PORT = +(process.env.PORT || 8099);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

// รัน api/*.js ในเครื่องก่อน (ถ้ามีไฟล์) — ไม่งั้น proxy ไป live
function shim(req) {
  const u = new URL(req.url, 'http://localhost');
  return {
    query: Object.fromEntries(u.searchParams.entries()),
    method: req.method,
    headers: req.headers,
    body: '',
    _code: 200,
    _headers: {},
    setHeader(k, v) { this._headers[k] = v; },
    status(c) { this._code = c; return this; },
    json(o) { this._finish(JSON.stringify(o), 'application/json'); },
    send(x) { this._finish(x); },
    end(x) { this._finish(x); },
    _finish(body, type) {
      const h = { ...this._headers };
      if (!Object.keys(h).some(k => k.toLowerCase() === 'content-type')) {
        h['Content-Type'] = type || 'text/plain; charset=utf-8';
      }
      this._res.writeHead(this._code, h);
      this._res.end(body);
    },
  };
}

async function serveLocalApi(name, req, res) {
  const file = path.join(ROOT, 'api', name + '.js');
  if (!fs.existsSync(file)) return false;
  const mod = await import('file://' + file);
  const s = shim(req);
  s._res = res;
  await mod.default(s, s);
  return true;
}

http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    const name = req.url.split('?')[0].slice(5).replace(/[^a-z0-9_-]/gi, '');
    if (name) {
      try {
        if (await serveLocalApi(name, req, res)) return;
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'local api ' + name + ': ' + String(e.message || e).slice(0, 200) }));
        return;
      }
    }
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
}).listen(PORT, () => console.log('dev server http://localhost:' + PORT + ' (api: local → ' + TARGET + ')'));
