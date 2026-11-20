// Builds the bundle template and the banner section (fixture: never run).
const fs = require('fs');
const path = require('path');
const THEME = path.resolve(__dirname, '..');
fs.writeFileSync(path.join(THEME, 'templates/product.bundle.json'), '{}');
fs.writeFileSync(path.join(THEME, 'sections', 'banner.hbs'), '');
