// Anchored edits (fixture: never run).
const fs = require('fs');
const path = require('path');
const THEME = path.resolve(__dirname, '..');
function patch(file) { const f = path.join(THEME, file); fs.writeFileSync(f, fs.readFileSync(f, 'utf8')); }
patch('sections/product.hbs');
