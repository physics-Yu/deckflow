/* deckflow review — the contract, checked in the browser where layout is real.
   Press R (or open with ?review) for the panel; agents call DeckReview.run()
   and get the same report as JSON. Rules are documented in docs/contract.md.

   level: error   breaks the contract — fix before showing anyone
          warn    breaks a default — fix, or waive with data-allow on the slide
          open    not a defect: something the human still has to supply or confirm */
(function () {
  'use strict';
  var FONT_ERROR = 20, FONT_WARN = 24, WORD_BUDGET = 45, PARA_BUDGET = 28;

  function visible(el) {
    var cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'collapse' && +cs.opacity !== 0 || el.hasAttribute('data-step');
  }
  function words(text) {
    var cjk = (text.match(/[㐀-鿿豈-﫿]/g) || []).length;
    var latin = (text.replace(/[㐀-鿿豈-﫿]/g, ' ').match(/[A-Za-z0-9][A-Za-z0-9'’\-.]*/g) || []).length;
    return latin + Math.ceil(cjk / 2);
  }
  function hint(el) {
    var s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (el.classList && el.classList.length) s += '.' + el.classList[0];
    var t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return t ? s + ' “' + t + '”' : s;
  }

  function checkSlide(slide, i, seen, deck) {
    var out = [], k = window.Deck.scale || 1;
    var allow = (slide.getAttribute('data-allow') || '').split(/[\s,]+/).filter(Boolean);
    var layout = slide.getAttribute('data-layout') || 'default';
    function add(level, rule, msg) {
      if (level === 'warn' && allow.indexOf(rule) >= 0) { out.push({ level: 'waived', rule: rule, msg: msg }); return; }
      out.push({ level: level, rule: rule, msg: msg });
    }

    // identity: pages get renumbered, ids must not
    if (!slide.id) add('error', 'id', 'slide has no id — give it a short semantic id (e.g. id="pareto")');
    else if (/^(s|p|slide|page)?[-_]?\d+$/i.test(slide.id)) add('error', 'id', 'id "' + slide.id + '" is a page number; use a semantic id that survives reordering');
    else if (seen[slide.id]) add('error', 'id', 'duplicate id "' + slide.id + '"');
    seen[slide.id] = true;

    // title
    var title = slide.querySelector(':scope > h2, :scope h1');
    if (!title && layout !== 'bare') add('error', 'title', 'no title (h2). Use data-layout="bare" if the figure is the whole slide');
    if (title && layout === 'default') {
      var tw = words(title.textContent), style = deck.getAttribute('data-title-style') || 'topic';
      if (style === 'topic' && tw > 9) add('warn', 'title', 'title is ' + tw + ' words; brief.md says titles are short topic phrases');
      if (style === 'claim' && tw > 22) add('warn', 'title', 'title is ' + tw + ' words; even a claim should fit two lines');
    }

    // geometry: nothing may leave the stage or be clipped
    var box = slide.getBoundingClientRect(), offenders = [];
    slide.querySelectorAll('*').forEach(function (el) {
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return;
      if (el.closest('[data-clip]')) return;
      if (!visible(el)) return;
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      var over = Math.max(box.left - r.left, r.right - box.right, box.top - r.top, r.bottom - box.bottom) / k;
      if (over > 2) offenders.push(hint(el) + ' (' + Math.round(over) + 'px outside)');
      else if (el.scrollHeight - el.clientHeight > 3 && getComputedStyle(el).overflowY !== 'visible' && el.clientHeight > 0)
        offenders.push(hint(el) + ' (content clipped by ' + (el.scrollHeight - el.clientHeight) + 'px)');
    });
    if (offenders.length) add('error', 'overflow', offenders.length + ' element(s) overflow: ' + offenders.slice(0, 3).join('; '));

    // legibility: effective font size on the 1920×1080 stage, SVG scaling included
    var small = {}, tooSmall = {}, minSeen = Infinity;
    var tw2 = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
    var proseWords = 0, longPara = 0;
    while (tw2.nextNode()) {
      var node = tw2.currentNode, text = node.nodeValue.trim();
      if (!text) continue;
      var p = node.parentElement;
      if (!p || !visible(p) || p.closest('script, style, [data-review-ignore]')) continue;
      var size = parseFloat(getComputedStyle(p).fontSize);
      var owner = p.ownerSVGElement;
      if (owner && owner.getScreenCTM()) { var m = p.getScreenCTM() || owner.getScreenCTM(); size = size * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) / k; }
      minSeen = Math.min(minSeen, size);
      if (size < FONT_ERROR - 0.5) tooSmall[hint(p)] = Math.round(size);
      else if (size < FONT_WARN - 0.5) small[hint(p)] = Math.round(size);
      // prose budget: text that is not a title, a figure, a table, a legend or a control
      if (!p.closest('h1, h2, figure, svg, table, .legend, .controls, .seg, button, [data-role], .placeholder, .big, .mono'))
        proseWords += words(text);
    }
    var ks = Object.keys(tooSmall), kw = Object.keys(small);
    if (ks.length) add('error', 'font', ks.length + ' text run(s) under ' + FONT_ERROR + 'px (unreadable when projected): ' + ks.slice(0, 3).map(function (h) { return h + ' = ' + tooSmall[h] + 'px'; }).join('; '));
    if (kw.length) add('warn', 'font', kw.length + ' text run(s) under ' + FONT_WARN + 'px: ' + kw.slice(0, 3).map(function (h) { return h + ' = ' + small[h] + 'px'; }).join('; '));

    slide.querySelectorAll('p, li').forEach(function (el) {
      if (el.closest('figure, .placeholder')) return;
      if (words(el.textContent) > PARA_BUDGET) longPara++;
    });
    if (layout === 'default') {
      if (proseWords > WORD_BUDGET) add('warn', 'words', proseWords + ' words of prose (budget ' + WORD_BUDGET + '). Say it in the figure or say it aloud');
      if (longPara) add('warn', 'words', longPara + ' explanatory paragraph(s) over ' + PARA_BUDGET + ' words');
      if (!slide.querySelector('figure, svg, canvas, table, img, video, .cards, .big, .placeholder'))
        add('warn', 'visual', 'text-only slide: there is nothing to look at');
    }

    // figures: a chart must say what its axes mean; every figure must say where it comes from
    slide.querySelectorAll('figure').forEach(function (fig) {
      var name = fig.id ? '#' + fig.id : hint(fig);
      var isChart = fig.getAttribute('data-kind') === 'chart' || fig.querySelector('[data-chart]');
      if (isChart) {
        if (!fig.querySelector('[data-role="xlabel"]')) add('error', 'axes', name + ': chart has no x-axis label ([data-role="xlabel"])');
        if (!fig.querySelector('[data-role="ylabel"]')) add('error', 'axes', name + ': chart has no y-axis label ([data-role="ylabel"])');
        if (!fig.querySelector('[data-role="legend"]') && !fig.hasAttribute('data-single-series')) add('warn', 'legend', name + ': chart has no legend ([data-role="legend"])');
      }
      var src = fig.getAttribute('data-src'), kind = fig.getAttribute('data-kind');
      if (!src && kind !== 'schematic' && !fig.querySelector('[data-placeholder]') && !fig.hasAttribute('data-placeholder'))
        add('warn', 'provenance', name + ': no data-src. Cite the source id from sources.md, or mark data-kind="schematic"');
    });

    // open items: surfaced so the human is asked, never left to notice
    slide.querySelectorAll('[data-placeholder]').forEach(function (el) {
      add('open', 'placeholder', 'waiting for: ' + (el.getAttribute('data-placeholder') || hint(el)));
    });
    slide.querySelectorAll('[data-derived]').forEach(function (el) {
      add('open', 'derived', hint(el) + ' — derived by the agent: ' + el.getAttribute('data-derived'));
    });
    slide.querySelectorAll('[data-unverified]').forEach(function (el) {
      add('open', 'unverified', hint(el) + ' — not checked against a source' + (el.getAttribute('data-unverified') ? ': ' + el.getAttribute('data-unverified') : ''));
    });

    // interaction hygiene
    slide.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (!el.closest('[data-interactive]')) add('warn', 'interactive', hint(el) + ' is not inside [data-interactive]');
    });
    if (slide.querySelector('iframe')) add('error', 'portable', 'iframe found — hosted pages blank them out; inline the content instead');

    return { id: slide.id || '(none)', index: i + 1, minFont: isFinite(minSeen) ? Math.round(minSeen) : null, issues: out };
  }

  function run() {
    var deck = document.querySelector('.deck'), seen = {}, global = [];
    // measure with every step revealed
    var report = { slides: window.Deck.slides.map(function (s, i) { return checkSlide(s, i, seen, deck); }) };

    document.querySelectorAll('script[src], link[rel="stylesheet"][href], img[src], video[src], audio[src], source[src]').forEach(function (el) {
      var u = el.getAttribute('src') || el.getAttribute('href');
      if (/^data:/.test(u)) return;
      if (/^(https?:)?\/\//.test(u)) global.push({ level: 'error', rule: 'portable', msg: 'external resource ' + u + ' — the deck must work offline as one file' });
      else global.push({ level: 'open', rule: 'portable', msg: 'local file ' + u + ' is not inlined yet — run tools/build.py before sharing' });
    });
    (window.Deck.errors || []).forEach(function (m) { global.push({ level: 'error', rule: 'runtime', msg: 'JavaScript error: ' + m }); });

    report.global = global;
    var tally = { error: 0, warn: 0, open: 0, waived: 0 };
    report.slides.forEach(function (s) { s.issues.forEach(function (x) { tally[x.level]++; }); });
    global.forEach(function (x) { tally[x.level]++; });
    report.summary = tally;
    report.pass = tally.error === 0;
    return report;
  }

  // ---------- panel ----------
  var panel, tags = [];
  var COLORS = { error: '#c8374c', warn: '#c97a00', open: '#2f6fd0', waived: '#888' };
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  function show() {
    hide();
    var r = run();
    panel = document.createElement('aside');
    panel.className = 'review-panel';
    panel.setAttribute('data-review-ignore', '');
    panel.style.cssText = 'position:fixed;top:0;right:0;bottom:0;width:440px;max-width:90vw;overflow:auto;z-index:20;background:#15171c;color:#e8e8ea;font:14px/1.45 system-ui,sans-serif;padding:18px 20px;box-shadow:-8px 0 40px rgba(0,0,0,.35)';
    var h = '<div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:17px">Review</b><span style="opacity:.6">R to close</span></div>';
    h += '<div style="margin:10px 0 16px;display:flex;gap:8px;flex-wrap:wrap">';
    ['error', 'warn', 'open', 'waived'].forEach(function (l) {
      h += '<span style="padding:3px 10px;border-radius:99px;background:' + COLORS[l] + ';color:#fff">' + r.summary[l] + ' ' + l + '</span>';
    });
    h += '</div>';
    function list(items) {
      return items.map(function (x) {
        return '<div style="margin:5px 0 5px 4px;padding-left:10px;border-left:3px solid ' + COLORS[x.level] + '"><span style="opacity:.6">' + x.rule + '</span> ' + esc(x.msg) + '</div>';
      }).join('');
    }
    if (r.global.length) h += '<div style="margin-bottom:12px"><b>deck</b>' + list(r.global) + '</div>';
    r.slides.forEach(function (s) {
      h += '<div style="margin-bottom:12px"><a href="#' + esc(s.id) + '" style="color:#b9b3ff;text-decoration:none"><b>' + s.index + ' · ' + esc(s.id) + '</b></a>'
        + (s.issues.length ? list(s.issues) : '<span style="opacity:.5"> — clean</span>') + '</div>';
    });
    panel.innerHTML = h;
    document.body.appendChild(panel);
    // show the stable id on every slide: this is the name humans and agents use for it
    window.Deck.slides.forEach(function (s) {
      var t = document.createElement('div');
      t.className = 'review-tag';
      t.setAttribute('data-review-ignore', '');
      t.textContent = '#' + (s.id || '?');
      t.style.cssText = 'position:absolute;left:0;top:0;z-index:9;background:#15171c;color:#fff;font:600 22px ui-monospace,Consolas,monospace;padding:6px 14px;border-radius:0 0 12px 0';
      s.appendChild(t); tags.push(t);
    });
    return r;
  }
  function hide() {
    if (panel) { panel.remove(); panel = null; }
    tags.forEach(function (t) { t.remove(); }); tags = [];
  }

  window.DeckReview = { run: run, show: show, hide: hide, toggle: function () { panel ? hide() : show(); } };
  document.addEventListener('deck:ready', function () {
    if (new URLSearchParams(location.search).has('review')) setTimeout(show, 300);
  });
})();
