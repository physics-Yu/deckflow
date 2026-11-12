/* deckflow core runtime: scaling, navigation, lifecycle.
   No dependencies. Works from file://. Exposes window.Deck. */
(function () {
  'use strict';
  var W = 1920, H = 1080, NARROW = 720;

  // capture runtime errors as early as possible; review.js reports them
  var errors = [];
  window.addEventListener('error', function (e) { errors.push(String(e.message || e.error || 'error')); });
  window.addEventListener('unhandledrejection', function (e) { errors.push('unhandled rejection: ' + String(e.reason)); });

  var deck, frames = [], slides = [], index = 0, step = 0, mode = 'paged', progress, count;

  function init() {
    deck = document.querySelector('.deck');
    if (!deck) return;
    slides = Array.prototype.slice.call(deck.querySelectorAll(':scope > .slide'));
    slides.forEach(function (s) {
      var f = document.createElement('div');
      f.className = 'frame';
      deck.insertBefore(f, s);
      f.appendChild(s);
      frames.push(f);
      f.addEventListener('click', function () { if (mode === 'overview') { setMode('paged'); go(slides.indexOf(s)); } });
    });
    progress = document.createElement('div'); progress.className = 'deck-progress';
    count = document.createElement('div'); count.className = 'deck-count';
    document.body.appendChild(progress); document.body.appendChild(count);

    var theme = new URLSearchParams(location.search).get('theme');
    if (theme) document.documentElement.setAttribute('data-theme', theme);

    window.addEventListener('resize', layout);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeprint', function () { setMode('flow'); });
    touch();
    layout();
    fromHash() || go(0);
    // authors hook slide lifecycle with: section.addEventListener('deck:enter', fn)
    document.dispatchEvent(new CustomEvent('deck:ready'));
  }

  function layout() {
    // clientWidth, not innerWidth: on phones innerWidth grows with overflowing content
    var root = document.documentElement;
    var vw = Math.min(window.innerWidth, root.clientWidth || window.innerWidth);
    var vh = Math.min(window.innerHeight, root.clientHeight || window.innerHeight);
    if (!vw || !vh) return;   // hidden tab: keep the last good scale
    var auto = vw < NARROW ? 'flow' : 'paged';
    if (mode !== 'overview' && mode !== auto && !layout.forced) mode = auto;
    var k = mode === 'paged' ? Math.min(vw / W, vh / H)
          : mode === 'flow' ? Math.min(1, (vw - 24) / W)
          : Math.max(0.12, Math.min(0.22, (vw - 120) / 3 / W));
    deck.style.setProperty('--k', k);
    deck.classList.remove('paged', 'flow', 'overview');
    deck.classList.add(mode);
    document.body.classList.toggle('flow', mode === 'flow');
    document.body.classList.toggle('overview', mode === 'overview');
    root.classList.toggle('flow', mode === 'flow');
    root.classList.toggle('overview', mode === 'overview');
    Deck.scale = k; Deck.mode = mode;
  }

  function setMode(m) { layout.forced = m !== 'paged'; mode = m; layout(); paint(); }

  function stepsOf(i) {
    var max = 0;
    slides[i].querySelectorAll('[data-step]').forEach(function (el) { max = Math.max(max, +el.getAttribute('data-step') || 1); });
    return max;
  }

  function paint() {
    frames.forEach(function (f, i) { f.classList.toggle('active', i === index); });
    slides[index].querySelectorAll('[data-step]').forEach(function (el) {
      el.classList.toggle('on', (+el.getAttribute('data-step') || 1) <= step);
    });
    progress.style.width = (slides.length > 1 ? index / (slides.length - 1) * 100 : 100) + '%';
    count.textContent = (index + 1) + ' / ' + slides.length;
  }

  function go(target, atEnd) {
    var i = typeof target === 'number' ? target : slides.findIndex(function (s) { return s.id === target; });
    if (i < 0 || i >= slides.length) return false;
    var prev = index, changed = i !== index || !go.started;
    if (changed && go.started) slides[prev].dispatchEvent(new CustomEvent('deck:leave', { bubbles: true }));
    index = i; step = atEnd ? stepsOf(i) : 0; go.started = true;
    paint();
    if (slides[i].id && location.hash !== '#' + slides[i].id) history.replaceState(null, '', '#' + slides[i].id);
    if (changed) slides[i].dispatchEvent(new CustomEvent('deck:enter', { bubbles: true }));
    if (mode !== 'paged') frames[i].scrollIntoView({ block: 'nearest' });
    return true;
  }

  function next() { if (step < stepsOf(index)) { step++; paint(); } else go(index + 1); }
  function prev() { if (step > 0) { step--; paint(); } else go(index - 1, true); }
  function fromHash() { var id = decodeURIComponent(location.hash.slice(1)); return id ? go(id) : false; }

  // Keyboard. Arrow keys belong to whatever the presenter is operating:
  // a focused form field, or a figure that declares data-keys="local".
  // PageDown / PageUp (what clickers send) always turn the page.
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, k = e.key;
    var typing = t.closest && t.closest('input, select, textarea, [contenteditable], [data-keys="local"]');
    if (k === 'Escape') { if (document.activeElement) document.activeElement.blur(); if (mode === 'overview') setMode('paged'); return; }
    if (k === 'PageDown') { next(); e.preventDefault(); return; }
    if (k === 'PageUp') { prev(); e.preventDefault(); return; }
    if (typing) return;
    if (k === ' ' && t.closest && t.closest('button, a')) return;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ') { next(); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp') { prev(); e.preventDefault(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1);
    else if (k === 'o' || k === 'O') setMode(mode === 'overview' ? 'paged' : 'overview');
    else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    else if (k === 'r' || k === 'R') { if (window.DeckReview) window.DeckReview.toggle(); }
  }

  function touch() {
    var x0 = null;
    window.addEventListener('touchstart', function (e) {
      x0 = e.target.closest('[data-interactive]') ? null : e.touches[0].clientX;
    }, { passive: true });
    window.addEventListener('touchend', function (e) {
      if (x0 === null || mode !== 'paged') return;
      var dx = e.changedTouches[0].clientX - x0;
      if (dx < -60) next(); else if (dx > 60) prev();
    }, { passive: true });
  }

  var Deck = window.Deck = {
    W: W, H: H, scale: 1, mode: 'paged', errors: errors,
    go: go, next: next, prev: prev, setMode: setMode,
    get index() { return index; },
    get slides() { return slides; },
    get current() { return slides[index]; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
