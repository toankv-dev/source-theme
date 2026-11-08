#!/usr/bin/env node
/*
 * Serves the offline copy made by tools/download-page.js, with no network: shot.js / pixel.js / capture.js /
 * visual-diff.js can measure the original page again and again without touching the live store.
 *
 *   node tools/site-server.js <theme-dir> [--port 8092]
 *
 * Routes:  /                 the downloaded pages (manifest.json)
 *          /<name>           _work/site/pages/<name>/index.html; a phone User-Agent or ?view=mobile → mobile.html
 *                            (falls back to the other one when a viewport was blocked)
 *          /_m/…             the downloaded files, content-type from assets.json, Range requests for video
 * Anything else is a 404, counted in stats.notFound and printed: an offline copy must not need it.
 * require('./site-server').start({ siteDir, port }) → { server, port, origin, stats, close() }.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const MOBILE = /iPhone|Android|Mobile/i;
const EXT_TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/mp4', '.ogv': 'video/ogg' };

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };

function start(opts) {
  const siteDir = path.resolve(opts.siteDir);
  const log = opts.log !== false;
  const stats = { requests: 0, notFound: [] };
  let types = null;
  let typesTime = 0;
  // file → content-type, re-read when download-page.js rewrites assets.json.
  const typeOf = (rel) => {
    const f = path.join(siteDir, 'assets.json');
    const t = fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0;
    if (!types || t !== typesTime) {
      types = {};
      typesTime = t;
      for (const a of Object.values(readJson(f, {}))) if (a && a.file) types[a.file] = a.contentType;
    }
    return types[rel] || EXT_TYPES[path.extname(rel).toLowerCase()] || 'application/octet-stream';
  };

  const server = http.createServer((req, res) => {
    stats.requests++;
    const u = new URL(req.url, 'http://local');
    let p;
    try { p = decodeURIComponent(u.pathname); } catch (e) { p = u.pathname; }
    const head = { 'Cache-Control': 'no-store' };
    const notFound = () => {
      stats.notFound.push(p);
      if (log) console.log('404 ' + p);
      res.writeHead(404, Object.assign({ 'Content-Type': 'text/plain' }, head));
      res.end('not in the offline copy');
    };

    if (p === '/') {
      const pages = (readJson(path.join(siteDir, 'manifest.json'), {}).pages || []);
      res.writeHead(200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, head));
      return res.end('<!doctype html><title>Offline copy</title><ul>' + pages.map((pg) => '<li><a href="/' + pg.name + '">' + pg.name +
        '</a> — ' + String(pg.url).replace(/</g, '&lt;') + '</li>').join('') + '</ul>');
    }
    if (p === '/favicon.ico') { res.writeHead(204, head); return res.end(); }

    if (p.startsWith('/_m/')) {
      const file = path.join(siteDir, p);
      if (!file.startsWith(path.join(siteDir, '_m') + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return notFound();
      const size = fs.statSync(file).size;
      const type = typeOf(p.slice(1));
      const r = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (r && size) {
        const startAt = r[1] ? Number(r[1]) : Math.max(0, size - Number(r[2]));
        const end = r[1] && r[2] ? Math.min(Number(r[2]), size - 1) : size - 1;
        if (startAt >= size) { res.writeHead(416, Object.assign({ 'Content-Range': 'bytes */' + size }, head)); return res.end(); }
        res.writeHead(206, Object.assign({ 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': end - startAt + 1,
          'Content-Range': 'bytes ' + startAt + '-' + end + '/' + size }, head));
        return fs.createReadStream(file, { start: startAt, end }).pipe(res);
      }
      res.writeHead(200, Object.assign({ 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size }, head));
      return fs.createReadStream(file).pipe(res);
    }

    const name = p.slice(1).replace(/\/$/, '');
    if (/^[a-z0-9][a-z0-9-]*$/.test(name)) {
      const dir = path.join(siteDir, 'pages', name);
      const mobile = MOBILE.test(req.headers['user-agent'] || '') || u.searchParams.get('view') === 'mobile';
      const order = mobile ? ['mobile.html', 'index.html'] : ['index.html', 'mobile.html'];
      const file = order.map((f) => path.join(dir, f)).find((f) => fs.existsSync(f));
      if (file) {
        res.writeHead(200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, head));
        return fs.createReadStream(file).pipe(res);
      }
    }
    return notFound();
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(opts.port || 0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, origin: 'http://127.0.0.1:' + port, stats,
        close: () => new Promise((r) => { server.closeAllConnections(); server.close(() => r()); }) });
    });
  });
}

module.exports = { start, EXT_TYPES };

if (require.main === module) {
  const args = process.argv.slice(2);
  const dirArg = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port');
  if (!dirArg) { console.error('usage: node tools/site-server.js <theme-dir> [--port 8092]'); process.exit(1); }
  const port = Number(args.includes('--port') ? args[args.indexOf('--port') + 1] : 8092);
  const siteDir = fs.existsSync(path.join(dirArg, 'manifest.json')) ? dirArg : path.join(dirArg, '_work', 'site');
  if (!fs.existsSync(path.join(siteDir, 'manifest.json'))) { console.error('No offline copy in ' + siteDir + ' (run tools/download-page.js first)'); process.exit(1); }
  start({ siteDir, port }).then((s) => {
    const pages = (readJson(path.join(siteDir, 'manifest.json'), {}).pages || []);
    console.log('Offline copy on ' + s.origin + ' (no network)');
    pages.forEach((pg) => console.log('  ' + s.origin + '/' + pg.name + '   ← ' + pg.url));
  });
}
