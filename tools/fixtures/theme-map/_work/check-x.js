// A check (fixture: never run).
console.log(require('fs').readFileSync(require('path').join(__dirname, '..', 'sections/reviews.hbs'), 'utf8').length);
