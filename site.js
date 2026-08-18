/* microNature — shared behaviour. Two things only: scroll reveal, figure viewer. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 0. Which language is this sheet set in. Read off <html lang>, so a page
        declares its own language and nothing has to be configured twice. */
  var EN = (document.documentElement.getAttribute('lang') || 'zh').toLowerCase().indexOf('en') === 0;
  var UI = EN
    ? { close: 'CLOSE  ESC', term: 'TERM', jump: 'GO TO', copied: 'COPIED', hold: 'PRESS AND HOLD' }
    : { close: '\u5173\u95ed ESC', term: '\u91ca\u4e49', jump: '\u8df3\u8f6c', copied: '\u5df2\u590d\u5236', hold: '\u8bf7\u957f\u6309\u590d\u5236' };

  /* 0b. Light and dark. The choice is remembered per reader; without one the
        English register reads dark and the Chinese one follows the system
        preference — and a live change there is followed until the reader
        makes a choice of their own. The pre-paint script in each <head> has
        already set the attribute before first draw. */
  var THEME_KEY = 'mn-theme';
  var rootEl = document.documentElement;
  var themeBtn = document.querySelector('.nav-theme');
  var sysDark = window.matchMedia('(prefers-color-scheme: dark)');

  function themeLabel() {
    if (!themeBtn) return;
    var dark = rootEl.getAttribute('data-theme') === 'dark';
    themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    var t = EN ? (dark ? 'Switch to light' : 'Switch to dark')
               : (dark ? '\u5207\u6362\u5230\u660e\u8272' : '\u5207\u6362\u5230\u6697\u8272');
    themeBtn.setAttribute('aria-label', t);
    themeBtn.setAttribute('title', t);
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = rootEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      rootEl.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      themeLabel();
    });
    themeLabel();
    /* The Chinese register tracks a live system change until the reader
       chooses; the English one keeps its dark default. */
    if (!EN) {
      var followSys = function (e) {
        var saved = null;
        try { saved = localStorage.getItem(THEME_KEY); } catch (err) {}
        if (saved !== 'light' && saved !== 'dark') {
          rootEl.setAttribute('data-theme', e.matches ? 'dark' : 'light');
          themeLabel();
        }
      };
      if (sysDark.addEventListener) sysDark.addEventListener('change', followSys);
      else if (sysDark.addListener) sysDark.addListener(followSys);
    }
  }

  /* 1. Reveal figures once as they enter. */
  var rises = document.querySelectorAll('.rise');
  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(rises, function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    Array.prototype.forEach.call(rises, function (el) {
      // Landing mid-page (an anchor link, a restored scroll position) must not
      // leave a figure clipped forever: anything already at or above the fold
      // is revealed outright rather than waiting for an intersection.
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      else io.observe(el);
    });
  }

  /* 2. Drop reserved image slots that have no file yet, revealing the
        placeholder underneath instead of a broken-image icon. */
  Array.prototype.forEach.call(document.querySelectorAll('img[data-slot]'), function (img) {
    img.addEventListener('error', function () { img.remove(); });
    if (img.complete && img.naturalWidth === 0) img.remove();
  });

  /* 3. Where am I. A reading line sits a third of the way down the viewport;
        the current section is the last one whose top has crossed it. Marks the
        margin column and mirrors it into the nav, which stays visible even in
        a section long enough to scroll the marker away. */
  var bands = document.querySelectorAll('.band[id]');
  var here = document.querySelector('.nav-here');
  if (bands.length) {
    var ticking = false, active = null;
    // The contents list already names every section in short form; reuse it
    // rather than trying to shorten a heading at runtime.
    var names = {};
    Array.prototype.forEach.call(document.querySelectorAll('.toc-list a'), function (a) {
      var t = a.querySelector('.toc-t');
      if (t) names[a.getAttribute('href').slice(1)] = t.textContent.split('·')[0].trim();
    });
    var label = function (el) {
      var n = el.querySelector('.rail-num');
      var name = names[el.id] || (el.querySelector('.rail-en') || {}).textContent || '';
      return (n ? '<b>' + n.textContent.trim() + '</b>' : '') + name.trim().slice(0, 16);
    };
    var mark = function () {
      ticking = false;
      var line = window.innerHeight * 0.32, found = null;
      Array.prototype.forEach.call(bands, function (el) {
        if (el.getBoundingClientRect().top <= line) found = el;
      });
      if (found === active) return;
      if (active) active.classList.remove('here');
      if (found) found.classList.add('here');
      active = found;
      if (here) {
        if (found && found.querySelector('.h2')) {
          here.innerHTML = label(found);
          here.classList.add('on');
        } else {
          here.classList.remove('on');
        }
      }
    };
    var onScroll = function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(mark); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    mark();
  }

  /* 4. Open an oversized figure at its drawn size. */
  var buttons = document.querySelectorAll('[data-zoom]');
  if (buttons.length) {
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.innerHTML =
      '<div class="lb-bar"><span class="lb-title"></span>' +
      '<button class="lb-close" type="button">' + UI.close + '</button></div>' +
      '<div class="lb-frame"></div>';
    document.body.appendChild(lb);

    var titleEl = lb.querySelector('.lb-title');
    var frame = lb.querySelector('.lb-frame');
    var closeBtn = lb.querySelector('.lb-close');
    var opener = null;

    function open(fig, label) {
      var svg = fig.querySelector('svg');
      if (!svg) return;
      frame.innerHTML = '';
      frame.appendChild(svg.cloneNode(true));
      titleEl.textContent = label;
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function close() {
      lb.hidden = true;
      frame.innerHTML = '';
      document.body.style.overflow = '';
      if (opener) { opener.focus(); opener = null; }
    }

    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        var fig = document.getElementById(btn.getAttribute('data-zoom'));
        if (!fig) return;
        opener = btn;
        open(fig, btn.getAttribute('data-zoom-label') || '');
      });
    });

    closeBtn.addEventListener('click', close);
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lb.hidden) close();
    });
  }

  /* 5. One popover serving two devices.
        A .term looks its definition up in the glossary below; an .xref reads
        the heading and caption of whatever it points at, so a reference can
        never drift out of sync with its target. */
  var GLOSSARY_ZH = {
    'affordance': ['可为性 · Affordance', '环境与机器本体之间的关系属性：这台机器在这片场地能站、能过、能抓，还是必须绕行。换一台本体，答案就不同。'],
    'embodiment': ['本体 · Embodiment', '一台机器的物理参数：尺寸、步态、抓取范围、传感器安装高度。可为性判定的全部输入。'],
    'sim2real': ['Sim2Real Gap', '仿真里训练好的策略迁到真实场地后的性能落差。根源多在物理不对齐，而非模型不够大。'],
    'liangli': ['量力而行 · 左传·隐公十一年', '力在这里不是机器的绝对能力，是这台机器和这片场地之间的关系值；重点在于量。'],
    'domain-native': ['领域原生 · Domain-Native', '物理模型按具体作业环境建立（矿井、洁净室、露天矿区各不相同），而不是套用一套通用模板。'],
    'redblue': ['红蓝对抗', '借自安全测试中的红队传统：主动构造会让系统出错的场景，而不是等它在现场出错。'],
    'oblique': ['倾斜摄影', '从多个倾斜角度航拍同一片地物，用于重建带真实纹理的三维模型。'],
    'pointcloud': ['点云 · Point Cloud', '激光扫描得到的三维坐标点集合，用来还原场地的真实几何。'],
    'bim': ['BIM · 建筑信息模型', '含几何与构件属性的工程数据模型，通常来自设计与施工阶段。'],
    'urdf': ['URDF · 机器人统一描述格式', '用一份文件描述机器人的连杆、关节与传感器安装位置，是本体参数的标准载体。'],
    'viewshed': ['可视域分析', '从一个观察点出发，计算空间中哪些位置可见、哪些被遮挡。'],
    'twin': ['数字孪生', '与真实场地在几何与物理上对齐的数字副本，可反复调用与重算。'],
    'embodied': ['具身智能 · Embodied AI', '依托物理身体在真实环境中感知与行动的智能，与纯文本模型的关键差别在于要承担物理后果。'],
    'scaling': ['Scaling Law', '模型能力随参数、数据与算力增长而可预测提升的规律。物理智能至今没有出现同样的曲线。'],
    'flywheel': ['数据飞轮', '场地数据产出验证标准，验证结果又反哺场地数据；部署得越多，两端积累越快。'],
    'teleop': ['遥操作 · Teleoperation', '由人远程操控真机采集动作数据。物理真实，但采集效率低、成本高，难以规模化。'],
    'domesticcpu': ['国产 CPU 全架构', 'ARM 麒麟鲲鹏、MIPS 龙芯、SW-64 申威、x86 四种架构，操作系统覆盖统信 UOS 与麒麟 OS。']
  };

  var GLOSSARY_EN = {
    'affordance': ['Affordance', 'A relational property between a site and one particular machine body. Can this machine stand here, get through, take hold, or does it have to go around. Change the body and the answer changes.'],
    'embodiment': ['Embodiment', 'The physical parameters of a single machine: dimensions, gait, grasp envelope, sensor mounting height. These are the whole input to an affordance verdict.'],
    'sim2real': ['Sim2Real gap', 'The drop in performance when a policy trained in simulation is moved onto a real site. The cause usually sits in physical misalignment rather than in model size.'],
    'liangli': ['Know your limits', 'Zuo Zhuan, 11th year of Duke Yin. The limit here is not the absolute capability of the machine but the relation between this machine and this site.'],
    'domain-native': ['Domain-native', 'Physical models built for one specific working environment. A mine drift, a cleanroom and an open-pit haul road are not the same place, and none of them is a general template.'],
    'redblue': ['Red team, blue team', 'Borrowed from the red-team tradition in security testing. Construct the scenes that will make a system fail, instead of waiting for it to fail on site.'],
    'oblique': ['Oblique photogrammetry', 'Aerial capture of the same ground from several oblique angles, used to reconstruct a textured three-dimensional model.'],
    'pointcloud': ['Point cloud', 'The set of three-dimensional coordinates returned by laser scanning, used to recover the true geometry of a site.'],
    'bim': ['BIM, building information model', 'An engineering data model carrying both geometry and component attributes, usually produced during design and construction.'],
    'urdf': ['URDF, unified robot description format', 'One file describing the links, joints and sensor mounting positions of a robot. The standard carrier of body parameters.'],
    'viewshed': ['Viewshed analysis', 'From a given observation point, computing which positions in space are visible and which are occluded.'],
    'twin': ['Digital twin', 'A digital counterpart aligned with a real site in geometry and in physics, which can be called and recomputed as often as needed.'],
    'embodied': ['Embodied AI', 'Intelligence that perceives and acts in the real world through a physical body. What separates it from a text-only model is that it carries physical consequences.'],
    'scaling': ['Scaling law', 'The regularity by which model capability improves predictably with parameters, data and compute. No comparable curve has appeared for physical intelligence.'],
    'flywheel': ['Data flywheel', 'Site data produces validation standards, and validation results feed back into site data. The more deployments there are, the faster both ends accumulate.'],
    'teleop': ['Teleoperation', 'A human operating a real machine remotely to collect motion data. Physically faithful, slow and expensive to collect, hard to scale.'],
    'domesticcpu': ['Full domestic CPU coverage', 'ARM (Kirin, Kunpeng), MIPS (Loongson), SW-64 (Sunway) and x86, with operating systems covering UOS and Kylin OS.']
  };

  var GLOSSARY = EN ? GLOSSARY_EN : GLOSSARY_ZH;

  var pop = null, popFor = null, popTimer = null;

  function popEl() {
    if (pop) return pop;
    pop = document.createElement('div');
    pop.className = 'pop';
    pop.setAttribute('role', 'tooltip');
    document.body.appendChild(pop);
    return pop;
  }

  function describe(el) {
    if (el.classList.contains('term')) {
      var g = GLOSSARY[el.getAttribute('data-t')];
      return g ? { k: UI.term, t: g[0], d: g[1] } : null;
    }
    var id = (el.getAttribute('href') || '').replace(/^#/, '');
    var tgt = id && document.getElementById(id);
    if (!tgt) return null;
    var t = '', d = '';
    if (tgt.classList.contains('plate')) {
      var cb = tgt.querySelector('.plate-cap b'), cs = tgt.querySelector('.plate-cap span');
      t = cb ? cb.textContent.trim() : '';
      if (cs) d = cs.textContent.trim();
    } else if (tgt.classList.contains('step')) {
      var sn = tgt.querySelector('.step-n'), h4 = tgt.querySelector('.h4');
      t = (sn ? sn.childNodes[0].textContent.trim() + ' · ' : '') + (h4 ? h4.textContent.trim() : '');
      var sp = tgt.querySelector('p');
      d = sp ? sp.textContent.trim() : '';
    } else {
      var h = tgt.querySelector('.sec-no, .h2, h2');
      t = h ? h.textContent.trim() : '';
      var p2 = tgt.querySelector('.p, p');
      d = p2 ? p2.textContent.trim() : '';
    }
    if (d.length > 110) d = d.slice(0, 110) + '…';
    return { k: UI.jump, t: t, d: d };
  }

  function show(el) {
    var info = describe(el);
    if (!info) return;
    var p = popEl();
    p.innerHTML = '<span class="pop-k"></span><div class="pop-t"></div><div class="pop-d"></div>';
    p.querySelector('.pop-k').textContent = info.k;
    p.querySelector('.pop-t').textContent = info.t;
    p.querySelector('.pop-d').textContent = info.d;
    p.classList.add('on');
    popFor = el;
    var r = el.getBoundingClientRect();
    var pw = p.offsetWidth, ph = p.offsetHeight;
    var x = Math.min(Math.max(16, r.left), window.innerWidth - pw - 16);
    var y = r.bottom + 10;
    if (y + ph > window.innerHeight - 12) y = Math.max(12, r.top - ph - 10);
    p.style.left = x + 'px';
    p.style.top = y + 'px';
  }

  function hide() {
    if (!pop) return;
    pop.classList.remove('on');
    popFor = null;
  }

  /* Terms degrade to a native tooltip where the popover never appears. */
  Array.prototype.forEach.call(document.querySelectorAll('.term'), function (el) {
    var g = GLOSSARY[el.getAttribute('data-t')];
    if (g && !el.title) el.title = g[0] + ' — ' + g[1];
  });

  var HOVERABLE = '.term, .xref';
  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest ? e.target.closest(HOVERABLE) : null;
    if (el) { clearTimeout(popTimer); show(el); }
  });
  document.addEventListener('mouseout', function (e) {
    var el = e.target.closest ? e.target.closest(HOVERABLE) : null;
    if (el && el === popFor) popTimer = setTimeout(hide, 120);
  });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest ? e.target.closest(HOVERABLE) : null;
    if (el) show(el);
  });
  document.addEventListener('focusout', function (e) {
    if (e.target === popFor) hide();
  });
  /* Touch has no hover: a tap on a term toggles its card instead. */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.term') : null;
    if (el) { if (popFor === el) hide(); else show(el); }
    else if (popFor) hide();
  });
  window.addEventListener('scroll', hide, { passive: true });

  /* 6. An identifier meant to be carried away: one press lifts it, and the
        label reports back. Clipboard access is refused often enough — plain
        http, an in-app browser, an old engine — that the last fallback is to
        select the text so a long press can still take it. */
  var copies = document.querySelectorAll('[data-copy]');
  Array.prototype.forEach.call(copies, function (btn) {
    var k = btn.querySelector('.copy-k');
    var rest = k ? k.textContent : '';
    var timer = null;

    function say(msg, ok) {
      if (!k) return;
      k.textContent = msg;
      if (ok) btn.classList.add('done'); else btn.classList.remove('done');
      clearTimeout(timer);
      timer = setTimeout(function () {
        k.textContent = rest;
        btn.classList.remove('done');
      }, 2000);
    }

    function viaTextarea(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) {}
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }

    function offerManually() {
      var v = btn.querySelector('.copy-v') || btn;
      try {
        var r = document.createRange();
        r.selectNodeContents(v);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      } catch (e) {}
      say(UI.hold, false);
    }

    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      if (!text) return;
      var done = function () { say(UI.copied, true); };
      var fallback = function () { if (viaTextarea(text)) done(); else offerManually(); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    });
  });

  /* 7. Arriving somewhere by reference should say so: flash the target. */
  function flash(id) {
    var tgt = document.getElementById(id);
    if (!tgt) return;
    tgt.classList.remove('flash');
    void tgt.offsetWidth; /* restart the animation on a repeat arrival */
    tgt.classList.add('flash');
    tgt.addEventListener('animationend', function () {
      tgt.classList.remove('flash');
    }, { once: true });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a.xref[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    setTimeout(function () { flash(id); }, 350);
  });
  if (location.hash) {
    setTimeout(function () { flash(location.hash.slice(1)); }, 600);
  }
})();
