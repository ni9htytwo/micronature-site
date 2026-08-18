/* microNature — EA-03D. Two devices: a light table you can turn, and one
   scene drawn from a camera that sits inside it. Nothing here loads. */
(function () {
  'use strict';

  /* Language. The sheet declares it on <html lang>; every string the canvas
     and the animation draw is looked up here rather than written inline. */
  var EN = (document.documentElement.getAttribute('lang') || 'zh').toLowerCase().indexOf('en') === 0;
  var L = EN ? {
    sensor: 'sensor ',
    sensorFull: function (h, d) { return 'sensor  height ' + h + ' m \u00b7 set back ' + d + ' m'; },
    contGround: 'read as continuous ground',
    trenchSeen: 'trench detected',
    truth: 'GROUND TRUTH \u00b7 trench 0.45 m wide, 0.80 m deep, cut on the plane of the beam',
    count: function (n, c) { return '<b>' + n + '</b> returns inside the trench \u00b7 cluster minimum ' + c; },
    miss: '<em>False-negative obstacle</em>\u2003Too few returns inside the trench to cluster, so they get filtered out as noise. The robot reads continuous ground and walks straight in.',
    seen: '<em>Trench detected</em>\u2003Enough returns inside the trench to cluster, so the robot reads the way ahead as impassable.',
    pause: 'Pause', play: 'Play'
  } : {
    sensor: '\u4f20\u611f\u5668 ',
    sensorFull: function (h, d) { return '\u4f20\u611f\u5668 \u9ad8 ' + h + ' m \u00b7 \u540e\u65b9 ' + d + ' m'; },
    contGround: '\u5224\u4e3a\u5730\u9762\u8fde\u7eed',
    trenchSeen: '\u6c9f\u88ab\u68c0\u51fa',
    truth: '\u771f\u503c \u00b7 \u6c9f\u5bbd 0.45 m\uff0c\u6df1 0.80 m\uff0c\u5256\u5207\u4e8e\u5149\u675f\u6240\u5728\u65ad\u9762',
    count: function (n, c) { return '<b>' + n + '</b>\u6761\u843d\u5165\u6c9f\u5185 \u00b7 \u6210\u7c07\u4e0b\u9650 ' + c + ' \u6761'; },
    miss: '<em>\u5047\u9634\u6027\u969c\u788d</em>\u3000\u6c9f\u5185\u56de\u6ce2\u4e0d\u8db3\u4ee5\u6210\u7c07\uff0c\u88ab\u5f53\u4f5c\u566a\u70b9\u6ee4\u9664\uff0c\u673a\u5668\u5224\u5b9a\u5730\u9762\u8fde\u7eed\uff0c\u6574\u53f0\u8d70\u8fdb\u6c9f\u91cc\u3002',
    seen: '<em>\u6c9f\u88ab\u68c0\u51fa</em>\u3000\u6c9f\u5185\u56de\u6ce2\u8db3\u4ee5\u6210\u7c07\uff0c\u673a\u5668\u5224\u5b9a\u524d\u65b9\u4e0d\u53ef\u901a\u884c\u3002',
    pause: '\u6682\u505c', play: '\u64ad\u653e'
  };


  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = function () { return window.matchMedia('(max-width: 820px)').matches; };
  var css = function (n) {
    return getComputedStyle(document.body).getPropertyValue(n).trim() || '#15181B';
  };

  /* ══ 1. Light table ════════════════════════════════════════════════════
     Three sheets of trace, separated in depth. Turning the deck square to
     the reader brings the three ground lines into one — the sheet's claim,
     checked rather than believed. */

  Array.prototype.forEach.call(document.querySelectorAll('.stk'), function (stk) {
    var view = stk.querySelector('.stk-view');
    var flatBtn = stk.querySelector('[data-mode="flat"]');
    var deckBtn = stk.querySelector('[data-mode="deck"]');
    if (!view) return;

    var rx = 9, ry = -42, shown = false;

    function apply() {
      view.style.setProperty('--rx', rx.toFixed(1) + 'deg');
      view.style.setProperty('--ry', ry.toFixed(1) + 'deg');
      stk.classList.toggle('square', Math.abs(ry) < 5 && Math.abs(rx) < 5);
    }

    function mode(m) {
      stk.classList.toggle('flat', m === 'flat');
      if (flatBtn) flatBtn.setAttribute('aria-pressed', String(m === 'flat'));
      if (deckBtn) deckBtn.setAttribute('aria-pressed', String(m !== 'flat'));
    }
    if (flatBtn) flatBtn.addEventListener('click', function () { mode('flat'); });
    if (deckBtn) deckBtn.addEventListener('click', function () { mode('deck'); });

    /* Open registered, then turn out: the reader sees one drawing become
       three. Once, on arrival, and only where motion is welcome. */
    function reveal() {
      if (shown) return;
      shown = true;
      if (reduce || narrow()) { apply(); return; }
      rx = 0; ry = 0; apply();
      setTimeout(function () { rx = 9; ry = -42; apply(); }, 420);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { reveal(); io.unobserve(e.target); } });
      }, { threshold: 0.35 });
      io.observe(stk);
    } else { reveal(); }

    /* Drag to turn. Vertical travel is deliberately half-weighted: the
       registration that matters is horizontal. */
    var id = null, px = 0, py = 0;
    view.addEventListener('pointerdown', function (e) {
      if (stk.classList.contains('flat') || narrow()) return;
      id = e.pointerId; px = e.clientX; py = e.clientY;
      view.classList.add('drag');
      view.setPointerCapture(id);
    });
    view.addEventListener('pointermove', function (e) {
      if (e.pointerId !== id) return;
      ry = Math.max(-72, Math.min(24, ry + (e.clientX - px) * 0.30));
      rx = Math.max(-14, Math.min(34, rx - (e.clientY - py) * 0.14));
      px = e.clientX; py = e.clientY;
      apply();
    });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      view.addEventListener(t, function (e) {
        if (e.pointerId !== id) return;
        id = null; view.classList.remove('drag');
      });
    });

    view.addEventListener('keydown', function (e) {
      var k = e.key, step = e.shiftKey ? 12 : 4;
      if (k === 'ArrowLeft') ry = Math.max(-72, ry - step);
      else if (k === 'ArrowRight') ry = Math.min(24, ry + step);
      else if (k === 'ArrowUp') rx = Math.min(34, rx + step);
      else if (k === 'ArrowDown') rx = Math.max(-14, rx - step);
      else if (k === 'Home') { rx = 0; ry = 0; }
      else return;
      e.preventDefault(); apply();
    });

    apply();
  });

  /* ══ 2. DS-04 · one scene, one camera ═══════════════════════════════════
     A trench 0.45 m wide and 0.80 m deep, cut open at the beam plane so the
     profile reads the way it reads on the flat sheet — hatched slab, notch,
     ground line. Every return below is solved, not drawn: where a beam lands
     follows from the mount height, the range and the angular pitch. Geometry
     only. No reflectance, no signal strength, no filter beyond the cluster
     floor named on the page. */

  var rig = document.getElementById('rig-ds04');
  if (!rig || !rig.getContext) return;

  var W = 0.45, H = 0.80, CLUSTER = 3;
  var cv = rig, ctx = cv.getContext('2d');
  var host = cv.parentNode;
  var out = document.getElementById('rig-out');
  var vCount = document.getElementById('rig-count');
  var vCall = document.getElementById('rig-call');

  var P = { h: 0.9, d: 4.0, res: 0.8 };
  var az = 0.26, el = 0.30;
  var w = 900, hgt = 450, dpr = 1;
  var cam = {}, G = {};

  var inputs = {
    h: document.getElementById('in-h'),
    d: document.getElementById('in-d'),
    res: document.getElementById('in-res')
  };
  var reads = {
    h: document.getElementById('rd-h'),
    d: document.getElementById('rd-d'),
    res: document.getElementById('rd-res')
  };

  /* -- frame ------------------------------------------------------------- */
  /* Fit on the vertical first: the mast grows with one slider and the slab is
     fixed, so a fit computed on width alone crops the sensor off the top. Two
     passes, because bringing the sensor into frame changes what must fit. */
  function frame() {
    var F = P.d + W, cx = (P.d + F) / 2;
    var zb = -1.15, dep = H + 0.22, UP = 0.60;
    var V, k, Wx, wx0, wx1;
    for (var i = 0; i < 2; i++) {
      V = UP + dep + 0.30 + Math.abs(zb) * Math.sin(el);
      k = hgt * 0.86 / V;
      Wx = w / k * 0.94;
      wx0 = cx - Wx * 0.62; wx1 = cx + Wx * 0.38;
      if (wx0 <= -0.25 && UP < P.h + 0.30) { UP = P.h + 0.30; continue; }
      break;
    }
    G = { F: F, cx: cx, zb: zb, dep: dep, UP: UP, wx0: wx0, wx1: wx1, mast: wx0 <= -0.25 };
    cam.tx = (wx0 + wx1) / 2; cam.ty = (UP - dep) / 2;
    cam.R = Math.max(5, Wx * 1.25); cam.f = k * cam.R;
    cam.ca = Math.cos(az); cam.sa = Math.sin(az);
    cam.ce = Math.cos(el); cam.se = Math.sin(el);
  }

  function pr(x, y, z) {
    var X = x - cam.tx, Y = y - cam.ty, Z = z || 0;
    var x1 = X * cam.ca - Z * cam.sa, z1 = X * cam.sa + Z * cam.ca;
    var y1 = Y * cam.ce - z1 * cam.se, z2 = Y * cam.se + z1 * cam.ce;
    var zc = z2 + cam.R;
    if (zc < 0.4) return null;
    return [w / 2 + x1 * cam.f / zc, hgt * 0.5 - y1 * cam.f / zc];
  }

  /* -- ink --------------------------------------------------------------- */
  function path(pts) {
    ctx.beginPath();
    for (var i = 0, p; i < pts.length; i++) {
      p = pr(pts[i][0], pts[i][1], pts[i][2]);
      if (!p) return false;
      if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
    }
    ctx.closePath();
    return true;
  }
  function fill(pts, col) { if (path(pts)) { ctx.fillStyle = col; ctx.fill(); } }
  function line(pts, col, lw) {
    ctx.beginPath();
    for (var i = 0, p, on = false; i < pts.length; i++) {
      p = pr(pts[i][0], pts[i][1], pts[i][2]);
      if (!p) { on = false; continue; }
      if (on) ctx.lineTo(p[0], p[1]); else { ctx.moveTo(p[0], p[1]); on = true; }
    }
    ctx.strokeStyle = col; ctx.lineWidth = lw || 1; ctx.stroke();
  }
  function seg(a, b, col, lw) { line([a, b], col, lw); }
  function dot(a, col, r, ring) {
    var p = pr(a[0], a[1], a[2]);
    if (!p) return;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.2832); ctx.fill();
    if (ring) {
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p[0], p[1], r + 3.4, 0, 6.2832); ctx.stroke();
    }
  }
  function lab(a, text, col, align, dx, dy, bold) {
    var p = pr(a[0], a[1], a[2]);
    if (!p) return;
    ctx.fillStyle = col;
    ctx.font = (bold ? '600 11px ' : '10px ') + '"IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = align || 'left';
    ctx.fillText(text, p[0] + (dx || 0), p[1] + (dy || 0));
  }

  /* -- the one piece of physics ------------------------------------------ */
  function solve() {
    var D = P.d, F = D + W, step = P.res, hits = [], inside = 0;
    for (var a = step; a <= 62.0001; a += step) {
      var t = Math.tan(a * Math.PI / 180), xg = P.h / t, p;
      if (xg <= D || xg >= F) p = { x: xg, y: 0, In: false };
      else {
        var yf = P.h - F * t;
        if (yf > -H) p = { x: F, y: yf, In: true };
        else p = { x: (P.h + H) / t, y: -H, In: true };
      }
      if (p.In) inside++;
      p.t = t; hits.push(p);
    }
    return { hits: hits, inside: inside };
  }

  /* -- the scene --------------------------------------------------------- */
  function draw() {
    var ink = css('--ink'), ink2 = css('--ink-2'), ink3 = css('--ink-3');
    var rule = css('--rule'), rule2 = css('--rule-2');
    var alarm = css('--flag'), acc = css('--accent');
    var paper = css('--paper'), gnd = css('--ground'), gnd2 = css('--ground-2');

    frame();
    var D = P.d, F = G.F, cx = G.cx, zb = G.zb, dep = G.dep, UP = G.UP;
    var wx0 = G.wx0, wx1 = G.wx1, zf = 0.02;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    ctx.fillStyle = paper; ctx.fillRect(0, 0, w, hgt);
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt';

    /* top surface, in two plates with the opening between them */
    fill([[wx0, 0, zb], [D, 0, zb], [D, 0, 0], [wx0, 0, 0]], paper);
    fill([[F, 0, zb], [wx1, 0, zb], [wx1, 0, 0], [F, 0, 0]], paper);
    fill([[D, 0, zb], [F, 0, zb], [F, 0, 0], [D, 0, 0]], gnd2);
    fill([[F, 0, zb], [F, -H * 0.62, zb], [F, -H * 0.62, 0], [F, 0, 0]], gnd);
    var z;
    for (z = zb; z <= 0.001; z += 0.42) {
      seg([wx0, 0, z], [D, 0, z], rule2, 1);
      seg([F, 0, z], [wx1, 0, z], rule2, 1);
    }
    for (var x = Math.ceil(wx0 * 2) / 2; x <= wx1; x += 0.5) {
      if (x > D - 0.02 && x < F + 0.02) continue;
      seg([x, 0, zb], [x, 0, 0], rule2, 1);
    }
    seg([wx0, 0, zb], [D, 0, zb], ink3, 1); seg([F, 0, zb], [wx1, 0, zb], ink3, 1);
    seg([D, 0, zb], [D, 0, 0], ink, 1); seg([F, 0, zb], [F, 0, 0], ink, 1);
    seg([D, 0, zb], [F, 0, zb], ink, 1);

    /* the cut face, hatched the way a section is hatched */
    var face = [[wx0, 0, 0], [D, 0, 0], [D, -H, 0], [F, -H, 0], [F, 0, 0],
                [wx1, 0, 0], [wx1, -dep, 0], [wx0, -dep, 0]];
    fill(face, paper);
    ctx.save();
    if (path(face)) {
      ctx.clip();
      for (var t = -2.0; t <= (wx1 - wx0) + dep + 1; t += 0.22) {
        seg([wx0 + t, 0.05, 0], [wx0 + t + dep + 0.7, -(dep + 0.65), 0], rule2, 1);
      }
    }
    ctx.restore();
    seg([wx0, 0, 0], [D, 0, 0], ink, 2); seg([F, 0, 0], [wx1, 0, 0], ink, 2);
    line([[D, 0, 0], [D, -H, 0], [F, -H, 0], [F, 0, 0]], ink, 2);
    line([[wx0, 0, 0], [wx0, -dep, 0], [wx1, -dep, 0], [wx1, 0, 0]], rule, 1);

    /* dimensions, on the cut face */
    seg([D, -H - 0.16, 0], [F, -H - 0.16, 0], ink3, 1);
    seg([D, -H - 0.12, 0], [D, -H - 0.20, 0], ink3, 1);
    seg([F, -H - 0.12, 0], [F, -H - 0.20, 0], ink3, 1);
    lab([cx, -H - 0.20, 0], '0.45 m', ink3, 'center', 0, 13);
    seg([F + 0.30, 0, 0], [F + 0.30, -H, 0], ink3, 1);
    seg([F + 0.25, 0, 0], [F + 0.35, 0, 0], ink3, 1);
    seg([F + 0.25, -H, 0], [F + 0.35, -H, 0], ink3, 1);
    lab([F + 0.38, -H / 2, 0], '0.80 m', ink3, 'left', 3, 4);

    /* beams, clipped to the frame, sitting on the cut face */
    var S = solve();
    var ex = G.mast ? 0 : wx0 + 0.05;
    var vis = S.hits.filter(function (p) {
      return p.x > ex && p.x <= wx1 && (P.h - ex * p.t) <= UP + 0.001;
    });
    var every = Math.max(1, Math.ceil(vis.length / 40));
    vis.forEach(function (p, i) {
      if (i % every && !p.In) return;
      seg([ex, P.h - ex * p.t, zf], [p.x, p.y, zf], p.In ? alarm : rule, p.In ? 1.2 : 0.8);
    });
    vis.forEach(function (p) { if (!p.In) dot([p.x, p.y, zf], ink, 1.9); });
    vis.forEach(function (p) { if (p.In) dot([p.x, p.y, zf], alarm, 2.4, S.inside < CLUSTER); });

    /* where the sensor is, said once */
    if (G.mast) {
      seg([0, 0, zf], [0, P.h, zf], ink2, 1.2);
      line([[-0.09, P.h, zf], [-0.09, P.h + 0.12, zf], [0.09, P.h + 0.12, zf], [0.09, P.h, zf]], ink, 1.4);
      lab([0.14, P.h + 0.12, zf], L.sensor + P.h.toFixed(2) + ' m', ink3, 'left', 3, -4);
    } else if (vis.length) {
      var yt = Math.min(UP, P.h - ex * vis[vis.length - 1].t);
      vis.forEach(function (p) { yt = Math.max(yt, Math.min(UP, P.h - ex * p.t)); });
      seg([ex, yt, zf], [ex + 0.26, yt, zf], ink3, 1);
      lab([ex + 0.28, yt, zf], L.sensorFull(P.h.toFixed(2), P.d.toFixed(2)),
          ink3, 'left', 3, -4);
    }

    /* what the robot concludes */
    var missed = S.inside < CLUSTER, top = UP * 0.92;
    if (missed) {
      seg([D - 0.08, 0.015, zf], [F + 0.08, 0.015, zf], alarm, 3);
      seg([cx, 0.03, zf], [cx, top, zf], alarm, 1);
      lab([cx, top, zf], L.contGround, alarm, 'right', -7, -4, true);
    } else {
      seg([cx, -H * 0.5, zf], [cx, top, zf], acc, 1);
      lab([cx, top, zf], L.trenchSeen, acc, 'right', -7, -4, true);
    }

    ctx.fillStyle = ink2;
    ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(L.truth, 16, hgt - 14);

    out.className = 'rig-out ' + (missed ? 'miss' : 'seen');
    vCount.innerHTML = L.count(S.inside, CLUSTER);
    vCall.innerHTML = missed
      ? L.miss
      : L.seen;
  }

  /* -- plumbing ---------------------------------------------------------- */
  function size() {
    var box = host.getBoundingClientRect();
    w = Math.max(320, Math.round(box.width));
    hgt = Math.round(Math.max(300, Math.min(470, w * 0.50)));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = w * dpr; cv.height = hgt * dpr;
    cv.style.height = hgt + 'px';
    draw();
  }

  function pull() {
    P.h = +inputs.h.value / 100;
    P.d = +inputs.d.value / 10;
    P.res = +inputs.res.value / 10;
    reads.h.textContent = P.h.toFixed(2) + ' m';
    reads.d.textContent = P.d.toFixed(1) + ' m';
    reads.res.textContent = P.res.toFixed(1) + '\u00b0';
    draw();
  }
  Object.keys(inputs).forEach(function (k) { inputs[k].addEventListener('input', pull); });

  var pid = null, lx = 0, ly = 0;
  cv.addEventListener('pointerdown', function (e) {
    pid = e.pointerId; lx = e.clientX; ly = e.clientY;
    cv.classList.add('drag'); cv.setPointerCapture(pid);
  });
  cv.addEventListener('pointermove', function (e) {
    if (e.pointerId !== pid) return;
    az = Math.max(-0.05, Math.min(0.95, az + (e.clientX - lx) * 0.004));
    el = Math.max(0.06, Math.min(0.72, el + (e.clientY - ly) * 0.003));
    lx = e.clientX; ly = e.clientY;
    draw();
  });
  ['pointerup', 'pointercancel'].forEach(function (t) {
    cv.addEventListener(t, function (e) {
      if (e.pointerId !== pid) return;
      pid = null; cv.classList.remove('drag');
    });
  });
  cv.addEventListener('keydown', function (e) {
    var k = e.key, s = e.shiftKey ? 0.14 : 0.05;
    if (k === 'ArrowLeft') az = Math.max(-0.05, az - s);
    else if (k === 'ArrowRight') az = Math.min(0.95, az + s);
    else if (k === 'ArrowUp') el = Math.min(0.72, el + s);
    else if (k === 'ArrowDown') el = Math.max(0.06, el - s);
    else return;
    e.preventDefault(); draw();
  });

  window.addEventListener('resize', size, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  pull(); size();

  /* ═══ DS-02 drawn path shares the L dictionary above, so it lives in the
     same closure rather than its own. ═══ */

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ══ 3. DS-02 · a drawn path ════════════════════════════════════════════
     Deliberately not a solver. The specular case needs a reflectance model
     to compute honestly, and this page does not have one, so this block
     animates a construction and says so. What it shows is still true: the
     return lands at the mirror of the floor point, and the glass plane
     itself collects nothing. */

  var an = document.getElementById('anim-ds02');
  if (!an) return;

  var anPaths = ['p-out', 'p-ref', 'p-back'].map(function (id) {
    var el = an.querySelector('#' + id);
    var L = el.getTotalLength();
    el.style.strokeDasharray = L; el.style.strokeDashoffset = L;
    return { el: el, L: L };
  });
  var anGhost = an.querySelector('#p-ghost');
  var anGL = anGhost.getTotalLength();
  anGhost.style.strokeDasharray = anGL; anGhost.style.strokeDashoffset = anGL;

  var anGroups = [1, 2, 3, 4, 5].map(function (n) { return an.querySelector('#ag-' + n); });
  var anPulse = an.querySelector('#a-pulse');
  var anSteps = document.getElementById('anim-steps').children;
  var anToggle = document.querySelector('[data-anim="toggle"]');
  var anReplay = document.querySelector('[data-anim="replay"]');

  var SPAN = [950, 620, 1250, 850, 1700, 1300];   /* five phases plus a hold */
  var TOTAL = SPAN.reduce(function (a, b) { return a + b; }, 0);
  var anT = 0, anLast = 0, anRun = false, anSeen = false, anFrame = null;

  function anRender(t) {
    var acc = 0, ph = 0, local = 0, i;
    for (i = 0; i < SPAN.length; i++) {
      if (t < acc + SPAN[i]) { ph = i + 1; local = (t - acc) / SPAN[i]; break; }
      acc += SPAN[i];
    }
    if (!ph) { ph = SPAN.length; local = 1; }

    for (i = 0; i < 5; i++) anGroups[i].classList.toggle('on', ph >= i + 1);
    for (i = 0; i < anSteps.length; i++)
      anSteps[i].classList.toggle('on', ph === i + 1 || (ph > 5 && i === 4));

    /* Each ray draws itself over its own phase and stays drawn after it. */
    anPaths.forEach(function (p, k) {
      var pr = ph > k + 1 ? 1 : (ph === k + 1 ? local : 0);
      p.el.style.strokeDashoffset = p.L * (1 - pr);
    });
    anGhost.style.strokeDashoffset = anGL * (1 - (ph > 4 ? 1 : (ph === 4 ? local : 0)));

    if (ph <= 3) {
      var p = anPaths[ph - 1];
      var pt = p.el.getPointAtLength(p.L * local);
      anPulse.setAttribute('cx', pt.x); anPulse.setAttribute('cy', pt.y);
      anPulse.style.opacity = 1;
    } else {
      anPulse.style.opacity = 0;
    }
  }

  function anTick(now) {
    if (!anRun) return;
    if (!anLast) anLast = now;
    anT += Math.min(now - anLast, 120);   /* a backgrounded tab must not jump */
    anLast = now;
    if (anT >= TOTAL) anT -= TOTAL;
    anRender(anT);
    anFrame = window.requestAnimationFrame(anTick);
  }

  function anPlay(on) {
    anRun = on; anLast = 0;
    anToggle.textContent = on ? L.pause : L.play;
    anToggle.setAttribute('aria-pressed', String(on));
    if (on) anFrame = window.requestAnimationFrame(anTick);
    else if (anFrame) window.cancelAnimationFrame(anFrame);
  }

  anToggle.addEventListener('click', function () { anPlay(!anRun); });
  anReplay.addEventListener('click', function () { anT = 0; anRender(0); anPlay(true); });

  /* Reduced motion opens on the finished construction and waits to be asked. */
  if (reduce) {
    anT = TOTAL - SPAN[5] - 1; anRender(anT); anPlay(false);
  } else {
    anRender(0);
    if ('IntersectionObserver' in window) {
      var anIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { if (!anSeen) { anSeen = true; anPlay(true); } }
          else if (anRun) anPlay(false);   /* nothing animates off screen */
        });
      }, { threshold: 0.25 });
      anIO.observe(an);
    } else { anPlay(true); }
  }
})();
