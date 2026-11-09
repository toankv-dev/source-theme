/*
 * Test helpers: a fake store (tools/fixtures/site, images from tools/fixtures/sample) on a random port, a request
 * log that tells documents from resources, temp folders and an async node runner.
 *
 *   node tools/test/helpers.js [port]     run the fake store on its own (default 8099)
 */
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SITE = path.join(__dirname, '..', 'fixtures', 'site');
const SAMPLE = path.join(__dirname, '..', 'fixtures', 'sample');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const VIDEO = Buffer.alloc(64 * 1024, 7); // not a playable video: only its download matters

function startFixture(port = 0) {
  const log = [];
  const state = { blockDesktop: false, blockAll: false }; // /products/fickle-tee: a bot check the test switches on

  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const p = u.pathname;
    let p2 = null; // a video served under another path (the Shopify MP4 of the fake stream)
    log.push({ path: p + u.search, dest: req.headers['sec-fetch-dest'] || 'fetch', ua: req.headers['user-agent'] || '' });
    const send = (code, type, body, extra) => { res.writeHead(code, Object.assign({ 'Content-Type': type, 'Cache-Control': 'no-store' }, extra)); res.end(body); };
    const file = (f) => (fs.existsSync(f) && fs.statSync(f).isFile()
      ? send(200, TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', fs.readFileSync(f))
      : send(404, 'text/plain', 'not found'));
    if (p === '/') return file(path.join(SITE, 'home.html'));
    if (p === '/products/fixture-tee') return file(path.join(SITE, 'product.html'));
    if (p === '/products/video-tee') return file(path.join(SITE, 'video.html'));
    if (p === '/products/fickle-tee') {
      const phone = /iPhone/.test(req.headers['user-agent'] || '');
      if (state.blockAll || (state.blockDesktop && !phone)) return send(403, 'text/html', '<!doctype html><title>Just a moment...</title><p>Checking your browser</p>');
      return file(path.join(SITE, 'product.html'));
    }
    if (p === '/blocked') return send(403, 'text/html', '<!doctype html><title>Just a moment...</title><p>Checking your browser</p>');
    if (p.startsWith('/img/')) return file(path.join(SAMPLE, path.basename(p)));
    if (p.startsWith('/fonts/')) return file(path.join(SITE, 'fonts', 'fixture.woff2'));
    // HLS: a Shopify-named stream (whose renditions also exist as one MP4 each) and a plain one (segments only).
    const M3U8 = 'application/vnd.apple.mpegurl';
    if (p === '/videos/c/vp/abc/abc.m3u8') {
      return send(200, M3U8, '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=900000,AVERAGE-BANDWIDTH=800000,RESOLUTION=270x480\nabc.SD-480p.0.9Mbps.hls.123_.m3u8\n' +
        '#EXT-X-STREAM-INF:BANDWIDTH=2000000,AVERAGE-BANDWIDTH=1800000,RESOLUTION=404x720\nabc.HD-720p.1.6Mbps.hls.123_.m3u8\n');
    }
    if (/^\/videos\/c\/vp\/abc\/abc\.(HD-720p|SD-480p)\.[\d.]+Mbps\.hls\.123_\.m3u8$/.test(p)) {
      return send(200, M3U8, '#EXTM3U\n#EXT-X-TARGETDURATION:3\n#EXTINF:3.0,\nabc.part0.ts\n#EXT-X-ENDLIST\n');
    }
    if (p === '/videos/c/vp/abc/abc.HD-720p-1.6Mbps-123.mp4') p2 = '/media/abc-720.mp4';
    if (p === '/media/plain/master.m3u8') return send(200, M3U8, '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=320x180\nmedia.m3u8\n');
    if (p === '/media/plain/media.m3u8') {
      return send(200, M3U8, '#EXTM3U\n#EXT-X-TARGETDURATION:3\n#EXTINF:3.0,\nseg0.ts\n#EXTINF:3.0,\nseg1.ts\n#EXT-X-ENDLIST\n');
    }
    if (/^\/media\/plain\/seg\d\.ts$/.test(p)) return send(200, 'video/mp2t', Buffer.alloc(4096, 3));
    if (p.startsWith('/media/') || p2) {
      const type = p.endsWith('.webm') ? 'video/webm' : 'video/mp4';
      const r = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (!r) return send(200, type, VIDEO, { 'Accept-Ranges': 'bytes' });
      const start = Number(r[1] || 0);
      const end = r[2] ? Math.min(Number(r[2]), VIDEO.length - 1) : VIDEO.length - 1;
      return send(206, type, VIDEO.subarray(start, end + 1), { 'Accept-Ranges': 'bytes', 'Content-Range': 'bytes ' + start + '-' + end + '/' + VIDEO.length });
    }
    const f = path.join(SITE, path.normalize(decodeURIComponent(p)));
    return f.startsWith(SITE) ? file(f) : send(404, 'text/plain', 'not found');
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => {
    resolve({
      origin: 'http://127.0.0.1:' + server.address().port,
      log,
      documents: () => log.filter((l) => l.dest === 'document').map((l) => l.path),
      state,
      close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }),
    });
  }));
}

const tmpDir = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'theme-test-'));

// Runs a node script without blocking this process (the fake store answers from here).
function runNode(args, opts) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, Object.assign({ cwd: ROOT }, opts));
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

module.exports = { startFixture, tmpDir, runNode, ROOT, SITE, SAMPLE };

if (require.main === module) {
  startFixture(Number(process.argv[2]) || 8099).then((f) => console.log('fixture store on ' + f.origin + '/products/fixture-tee'));
}
