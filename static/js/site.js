/* =========================================================
   ADELE KA — GLOBAL SCRIPT
   Loaded on every page. Does: mobile menu, background switcher, floating plants,
   topic filters, and the photo viewer.
   ========================================================= */
(function () {
  var doc = document.documentElement;

  /* ---------- 1. mobile menu ---------- */
  var menuBtn = document.getElementById('menubtn');
  var menu = document.getElementById('mm');
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.textContent = open ? 'close' : 'menu';
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- 2. the plants ----------
     Each name below must match part of an image file name in the "asset-bank" in your footer.
     To add a new plant: upload it, drop it into the asset bank, then use its name in a slot. */
  var SLOTS = [
    // x/y = position on the page in %, s = width in px, a = "flowers" art, b = "garden" art
    { x: 3,  y: 2,  s: 100, a: 'flower-daisy-lilac',   b: 'garden-tomato-red',    d: 9,  dx: 14,  r: -12, z: .6, sp: .03 },
    { x: 46, y: 5,  s: 56,  a: 'flower-sprig-pink',    b: 'garden-corn',          d: 7,  dx: -10, r: 14,  z: .3, sp: -.04 },
    { x: 93, y: 7,  s: 84,  a: 'flower-zinnia-blue',   b: 'garden-pepper',        d: 8,  dx: -12, r: 18,  z: .8, sp: .025 },
    { x: 1,  y: 16, s: 60,  a: 'flower-sprig-blue',    b: 'garden-tomato-yellow', d: 10, dx: 10,  r: -14, z: .4, sp: -.03 },
    { x: 95, y: 22, s: 104, a: 'flower-zinnia-coral',  b: 'garden-carrot',        d: 12, dx: -16, r: 0,   z: .9, sp: -.02 },
    { x: 4,  y: 31, s: 80,  a: 'flower-daisy-peach',   b: 'garden-tomato-deep',   d: 9,  dx: 12,  r: 15,  z: .5, sp: .035 },
    { x: 92, y: 39, s: 58,  a: 'flower-sprig-yellow',  b: 'garden-pea',           d: 8,  dx: -8,  r: -8,  z: .4, sp: .04 },
    { x: 2,  y: 47, s: 92,  a: 'flower-zinnia-lilac',  b: 'garden-corn',          d: 11, dx: 12,  r: 10,  z: .7, sp: -.025 },
    { x: 96, y: 55, s: 82,  a: 'flower-daisy-blue',    b: 'garden-tomato-green',  d: 9,  dx: -10, r: 22,  z: .5, sp: .03 },
    { x: 3,  y: 63, s: 60,  a: 'flower-sprig-magenta', b: 'garden-tomato-orange', d: 8,  dx: 8,   r: -16, z: .4, sp: -.035 },
    { x: 94, y: 70, s: 96,  a: 'flower-zinnia-peach',  b: 'garden-pepper',        d: 12, dx: -14, r: 6,   z: .8, sp: .02 },
    { x: 1,  y: 78, s: 80,  a: 'flower-daisy-sage',    b: 'garden-tomato-red',    d: 10, dx: 10,  r: -6,  z: .6, sp: .03 },
    { x: 95, y: 86, s: 58,  a: 'flower-sprig-pink',    b: 'garden-carrot',        d: 9,  dx: -8,  r: 12,  z: .4, sp: -.04 },
    { x: 4,  y: 94, s: 88,  a: 'flower-zinnia-lilac',  b: 'garden-tomato-deep',   d: 11, dx: 12,  r: -10, z: .7, sp: .025 }
  ];

  function srcFor(name) {
    var im = document.querySelector('.asset-bank img[src*="' + name + '"]');
    return im ? im.getAttribute('src') : '';
  }

  var small = window.innerWidth < 700;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var bloom = document.querySelector('.bloom');
  if (!bloom) {
    bloom = document.createElement('div');
    bloom.className = 'bloom';
    bloom.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bloom);
  }
  var els = [];
  var redraw = function () {};

  function build(theme) {
    bloom.innerHTML = '';
    els.length = 0;
    SLOTS.forEach(function (o, i) {
      if (small && i % 2) return;
      var name = theme === 'garden' ? o.b : o.a;
      var url = srcFor(name);
      if (!url) return;
      var spins = theme !== 'garden' && name.indexOf('daisy') > -1; // only the daisies spin freely
      var dz = document.createElement('span');
      dz.className = 'dz';
      dz.style.left = o.x + '%';
      dz.style.top = o.y + '%';
      dz.style.width = (small ? o.s * 0.65 : o.s) + 'px';
      var im = document.createElement('img');
      im.className = 'pic float';
      im.alt = '';
      im.draggable = false;
      im.src = url;
      im.style.setProperty('--d', o.d + 's');
      im.style.setProperty('--delay', (-i * 0.9) + 's');
      im.style.setProperty('--dx', o.dx + 'px');
      im.style.setProperty('--r', (o.r * (spins ? 1 : 0.4)) + 'deg');
      dz.appendChild(im);
      bloom.appendChild(dz);
      els.push({ el: dz, z: o.z, sp: o.sp * (spins ? 1 : 0.35) });
    });
    redraw();
  }

  /* ---------- 3. background switcher ---------- */
  document.querySelectorAll('.bgpick img[data-key]').forEach(function (im) {
    im.src = srcFor(im.getAttribute('data-key'));
  });
  var picks = document.querySelectorAll('.bgpick button');
  function setTheme(t, fade) {
    doc.setAttribute('data-bg', t);
    picks.forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-bg') === t ? 'true' : 'false');
    });
    if (fade) {
      bloom.style.opacity = 0;
      setTimeout(function () { build(t); bloom.style.opacity = 1; }, 300);
    } else {
      build(t);
    }
    try { localStorage.setItem('ka-bg', t); } catch (e) {}
  }
  picks.forEach(function (b) {
    b.addEventListener('click', function () { setTheme(b.getAttribute('data-bg'), true); });
  });
  var saved = 'flowers';
  try { saved = localStorage.getItem('ka-bg') === 'garden' ? 'garden' : 'flowers'; } catch (e) {}
  setTheme(saved, false);

  /* ---------- 4. gentle parallax and scroll-spin ---------- */
  if (!reduce) {
    var tx = 0, ty = 0, cx = 0, cy = 0, sy = window.scrollY, queued = false;
    var draw = function () {
      queued = false;
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      els.forEach(function (o) {
        var d = o.z * 34;
        o.el.style.transform = 'translate3d(' + (-cx * d).toFixed(1) + 'px,' + (-cy * d).toFixed(1) + 'px,0) rotate(' + (sy * o.sp).toFixed(1) + 'deg)';
      });
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) queue();
    };
    var queue = function () { if (!queued) { queued = true; requestAnimationFrame(draw); } };
    window.addEventListener('scroll', function () { sy = window.scrollY; queue(); }, { passive: true });
    if (fine) {
      window.addEventListener('pointermove', function (e) {
        tx = (e.clientX / window.innerWidth - 0.5) * 2;
        ty = (e.clientY / window.innerHeight - 0.5) * 2;
        queue();
      }, { passive: true });
    }
    redraw = queue;
    queue();
  }
})();


