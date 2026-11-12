/* deckflow figure kit — optional helpers for the three things decks keep needing:
   Kit.plot     a labelled line/scatter chart (axis labels and legend are mandatory)
   Kit.player   play / speed / scrub-bar-with-phases for any time-based drawing
   Kit.panzoom  wheel-zoom, drag and double-click-reset on an SVG group
   Hand-drawn SVG is always allowed instead; the kit only removes boilerplate. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, parent) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function html(tag, cls, parent, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function fmt(v) {
    if (v === 0) return '0';
    var a = Math.abs(v);
    if (a >= 1e4 || a < 1e-3) {
      var e = Math.floor(Math.log10(a) + 1e-9), m = v / Math.pow(10, e);
      var sup = String(e).replace(/[-0-9]/g, function (c) { return '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]; });
      return (Math.abs(m - 1) < 1e-6 ? '' : m.toFixed(1) + '×') + '10' + sup;
    }
    return String(+v.toPrecision(3));
  }

  function axis(spec, lo, hi) {
    var log = spec.scale === 'log';
    var d0 = log ? Math.log10(spec.domain[0]) : spec.domain[0];
    var d1 = log ? Math.log10(spec.domain[1]) : spec.domain[1];
    var f = function (v) { return lo + ((log ? Math.log10(v) : v) - d0) / (d1 - d0) * (hi - lo); };
    f.inv = function (p) { var u = d0 + (p - lo) / (hi - lo) * (d1 - d0); return log ? Math.pow(10, u) : u; };
    if (spec.ticks) f.ticks = spec.ticks;
    else if (log) {
      f.ticks = [];
      var stepE = Math.max(1, Math.ceil((d1 - d0) / 6));
      for (var e = Math.ceil(d0 - 1e-9); e <= d1 + 1e-9; e += stepE) f.ticks.push(Math.pow(10, e));
    } else {
      var raw = (d1 - d0) / 5, p10 = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p10;
      var st = (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p10;
      f.ticks = [];
      for (var t = Math.ceil(d0 / st - 1e-9) * st; t <= d1 + st * 1e-6; t += st) f.ticks.push(+t.toPrecision(12));
    }
    return f;
  }

  /* Kit.plot(el, {
       x: {label, domain:[a,b], scale:'linear'|'log', ticks?},   // label is required
       y: {label, domain:[a,b], scale:'linear'|'log', ticks?},   // label is required
       series: [{name, color, points:[[x,y],...], dash?, width?, marker?:true, line?:false}],
       bands:  [{x0, x1, color, label?}],        // shaded x-ranges
       lines:  [{y?|x?, label?, color?}],        // reference lines
       cursor: {x, onMove(x)}                    // draggable vertical cursor
     })  ->  {update(partialOpts), setCursor(x), root} */
  function plot(el, opts) {
    if (!opts.x || !opts.x.label || !opts.y || !opts.y.label)
      throw new Error('Kit.plot: x.label and y.label are required (say what the axis means, with units)');
    var hidden = {};
    el.classList.add('kit-plot');
    el.setAttribute('data-chart', '');
    el.style.display = 'flex'; el.style.flexDirection = 'column'; el.style.gap = '12px';
    el.style.minHeight = '0'; el.style.minWidth = '0';
    el.innerHTML = '';
    var root = svg('svg', { role: 'img' }, el);
    root.style.flex = '1'; root.style.minHeight = '0'; root.style.width = '100%'; root.style.display = 'block';
    var legend = html('div', 'legend', el);
    legend.setAttribute('data-role', 'legend');
    legend.setAttribute('data-interactive', '');

    function draw() {
      var Wd = Math.max(320, root.clientWidth || 800), Ht = Math.max(240, root.clientHeight || 500);
      var fs = opts.fontSize || 24, m = { l: 3.9 * fs + 44, r: 28, t: 18, b: 2 * fs + 46 };
      root.setAttribute('viewBox', '0 0 ' + Wd + ' ' + Ht);
      root.innerHTML = '';
      var X = axis(opts.x, m.l, Wd - m.r), Y = axis(opts.y, Ht - m.b, m.t);
      var cLine = css('--line'), cFg = css('--fg'), cMuted = css('--muted');
      var g = svg('g', { 'font-size': fs, 'font-family': css('--font-sans'), fill: cFg }, root);

      (opts.bands || []).forEach(function (b) {
        svg('rect', { x: X(b.x0), y: m.t, width: X(b.x1) - X(b.x0), height: Ht - m.b - m.t, fill: b.color, opacity: .13 }, g);
        if (b.label) svg('text', { x: (X(b.x0) + X(b.x1)) / 2, y: m.t + fs + 4, 'text-anchor': 'middle', fill: b.color, 'font-weight': 600 }, g).textContent = b.label;
      });
      X.ticks.forEach(function (t) {
        svg('line', { x1: X(t), x2: X(t), y1: m.t, y2: Ht - m.b, stroke: cLine, 'stroke-width': 1.5 }, g);
        svg('text', { x: X(t), y: Ht - m.b + fs + 8, 'text-anchor': 'middle', fill: cMuted }, g).textContent = fmt(t);
      });
      Y.ticks.forEach(function (t) {
        svg('line', { x1: m.l, x2: Wd - m.r, y1: Y(t), y2: Y(t), stroke: cLine, 'stroke-width': 1.5 }, g);
        svg('text', { x: m.l - 12, y: Y(t) + fs * .35, 'text-anchor': 'end', fill: cMuted }, g).textContent = fmt(t);
      });
      svg('rect', { x: m.l, y: m.t, width: Wd - m.r - m.l, height: Ht - m.b - m.t, fill: 'none', stroke: cFg, 'stroke-width': 2 }, g);
      var xl = svg('text', { x: (m.l + Wd - m.r) / 2, y: Ht - 10, 'text-anchor': 'middle', 'font-weight': 600, 'data-role': 'xlabel' }, g);
      xl.textContent = opts.x.label;
      var yl = svg('text', { transform: 'translate(' + (fs + 2) + ',' + (m.t + Ht - m.b) / 2 + ') rotate(-90)', 'text-anchor': 'middle', 'font-weight': 600, 'data-role': 'ylabel' }, g);
      yl.textContent = opts.y.label;

      (opts.lines || []).forEach(function (l) {
        var c = l.color || cMuted, a = l.y != null
          ? { x1: m.l, x2: Wd - m.r, y1: Y(l.y), y2: Y(l.y) } : { x1: X(l.x), x2: X(l.x), y1: m.t, y2: Ht - m.b };
        a.stroke = c; a['stroke-width'] = 2.5; a['stroke-dasharray'] = '10 8';
        svg('line', a, g);
        if (l.label) svg('text', l.y != null ? { x: Wd - m.r - 10, y: Y(l.y) - 10, 'text-anchor': 'end', fill: c }
                                            : { x: X(l.x) + 10, y: m.t + fs + 4, fill: c }, g).textContent = l.label;
      });

      var clipId = 'kc' + Math.random().toString(36).slice(2);
      svg('rect', { x: m.l, y: m.t, width: Wd - m.r - m.l, height: Ht - m.b - m.t }, svg('clipPath', { id: clipId }, g));
      var data = svg('g', { 'clip-path': 'url(#' + clipId + ')' }, g);
      opts.series.forEach(function (s) {
        if (hidden[s.name]) return;
        var lo = opts.y.scale === 'log' ? opts.y.domain[0] : -Infinity;
        var pts = s.points.filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); })
          .map(function (p) { return [X(p[0]), Y(Math.max(p[1], lo))]; });
        if (s.line !== false) svg('polyline', {
          points: pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '),
          fill: 'none', stroke: s.color, 'stroke-width': s.width || 4.5, 'stroke-linejoin': 'round',
          'stroke-dasharray': s.dash ? '14 9' : 'none'
        }, data);
        if (s.marker) pts.forEach(function (p) { svg('circle', { cx: p[0], cy: p[1], r: s.r || 8, fill: s.color, stroke: css('--bg'), 'stroke-width': 2 }, data); });
      });

      if (opts.cursor) {
        var cx = X(opts.cursor.x);
        svg('line', { x1: cx, x2: cx, y1: m.t, y2: Ht - m.b, stroke: cFg, 'stroke-width': 2.5 }, g);
        svg('circle', { cx: cx, cy: m.t, r: 9, fill: cFg }, g);
        var hit = svg('rect', { x: m.l, y: m.t, width: Wd - m.r - m.l, height: Ht - m.b - m.t, fill: 'transparent', 'data-interactive': '' }, g);
        hit.style.cursor = 'ew-resize';
        var move = function (e) {
          var p = root.getScreenCTM().inverse();
          var px = e.clientX * p.a + p.e;
          var v = Math.min(Math.max(X.inv(px), Math.min.apply(0, opts.x.domain)), Math.max.apply(0, opts.x.domain));
          opts.cursor.x = v; draw();
          if (opts.cursor.onMove) opts.cursor.onMove(v);
        };
        hit.addEventListener('pointerdown', function (e) {
          move(e);
          var up = function () { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
        });
      }

      legend.innerHTML = '';
      opts.series.forEach(function (s) {
        var b = html('button', 'key' + (hidden[s.name] ? ' off' : ''), legend);
        b.type = 'button';
        var sw = html('span', 'swatch' + (s.line === false ? ' dot' : s.dash ? ' dash' : ''), b);
        sw.style.setProperty('--c', s.color);
        html('span', '', b, s.name);
        b.addEventListener('click', function () { hidden[s.name] = !hidden[s.name]; b.blur(); draw(); });
      });
    }

    draw();
    if (window.ResizeObserver) new ResizeObserver(function () { draw(); }).observe(root);
    return {
      root: root,
      update: function (o) { for (var k in o) opts[k] = o[k]; draw(); },
      setCursor: function (x) { if (opts.cursor) { opts.cursor.x = x; draw(); } }
    };
  }

  /* Kit.player(el, {
       duration,                 // length of the story in model units (ms, steps, rounds…)
       rate,                     // model units per real second at 1×
       draw(t),                  // render the state at model time t
       phases: [{name, t0, t1}], // optional; drawn on the scrub bar, click to jump
       speeds: [0.25, 0.5, 1, 2, 4],
       format(t)                 // readout text, e.g. t => t.toFixed(1) + ' ms'
     })  ->  {play(), pause(), seek(t), t} */
  function player(el, o) {
    var speeds = o.speeds || [0.25, 0.5, 1, 2, 4], speed = 1, t = 0, playing = false, last = 0, raf = 0;
    el.classList.add('kit-player', 'controls');
    el.setAttribute('data-interactive', '');
    var btn = html('button', '', el, 'Play'); btn.type = 'button'; btn.style.minWidth = '112px';
    var seg = html('span', 'seg', el);
    speeds.forEach(function (s) {
      var b = html('button', s === 1 ? 'on' : '', seg, s + '×'); b.type = 'button';
      b.addEventListener('click', function () {
        speed = s; seg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); b.blur();
      });
    });
    var bar = html('div', 'kit-bar', el);
    bar.style.cssText = 'position:relative;flex:1;min-width:300px;height:48px;border-radius:10px;overflow:hidden;cursor:pointer;border:1.5px solid var(--line);background:var(--surface);touch-action:none';
    (o.phases || []).forEach(function (p, i) {
      var d = html('div', '', bar, p.name);
      d.style.cssText = 'position:absolute;top:0;bottom:0;display:grid;place-items:center;font-size:24px;white-space:nowrap;overflow:hidden;color:var(--muted);border-right:1.5px solid var(--line)';
      d.style.left = p.t0 / o.duration * 100 + '%';
      d.style.width = (p.t1 - p.t0) / o.duration * 100 + '%';
      d.style.background = i % 2 ? 'color-mix(in srgb, var(--fg) 5%, transparent)' : 'transparent';
    });
    var fill = html('div', '', bar);
    fill.style.cssText = 'position:absolute;left:0;top:0;bottom:0;background:color-mix(in srgb, var(--accent) 22%, transparent);border-right:3px solid var(--accent);pointer-events:none';
    var read = html('span', 'mono', el); read.style.minWidth = '150px'; read.style.textAlign = 'right';

    function render() {
      fill.style.width = t / o.duration * 100 + '%';
      read.textContent = o.format ? o.format(t) : t.toFixed(1);
      btn.textContent = playing ? 'Pause' : (t >= o.duration ? 'Replay' : 'Play');
      o.draw(t);
    }
    function tick(now) {
      if (!playing) return;
      t = Math.min(o.duration, t + (now - last) / 1000 * o.rate * speed); last = now;
      if (t >= o.duration) playing = false;
      render();
      if (playing) raf = requestAnimationFrame(tick);
    }
    function play() { if (t >= o.duration) t = 0; playing = true; last = performance.now(); raf = requestAnimationFrame(tick); render(); }
    function pause() { playing = false; cancelAnimationFrame(raf); render(); }
    function seek(v) { t = Math.min(o.duration, Math.max(0, v)); render(); }
    btn.addEventListener('click', function () { playing ? pause() : play(); btn.blur(); });
    var scrub = function (e) { var r = bar.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * o.duration); };
    bar.addEventListener('pointerdown', function (e) {
      scrub(e);
      var up = function () { window.removeEventListener('pointermove', scrub); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', scrub); window.addEventListener('pointerup', up);
    });
    var slide = el.closest('.slide');
    if (slide) slide.addEventListener('deck:leave', pause);
    render();
    return { play: play, pause: pause, seek: seek, get t() { return t; } };
  }

  /* Kit.panzoom(svgRoot, group, {max: 20})
     wheel = zoom about the pointer, drag = pan, double-click = reset. */
  function panzoom(root, group, o) {
    o = o || {};
    var k = 1, x = 0, y = 0, max = o.max || 20;
    root.setAttribute('data-interactive', '');
    root.style.cursor = 'grab'; root.style.touchAction = 'none';
    function apply() { group.setAttribute('transform', 'translate(' + x + ',' + y + ') scale(' + k + ')'); if (o.onChange) o.onChange(k); }
    function pt(e) { var m = root.getScreenCTM().inverse(); return [e.clientX * m.a + m.e, e.clientY * m.d + m.f]; }
    root.addEventListener('wheel', function (e) {
      e.preventDefault();
      var p = pt(e), nk = Math.min(max, Math.max(1, k * Math.exp(-e.deltaY * 0.0015)));
      x = p[0] - (p[0] - x) * nk / k; y = p[1] - (p[1] - y) * nk / k; k = nk;
      if (k === 1) { x = 0; y = 0; }
      apply();
    }, { passive: false });
    root.addEventListener('pointerdown', function (e) {
      var p0 = pt(e), x0 = x, y0 = y; root.style.cursor = 'grabbing';
      var mv = function (ev) { var p = pt(ev); x = x0 + p[0] - p0[0]; y = y0 + p[1] - p0[1]; apply(); };
      var up = function () { root.style.cursor = 'grab'; window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
    root.addEventListener('dblclick', function () { k = 1; x = 0; y = 0; apply(); });
    return { reset: function () { k = 1; x = 0; y = 0; apply(); }, get k() { return k; } };
  }

  window.Kit = { plot: plot, player: player, panzoom: panzoom, svg: svg, html: html, css: css, fmt: fmt };
})();
