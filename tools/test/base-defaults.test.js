// Every image / video slot of base-theme shows its default_* file while empty, and a picked file wins. The slots are read from the
// schemas, so a new picker without a default fails here.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { tmpDir, ROOT } = require('./helpers');

const BASE = path.join(ROOT, 'base-theme');
const SECTIONS = path.join(BASE, 'sections');
const fileFor = (id, tag) => (id === 'video' ? 'videos/aa/' : 'images/aa/') + tag + '-' + id + (id === 'video' ? '.mp4' : '.webp');

// One template with every section and every block type that has a picker; `picked` also fills the pickers.
function template(picked) {
  const doc = { name: 'All slots', sections: {}, order: [] };
  const expected = [];
  const fill = (settings, tag) => {
    const out = {};
    for (const s of settings || []) {
      if (s.type !== 'image_picker') continue;
      const def = fileFor(s.id, tag);
      out['default_' + s.id] = def;
      if (picked) out[s.id] = '/uploaded/' + tag + '-' + s.id + '.webp';
      expected.push({ slot: tag + ' ' + s.id, def: '/assets/' + def, uploaded: '/uploaded/' + tag + '-' + s.id + '.webp' });
    }
    return out;
  };
  for (const f of fs.readdirSync(SECTIONS).filter((x) => x.endsWith('.schema.json'))) {
    const name = f.replace('.schema.json', '');
    const schema = JSON.parse(fs.readFileSync(path.join(SECTIONS, f), 'utf8'));
    const sec = { type: name, settings: fill(schema.settings, name), blocks: {}, blockOrder: [] };
    let has = Object.keys(sec.settings).length > 0;
    for (const b of schema.blocks || []) {
      const settings = fill(b.settings, name + '.' + b.type);
      if (!Object.keys(settings).length) continue;
      has = true;
      if (b.type === 'variant_cards') { for (let n = 1; n <= 6; n++) settings['card_' + n + '_qty'] = n; settings.source = 'quantity'; }
      sec.blocks[b.type] = { type: b.type, settings };
      sec.blockOrder.push(b.type);
    }
    if (!has) continue;
    doc.sections[name] = sec;
    doc.order.push(name);
  }
  return { doc, expected };
}

async function render(doc) {
  const dir = tmpDir('base-defaults-');
  fs.cpSync(BASE, dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'templates', 'product.json'), JSON.stringify(doc));
  const port = 18000 + Math.floor(Math.random() * 2000);
  const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'preview-server.js'), dir, '--port', String(port)], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) {
      try {
        const r = await fetch('http://127.0.0.1:' + port + '/product');
        if (r.ok) return await r.text();
      } catch (e) { /* not listening yet */ }
      await new Promise((ok) => setTimeout(ok, 200));
    }
    throw new Error('preview did not start');
  } finally { server.kill(); }
}

test('every slot shows its default_* file while empty', async () => {
  const { doc, expected } = template(false);
  assert.equal(expected.length, 32, 'slots in the base schemas');
  const html = await render(doc);
  const missing = expected.filter((e) => !html.includes(e.def)).map((e) => e.slot);
  assert.deepEqual(missing, []);
});

test('a picked file wins over the default', async () => {
  const { doc, expected } = template(true);
  const html = await render(doc);
  const lost = expected.filter((e) => !html.includes(e.uploaded)).map((e) => e.slot);
  assert.deepEqual(lost, [], 'picked files on the page');
  // Pack cards print their settings as JSON for ui.js, so only markup counts here.
  const markup = html.replace(/<script\b[\s\S]*?<\/script>/g, '');
  const stale = expected.filter((e) => markup.includes(e.def)).map((e) => e.slot);
  assert.deepEqual(stale, [], 'defaults gone from the markup');
});