/* =========================================================
   TOPIC FILTERS AND PHOTO VIEWER
   ========================================================= */
(function () {
  // Shuffle: a list marked data-shuffle (the snapshots page) is put in a random order.
  // It runs on every visit and again each time "all" is chosen.
  function shuffle(scope) {
    var items = [].slice.call(scope.children);
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = items[i]; items[i] = items[j]; items[j] = t;
    }
    items.forEach(function (it) { scope.appendChild(it); });
  }
  document.querySelectorAll('[data-shuffle]').forEach(shuffle);

  // Filters: buttons with data-f inside .chips filter items with data-t inside .filterable.
  // Tags can contain spaces ("touch grass", "ui/ux design"); an item with several tags separates them with "|".
  document.querySelectorAll('.chips').forEach(function (group) {
    var scope = document.querySelector(group.getAttribute('data-scope') || '.filterable');
    if (!scope) return;
    var empty = scope.parentNode.querySelector('.empty-note');
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip');
      if (!btn) return;
      var f = btn.getAttribute('data-f');
      group.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c === btn ? 'true' : 'false'); });
      if (f === 'all' && scope.hasAttribute('data-shuffle')) shuffle(scope);
      var shown = 0;
      scope.querySelectorAll('[data-t]').forEach(function (it) {
        var tags = it.getAttribute('data-t').split('|').map(function (x) { return x.trim(); });
        it.hidden = !(f === 'all' || tags.indexOf(f) > -1);
        if (!it.hidden) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    });
  });

  // Photo viewer (uses the built-in <dialog> element)
  var lb = document.getElementById('lb');
  if (!lb || !lb.showModal) return;
  var stage = lb.querySelector('.lb-stage'), cap = lb.querySelector('.lb-cap');
  var all = [].slice.call(document.querySelectorAll('.snap')), cur = 0, curList = [];
  // read the page order each time, since the snapshots can be shuffled
  function visible() { return [].slice.call(document.querySelectorAll('.snap')).filter(function (s) { return !s.closest('[hidden]') && !s.hidden; }); }
  // cover photos on a post or project: every photo in that gallery, including the ones behind "+N"
  document.querySelectorAll('.gallery').forEach(function (g) {
    var items = [].slice.call(g.querySelectorAll('.gal-item'));
    items.forEach(function (it, i) {
      it.addEventListener('click', function () { curList = items; cur = i; show(curList, cur); lb.showModal(); });
    });
  });
  function show(list, i) {
    var s = list[i];
    stage.innerHTML = '';
    stage.className = 'lb-stage';
    if (s.getAttribute('data-src')) {
      var im = document.createElement('img');
      im.className = 'photo'; im.src = s.getAttribute('data-src'); im.alt = s.getAttribute('data-cap') || '';
      stage.appendChild(im);
    } else {
      stage.className = 'lb-stage is-ph';
      stage.setAttribute('data-tint', s.getAttribute('data-tint') || 'sage');
      var art = s.querySelector('.art-flowers'), art2 = s.querySelector('.art-garden');
      [art, art2].forEach(function (a) { if (a) stage.appendChild(a.cloneNode(true)); });
    }
    cap.textContent = (s.getAttribute('data-cap') || '') + '  (' + (i + 1) + ' of ' + list.length + ')';
  }
  all.forEach(function (s) {
    s.addEventListener('click', function () {
      curList = visible(); cur = curList.indexOf(s); show(curList, cur); lb.showModal();
    });
  });
  function step(d) { var list = curList; cur = (cur + d + list.length) % list.length; show(list, cur); }
  lb.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
  lb.querySelector('.lb-next').addEventListener('click', function () { step(1); });
  lb.querySelector('.lb-close').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
})();


