/* Maggie's Tanks — home page only (templates/index.hbs). No platform logic here (that stays in core.js / ui.js):
   - [data-mt-compare]: builds the comparison table from its rows ("Feature|1|0|…" per line, 1 = ✓) and columns
     (data-cols "A|B|…", the last one highlighted), plus a score row when data-score is set;
   - [data-mt-track] + [data-mt-step]: the video reviews slider arrows;
   - [data-mt-video]: plays the uploaded video of a card on tap (cards without a video keep their poster).
   Also on product pages (sections/mt-story.hbs: the comparison and the video reviews blocks each include this file),
   so it runs once per page whatever the number of <script> tags. */
(function () {
  'use strict';
  if (window.__mtHomeRan) return;
  window.__mtHomeRan = true;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var yes = '<span class="mt-yes" aria-label="Yes">✓</span>';
  var no = '<span class="mt-no" aria-label="No">✗</span>';

  $$('[data-mt-compare]').forEach(function (box) {
    var cols = String(box.getAttribute('data-cols') || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    var rows = String(box.getAttribute('data-mt-compare') || '').split(/\r?\n/).map(function (l) { return l.split('|').map(function (s) { return s.trim(); }); })
      .filter(function (r) { return r[0]; });
    if (!cols.length || !rows.length) return;
    var last = cols.length - 1;
    var score = cols.map(function () { return 0; });
    var html = '<table class="mt-compare__table"><thead><tr><th scope="col"><span class="mt-sr">Feature</span></th>' +
      cols.map(function (c, i) { return '<th scope="col"' + (i === last ? ' class="is-ours"' : '') + '>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr><th scope="row">' + esc(r[0]) + '</th>' + cols.map(function (c, i) {
        var ok = r[i + 1] === '1' || /^(y|yes|✓|true)$/i.test(r[i + 1] || '');
        if (ok) score[i]++;
        return '<td' + (i === last ? ' class="is-ours"' : '') + '>' + (ok ? yes : no) + '</td>';
      }).join('') + '</tr>';
    });
    html += '</tbody>';
    var label = box.getAttribute('data-score');
    if (label) {
      html += '<tfoot><tr><th scope="row">' + esc(label) + '</th>' + score.map(function (s, i) {
        return '<td' + (i === last ? ' class="is-ours"' : '') + '>' + s + '/' + rows.length + '</td>';
      }).join('') + '</tr></tfoot>';
    }
    box.innerHTML = html + '</table>';
  });

  $$('[data-mt-track]').forEach(function (track) {
    var sec = track.parentNode;
    $$('[data-mt-step]', sec).forEach(function (b) {
      b.addEventListener('click', function () {
        var card = track.querySelector('li');
        var step = card ? card.getBoundingClientRect().width + 20 : 320;
        track.scrollBy({ left: step * Number(b.getAttribute('data-mt-step')), behavior: 'smooth' });
      });
    });
  });

  $$('[data-mt-video]').forEach(function (card) {
    var video = card.querySelector('video');
    var btn = card.querySelector('.mt-vr__play');
    if (!video || !btn) return;
    btn.addEventListener('click', function () {
      $$('[data-mt-video] video').forEach(function (v) { if (v !== video) { v.pause(); } });
      video.hidden = false;
      video.controls = true;
      card.classList.add('is-playing');
      video.play();
    });
  });

  // Product page (sections/mt-story.hbs): on the live store a card with no poster and no video is hidden
  // (mt-landing.css); when that leaves no card, the whole video reviews block goes rather than a lone heading.
  $$('.mt-story .mt-vr').forEach(function (sec) {
    var shown = $$('.mt-vr__card', sec).some(function (c) { return c.offsetParent !== null; });
    if (!shown) sec.hidden = true;
  });
})();
