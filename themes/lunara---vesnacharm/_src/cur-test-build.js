// A test copy of a built theme that loads shopdy's REAL money runtime (from sf-money-runtime.ts) with one rate, and
// (unless --first) the sf_cur cookie, so the preview shows the shopper currency.
// node cur-test-build.js <built theme dir> <out dir> <CUR> <rate> [--first]
const fs = require('fs');
const path = require('path');
const [src, out, cur, rate] = process.argv.slice(2);
const first = process.argv.includes('--first');
const ts = fs.readFileSync('D:/shopdy-promax/apps/api/src/features/storefront/application/sf-money-runtime.ts', 'utf8');
const a = ts.indexOf('const runtimeJs = (rates: string, whole: string, expiresAt: number): string =>');
const b = ts.indexOf('`w.SFMoney=S})(window);`;', a);
if (a < 0 || b < 0) throw new Error('runtimeJs not found');
const body = ts.slice(a, b + '`w.SFMoney=S})(window);`'.length)
  .replace('const runtimeJs = (rates: string, whole: string, expiresAt: number): string =>', 'return (rates, whole, expiresAt) =>')
  .replace(/^\s*\/\/.*$/gm, '');
const runtimeJs = new Function(body)();
const js = runtimeJs(JSON.stringify({ [cur]: rate }), JSON.stringify({}), Date.now() + 864e5);
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(src, out, { recursive: true });
const gs = path.join(out, 'snippets', 'gs-head.hbs');
const cookie = first
  ? '<script>document.cookie="sf_cur=;path=/;max-age=0";setTimeout(function(){document.cookie="sf_cur=' + cur + ';path=/";window.SFMoney&&SFMoney.settle&&SFMoney.settle()},150)</script>'
  : '<script>document.cookie="sf_cur=' + cur + ';path=/"</script>';
fs.writeFileSync(gs, cookie + '<script>' + js + '</script>\n' + fs.readFileSync(gs, 'utf8'));
console.log('test copy: ' + out + ' (' + cur + ' @ ' + rate + (first ? ', first visit: currency after 150 ms' : '') + ')');