/* =========================================================
   CV SEED PACKET: opens the card; on close, the card vanishes
   and a handful of seeds pour back into the packet
   ========================================================= */
(function () {
  var wrap = document.getElementById('cvp');
  if (!wrap) return;
  var btn = document.getElementById('cvp-btn'), card = document.getElementById('cvp-card');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SEEDS = ['#5C3A1E', '#7A4B26', '#8B5A2B', '#A0522D', '#B07B4F', '#C19A6B', '#3E2A1A'];
  var busy = false;

  function pour(from, done) {
    // the opening is the top edge of the packet body (just above the tear line);
    // seeds fly behind the packet front, so they disappear as they drop in
    var mouth = btn.querySelector('.cvp-body').getBoundingClientRect();
    var mx = mouth.left + mouth.width / 2, my = mouth.top;
    var n = 26, left = n;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.className = 'cvp-seed';
      s.style.background = SEEDS[i % SEEDS.length];
      var sc = 0.75 + Math.random() * 0.6;
      s.style.width = (7 * sc) + 'px'; s.style.height = (10 * sc) + 'px';
      document.body.appendChild(s);
      // start somewhere across the card, arc up a little, then drop into the packet opening
      var x0 = from.left + 24 + Math.random() * (from.width - 48), y0 = from.top + from.height * (0.35 + Math.random() * 0.55);
      var x2 = mx + (Math.random() - 0.5) * (mouth.width - 36), y2 = my + 22 + Math.random() * 10;
      var x1 = (x0 + x2) / 2 + (Math.random() - 0.5) * 40, y1 = Math.min(y0, my) - 40 - Math.random() * 40;
      var r0 = Math.random() * 360, r1 = r0 + (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360);
      var anim = s.animate([
        { transform: 'translate(' + x0 + 'px,' + y0 + 'px) rotate(' + r0 + 'deg)', opacity: 0, offset: 0 },
        { transform: 'translate(' + x0 + 'px,' + y0 + 'px) rotate(' + r0 + 'deg)', opacity: 1, offset: 0.08 },
        { transform: 'translate(' + x1 + 'px,' + y1 + 'px) rotate(' + ((r0 + r1) / 2) + 'deg)', opacity: 1, offset: 0.45, easing: 'cubic-bezier(.55,0,.95,.6)' },
        { transform: 'translate(' + x2 + 'px,' + y2 + 'px) rotate(' + r1 + 'deg)', opacity: 1, offset: 1 }
      ], { duration: 620 + Math.random() * 260, delay: Math.random() * 380, easing: 'linear', fill: 'both' });
      anim.onfinish = (function (el) { return function () { el.remove(); if (--left === 0) done(); }; })(s);
    }
  }

  function open() {
    if (busy) return;
    btn.setAttribute('aria-expanded', 'true');
    card.classList.remove('is-leaving');
    card.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.classList.add('is-open'); }); });
  }
  function close(focusBack) {
    if (busy || !wrap.classList.contains('is-open')) return;
    btn.setAttribute('aria-expanded', 'false');
    var rect = card.getBoundingClientRect();
    card.classList.add('is-leaving');
    var finish = function () {
      card.hidden = true;
      card.classList.remove('is-leaving');
      wrap.classList.remove('is-open'); // the flap comes back
      btn.classList.remove('is-filling');
      busy = false;
      if (focusBack) btn.focus();
    };
    if (reduce || !btn.animate) { finish(); return; }
    busy = true;
    setTimeout(function () { card.hidden = true; }, 170);
    btn.classList.add('is-filling');
    pour(rect, finish);
  }
  btn.addEventListener('click', function () { wrap.classList.contains('is-open') ? close(false) : open(); });
  card.querySelector('.cvp-close').addEventListener('click', function () { close(true); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
  document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) close(false); });
})();
