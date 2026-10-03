/* =====================================================================
   Digital Design Explorer – Level 7 (Part B) shared engine
   Exposes one global: window.L7
   ---------------------------------------------------------------------
   Progress keys (localStorage, same style as Levels 5 and 6):
     level7_module<N>_completed = "true"      ← read by common.js
     dde_level7_progress = { m: { "<N>": {
         a:   { <activityId>: 1 },              activities + practice done
         req: { a:[ids], p:[ids] },             what the module contains
         q:   { best, last, total, tries, date } module quiz
         done: "YYYY-MM-DD" } } }
   ===================================================================== */
(function () {
  'use strict';

  var L7 = window.L7 = window.L7 || {};
  var KEY = 'dde_level7_progress';
  var PASS = 0.7;
  L7.PASS = PASS;

  /* ---------- Module catalogue (used by the hub and the pager) ---------- */
  L7.ACC = ['#0071e3', '#ff9500', '#34c759', '#af52de', '#ff2d55', '#00a7c4', '#5856d6', '#e5332a', '#00b39f', '#d48a00'];
  L7.MODULES = [
    { t: 'Advanced CMOS Logic Design', i: '⚡', d: 'Complex gates, PUN/PDN design, AOI/OAI, transmission-gate, pass-transistor, ratioed, dynamic and domino logic.' },
    { t: 'VLSI Arithmetic Circuit Design', i: '➕', d: 'Ripple, look-ahead, select, skip and prefix adders; subtractors, comparators, array, Wallace and Dadda multipliers.' },
    { t: 'Datapath Circuit Design', i: '🔀', d: 'Bit-sliced datapaths, multiplexer networks, shifters, barrel shifters and ALU organisation.' },
    { t: 'VLSI Memory Circuits', i: '🧠', d: '6T SRAM read/write, array organisation, decoders, sense amplifiers, DRAM and ROM.' },
    { t: 'VLSI Interconnect', i: '〰️', d: 'Metal stack, wire resistance and capacitance, RC delay, coupling and crosstalk, scaling.' },
    { t: 'Standard Cell Design', i: '🧱', d: 'Cell architecture, height and tracks, drive strength, sizing, layout rules and libraries.' },
    { t: 'IP-Based VLSI Design', i: '🧩', d: 'Soft, firm and hard IP, design reuse, interfaces, SoC building blocks and IP verification.' },
    { t: 'VLSI Design for Reliability', i: '🛡️', d: 'PVT variation, mismatch, ageing, soft errors and designing for robustness.' },
    { t: 'Emerging Digital VLSI Technologies', i: '🚀', d: 'FinFET, GAA nanosheets, 2.5D/3D integration, chiplets and advanced packaging.' },
    { t: 'Digital VLSI Mini Project', i: '🛠️', d: 'Design, verify and document a complete digital VLSI building block of your choice.' }
  ];

  /* ---------- Storage ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  function load() {
    var d; try { d = JSON.parse(lsGet(KEY) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    if (!d.m || typeof d.m !== 'object') d.m = {};
    return d;
  }
  function save(d) { lsSet(KEY, JSON.stringify(d)); }
  function mod(d, n) {
    var m = d.m[n];
    if (!m || typeof m !== 'object') m = d.m[n] = {};
    if (!m.a) m.a = {};
    return m;
  }
  function today() { var t = new Date(); return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); }
  L7.isComplete = function (n) { return lsGet('level7_module' + n + '_completed') === 'true'; };

  /* Summary of one module for dashboards */
  L7.summary = function (n) {
    var m = load().m[n] || {}, a = m.a || {}, req = m.req || null;
    var aT = req ? req.a.length : 0, pT = req ? req.p.length : 0;
    var aD = req ? req.a.filter(function (x) { return a[x]; }).length : 0;
    var pD = req ? req.p.filter(function (x) { return a[x]; }).length : 0;
    var q = m.q || null, qPass = !!(q && q.total && q.best / q.total >= PASS);
    var complete = L7.isComplete(n);
    var units = aT + pT + 1, got = aD + pD + (qPass ? 1 : 0);
    var frac = complete ? 1 : (req ? got / units : 0);
    return { started: !!req, aT: aT, aD: aD, pT: pT, pD: pD, q: q, qPass: qPass, complete: complete, frac: Math.min(1, frac) };
  };
  L7.levelSummary = function () {
    var s = { mods: 0, frac: 0, aT: 0, aD: 0, pT: 0, pD: 0, qBest: 0, qTotal: 0, qTaken: 0 };
    for (var n = 1; n <= 10; n++) {
      var x = L7.summary(n);
      if (x.complete) s.mods++;
      s.frac += x.frac / 10; s.aT += x.aT; s.aD += x.aD; s.pT += x.pT; s.pD += x.pD;
      if (x.q) { s.qBest += x.q.best; s.qTotal += x.q.total; s.qTaken++; }
    }
    s.pct = Math.round(100 * s.frac);
    return s;
  };

  /* ---------- Tiny DOM helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  L7.esc = esc;
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  L7.h = h;
  L7.$ = function (sel, root) { return (root || document).querySelector(sel); };
  L7.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  L7.btn = function (label, cls, onClick) {
    var b = h('button', 'l7-btn' + (cls ? ' ' + cls : ''), label); b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  };
  L7.fb = function (el, kind, html) { el.className = 'l7-fb ' + (kind || ''); el.innerHTML = html || ''; };
  L7.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  L7.bin = function (v, w) { var s = (v >>> 0).toString(2); while (s.length < w) s = '0' + s; return s.slice(-w); };
  L7.fmt = function (x, d) {
    if (!isFinite(x)) return '—';
    var a = Math.abs(x);
    if (a !== 0 && (a < 1e-3 || a >= 1e6)) return x.toExponential(d == null ? 2 : d);
    return (+x.toFixed(d == null ? 3 : d)).toString();
  };
  /* A row of toggle bits; returns {get(), set(v)} */
  L7.bits = function (root, label, width, value, onChange) {
    var wrap = h('div', 'l7-row');
    wrap.appendChild(h('span', 'l7-lab-label', esc(label)));
    var v = value >>> 0, btns = [];
    for (var i = width - 1; i >= 0; i--) (function (i) {
      var b = h('button', 'l7-bit'); b.type = 'button';
      b.setAttribute('aria-label', label + ' bit ' + i);
      b.addEventListener('click', function () { v ^= (1 << i); paint(); onChange && onChange(v); });
      btns.push([i, b]); wrap.appendChild(b);
    })(i);
    function paint() { btns.forEach(function (x) { var on = (v >> x[0]) & 1; x[1].textContent = on; x[1].classList.toggle('is-1', !!on); x[1].setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    paint(); root.appendChild(wrap);
    return { get: function () { return v; }, set: function (x) { v = x >>> 0; paint(); }, el: wrap };
  };
  /* A labelled select; items = [[value,label],...] */
  L7.select = function (root, label, items, value, onChange) {
    var wrap = h('label', 'l7-row');
    wrap.appendChild(h('span', 'l7-lab-label', esc(label)));
    var s = document.createElement('select');
    items.forEach(function (it) { var o = document.createElement('option'); o.value = it[0]; o.textContent = it[1]; s.appendChild(o); });
    s.value = value; s.addEventListener('change', function () { onChange && onChange(s.value); });
    wrap.appendChild(s); root.appendChild(wrap);
    return s;
  };
  /* A labelled slider with live value text */
  L7.slider = function (root, label, min, max, step, value, fmt, onInput) {
    var wrap = h('label', 'l7-row');
    wrap.style.display = 'block';
    var top = h('div', '', '<span class="l7-lab-label">' + esc(label) + '</span> <b class="l7-mono" style="color:var(--l7-sig)"></b>');
    var r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = value;
    r.setAttribute('aria-label', label);
    var out = top.querySelector('b');
    function upd() { out.textContent = fmt ? fmt(+r.value) : r.value; }
    r.addEventListener('input', function () { upd(); onInput && onInput(+r.value); });
    wrap.appendChild(top); wrap.appendChild(r); root.appendChild(wrap); upd();
    return r;
  };

  /* Keyboard: Enter / Space activate role=button elements */
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.tagName !== 'BUTTON') {
      e.preventDefault(); t.click();
    }
  });

  /* =====================================================================
     MODULE PAGE BUILDER
     cfg = { n, title, lead, tags:[], sections:[...], quiz:[...] }
     section = { part:'Learn' } | { id, type, title, intro, ... }
     ===================================================================== */
  var ACT_TYPES = { reveal: 1, drag: 1, widget: 1, steps: 1 };
  var PRAC_TYPES = { calc: 1, mcq: 1, short: 1, scen: 1 };
  var BADGE = {
    concept: ['t-concept', '📘 Concept'], explore: ['t-explore', '🔬 Explore'], anim: ['t-anim', '🎞️ Animation'],
    reveal: ['t-reveal', '👆 Click to reveal'], drag: ['t-drag', '✋ Drag & drop'], calc: ['t-calc', '🧮 Calculation'],
    mcq: ['t-mcq', '✅ Multiple choice'], short: ['t-short', '✍️ Short answer'], scen: ['t-scen', '🧭 Scenario']
  };

  L7.module = function (cfg) {
    var n = cfg.n, root = document.getElementById('l7-root');
    if (!root) return;
    var data = load(), ms = mod(data, n);
    var req = { a: [], p: [] };
    cfg.sections.forEach(function (s) {
      if (!s.id) return;
      if (ACT_TYPES[s.type]) req.a.push(s.id);
      else if (PRAC_TYPES[s.type]) req.p.push(s.id);
    });
    ms.req = req; save(data);

    var page = h('div', 'l7-page');
    page.style.setProperty('--l7-acc', L7.ACC[n - 1]);
    var meta = L7.MODULES[n - 1];
    var C = 2 * Math.PI * 50;
    page.innerHTML =
      '<section class="l7-hero"><div>' +
      '<p class="l7-kicker"><span class="l7-partb">PART B</span>Level 7 · Module ' + n + ' ' + meta.i + '</p>' +
      '<h1><span class="l7-grad">' + esc(cfg.title || meta.t) + '</span></h1><p class="l7-lead">' + cfg.lead + '</p>' +
      '<div class="l7-tags">' + (cfg.tags || []).map(function (t) { return '<span class="l7-tag">' + esc(t) + '</span>'; }).join('') + '</div></div>' +
      '<svg class="l7-ring" viewBox="0 0 128 128" role="img" aria-label="Module progress"><circle class="bg" cx="64" cy="64" r="50"/>' +
      '<circle class="fg" id="l7RingFg" cx="64" cy="64" r="50" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"/>' +
      '<text id="l7RingTxt" x="64" y="68" text-anchor="middle">0%</text><text class="sub" x="64" y="86" text-anchor="middle">MODULE</text></svg></section>' +
      '<div class="l7-stats" aria-live="polite">' +
      '<div class="l7-stat"><span>Activities</span><b id="l7StA">0</b></div>' +
      '<div class="l7-stat"><span>Practice</span><b id="l7StP">0</b></div>' +
      '<div class="l7-stat"><span>Quiz best</span><b id="l7StQ">—</b></div>' +
      '<div class="l7-stat"><span>Status</span><b id="l7StS">In progress</b></div></div>';

    /* ---------- Tabs ---------- */
    var TABS = [
      ['learn', '📘', 'Learn', 'Key ideas, diagrams and animations'],
      ['labs', '🔬', 'Labs', 'Hands-on interactive circuits'],
      ['act', '🧩', 'Activities', 'Reveal cards and drag & drop'],
      ['prac', '✏️', 'Practice', 'Calculations, MCQs, short answers and scenarios'],
      ['quiz', '🏁', 'Quiz', cfg.quiz.length + ' questions · pass mark 70%'],
      ['done', '🎯', 'Complete', 'Your checklist for this module']
    ];
    var TAB_OF = { concept: 'learn', steps: 'learn', widget: 'labs', reveal: 'act', drag: 'act', calc: 'prac', mcq: 'prac', short: 'prac', scen: 'prac' };
    var tabsEl = h('div', 'l7-tabs'), tabsIn = h('div', 'l7-tabs-in');
    tabsIn.setAttribute('role', 'tablist'); tabsIn.setAttribute('aria-label', 'Module sections');
    tabsEl.appendChild(tabsIn); page.appendChild(tabsEl);
    var body = h('div', 'l7-body'); page.appendChild(body);
    var panels = {}, tabBtns = {}, tabTracked = {}, secTab = {}, count = {};
    var used = {};
    cfg.sections.forEach(function (s) { if (!s.part) used[TAB_OF[s.type] || 'learn'] = 1; });
    used.quiz = 1; used.done = 1;
    var order = TABS.filter(function (t) { return used[t[0]]; });
    order.forEach(function (t, k) {
      var b = h('button', 'l7-tab', '<span class="ico" aria-hidden="true">' + t[1] + '</span>' + t[2] + '<span class="cnt"></span>');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.id = 'l7tab-' + t[0]; b.setAttribute('aria-controls', 'l7panel-' + t[0]);
      b.addEventListener('click', function () { showTab(t[0], true); });
      tabsIn.appendChild(b); tabBtns[t[0]] = b; tabTracked[t[0]] = [];
      var p = h('section', 'l7-panel l7-hidden'); p.id = 'l7panel-' + t[0]; p.setAttribute('data-tab', t[0]);
      p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', b.id);
      p.innerHTML = '<div class="l7-panel-head"><span class="l7-panel-ico" aria-hidden="true">' + t[1] + '</span><div><h2>' + t[2] + '</h2><p>' + esc(t[3]) + '</p></div></div>';
      p._list = h('div', ''); p.appendChild(p._list);
      var nx = order[k + 1];
      if (nx) {
        var nb = h('div', 'l7-panel-next');
        nb.appendChild(L7.btn('Next: ' + nx[1] + ' ' + nx[2] + ' →', 'pri', function () { showTab(nx[0], true); }));
        p.appendChild(nb);
      }
      body.appendChild(p); panels[t[0]] = p; count[t[0]] = 0;
    });
    tabsIn.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var keys = order.map(function (t) { return t[0]; }), i = keys.indexOf(cur), j = (i + (e.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length;
      showTab(keys[j], false); tabBtns[keys[j]].focus();
    });
    var cur = null;
    function showTab(key, scroll) {
      if (!panels[key]) key = order[0][0];
      cur = key;
      order.forEach(function (t) {
        var on = t[0] === key;
        panels[t[0]].classList.toggle('l7-hidden', !on);
        tabBtns[t[0]].setAttribute('aria-selected', on ? 'true' : 'false');
        tabBtns[t[0]].tabIndex = on ? 0 : -1;
      });
      try { sessionStorage.setItem('l7tab' + n, key); history.replaceState(null, '', '#tab-' + key); } catch (e) { }
      if (tabsIn.scrollTo) tabsIn.scrollTo({ left: Math.max(0, tabBtns[key].offsetLeft - 30), behavior: 'smooth' });
      if (scroll) {
        var y = tabsEl.getBoundingClientRect().top + window.pageYOffset;
        if (window.pageYOffset > y) window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
    function goTo(id) {
      var t = id === 'quiz' ? 'quiz' : id === 'complete' ? 'done' : secTab[id];
      if (!t) return false;
      showTab(t, false);
      var el = document.getElementById('s-' + id);
      if (el) setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 40);
      return true;
    }
    page.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#s-"]') : null;
      if (a && goTo(a.getAttribute('href').slice(3))) e.preventDefault();
    });

    var api = makeApi(n, data, ms, refresh);

    cfg.sections.forEach(function (s, i) {
      if (s.part) return;
      var id = s.id || ('c' + i), tab = TAB_OF[s.type] || 'learn';
      var sec = h('section', 'l7-sec k-' + (s.type || 'concept')); sec.id = 's-' + id;
      var badgeKey = s.type === 'widget' ? (s.badge || 'explore') : (s.type === 'steps' ? 'anim' : (s.type || 'concept'));
      var b = BADGE[badgeKey] || BADGE.concept;
      var tracked = !!s.id && (ACT_TYPES[s.type] || PRAC_TYPES[s.type]);
      count[tab]++;
      sec.innerHTML = '<div class="l7-sec-head"><div><span class="l7-badge ' + b[0] + '">' + b[1] + '</span><h2><span class="l7-sec-num">' + ('0' + count[tab]).slice(-2) + '</span>' + esc(s.title) + '</h2></div>' +
        (tracked ? '<span class="l7-status" data-st="' + id + '">○ To do</span>' : '') + '</div>' +
        (s.intro ? '<p class="l7-intro">' + s.intro + '</p>' : '');
      var content = h('div', 'l7-sec-body'); sec.appendChild(content);
      panels[tab]._list.appendChild(sec);
      secTab[id] = tab; if (tracked) tabTracked[tab].push(id);
      var done = function () { api.mark(id); };
      try {
        switch (s.type) {
          case 'reveal': renderReveal(content, s, done); break;
          case 'drag': renderDrag(content, s, done); break;
          case 'steps': renderSteps(content, s, done); break;
          case 'widget': s.build(content, { done: done, id: id, isDone: function () { return api.isDone(id); } }); break;
          case 'calc': renderCalc(content, s, done); break;
          case 'mcq': renderMcq(content, s, done); break;
          case 'short': renderShort(content, s, done); break;
          case 'scen': renderScen(content, s, done); break;
          default:
            content.innerHTML = s.html || '';
            foldConcept(sec, content);
        }
      } catch (err) {
        content.innerHTML = '<p class="l7-fb bad">This activity could not load on this browser. Please refresh the page.</p>';
        if (window.console) console.error('Level 7 section', id, err);
      }
    });

    /* Concepts: show the first two blocks, fold the rest behind "Read more" */
    function foldConcept(sec, content) {
      var kids = Array.prototype.slice.call(content.children);
      if (kids.length <= 2) return;
      var more = h('div', 'l7-more');
      kids.slice(2).forEach(function (k) { more.appendChild(k); });
      content.appendChild(more);
      var btn = h('button', 'l7-morebtn', 'Read more ⌄'); btn.type = 'button'; btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        var open = !sec.classList.contains('is-open');
        sec.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? 'Show less ⌃' : 'Read more ⌄';
      });
      content.appendChild(btn);
    }

    /* Quiz */
    var qs = h('section', 'l7-sec k-quiz'); qs.id = 's-quiz';
    qs.innerHTML = '<div class="l7-sec-head"><div><span class="l7-badge t-mcq">🏁 Module quiz</span><h2>Module ' + n + ' Quiz</h2></div><span class="l7-status" data-st="quiz">○ Not passed</span></div>';
    panels.quiz._list.appendChild(qs);
    renderQuiz(qs, cfg.quiz, api);

    /* Completion */
    var cs = h('section', 'l7-sec k-complete'); cs.id = 's-complete';
    cs.innerHTML = '<div class="l7-sec-head"><div><span class="l7-badge t-scen">🎯 Completion</span><h2>Complete Module ' + n + '</h2></div></div>' +
      '<p class="l7-intro">Finish every lab and activity, every practice set, and pass the quiz (70% or more). Then save the module to your Level 7 progress.</p>' +
      '<ul class="l7-checklist" id="l7Check"></ul><div class="l7-row"><button type="button" class="l7-btn pri" id="l7Done" disabled>Mark Module ' + n + ' complete</button>' +
      '<a class="l7-btn ghost" href="level7.html">← Level 7 dashboard</a></div><div class="l7-fb" id="l7DoneFb"></div>';
    panels.done._list.appendChild(cs);

    /* Pager */
    var pg = h('div', 'l7-pager');
    pg.innerHTML = (n > 1 ? '<a href="level7-module' + (n - 1) + '.html"><small>← Previous module</small>' + esc(L7.MODULES[n - 2].t) + '</a>' : '<a href="level7.html"><small>← Back</small>Level 7 dashboard</a>') +
      (n < 10 ? '<a class="next" href="level7-module' + (n + 1) + '.html"><small>Next module →</small>' + esc(L7.MODULES[n].t) + '</a>' : '<a class="next" href="level7.html"><small>Finish →</small>Level 7 dashboard &amp; certificate</a>');
    page.appendChild(pg);

    root.innerHTML = ''; root.appendChild(page);
    document.title = 'Level 7 · Module ' + n + ': ' + (cfg.title || meta.t) + ' | Digital Design Explorer';

    var doneBtn = document.getElementById('l7Done');
    doneBtn.addEventListener('click', function () {
      if (!allMet()) return;
      lsSet('level7_module' + n + '_completed', 'true');
      var d = load(); mod(d, n).done = today(); save(d);
      var p; try { if (typeof window.markModuleComplete === 'function') p = window.markModuleComplete(7, n); } catch (e) { p = null; }
      Promise.resolve(p).then(function () { refresh(); }, function () { refresh(); });
    });

    function allMet() {
      var s = L7.summary(n);
      return s.aD === s.aT && s.pD === s.pT && s.qPass;
    }

    function refresh() {
      var s = L7.summary(n), d = load(), m = d.m[n] || { a: {} };
      L7.$$('[data-st]', page).forEach(function (el) {
        var id = el.getAttribute('data-st');
        if (id === 'quiz') {
          el.classList.toggle('is-done', s.qPass);
          el.textContent = s.qPass ? '✓ Passed' : (s.q ? '↻ Retake (best ' + s.q.best + '/' + s.q.total + ')' : '○ Not passed');
        } else {
          var ok = !!m.a[id]; el.classList.toggle('is-done', ok); el.textContent = ok ? '✓ Done' : '○ To do';
        }
      });
      order.forEach(function (t) {
        var k = t[0], btn = tabBtns[k], c = btn.querySelector('.cnt'), ok;
        if (k === 'quiz') { ok = s.qPass; c.textContent = ok ? '✓' : (s.q ? s.q.best + '/' + s.q.total : ''); }
        else if (k === 'done') { ok = s.complete; c.textContent = ok ? '✓' : ''; }
        else if (tabTracked[k].length) {
          var dn = tabTracked[k].filter(function (id) { return m.a[id]; }).length;
          ok = dn === tabTracked[k].length; c.textContent = ok ? '✓' : dn + '/' + tabTracked[k].length;
        } else { ok = false; c.textContent = ''; }
        btn.classList.toggle('is-done', !!ok);
        c.style.display = c.textContent ? '' : 'none';
      });
      document.getElementById('l7StA').innerHTML = s.aD + '<small> / ' + s.aT + '</small>';
      document.getElementById('l7StP').innerHTML = s.pD + '<small> / ' + s.pT + '</small>';
      document.getElementById('l7StQ').innerHTML = s.q ? s.q.best + '<small> / ' + s.q.total + '</small>' : '—';
      document.getElementById('l7StS').textContent = s.complete ? '✓ Completed' : (allMet() ? 'Ready to save' : 'In progress');
      var pct = Math.round(100 * s.frac);
      document.getElementById('l7RingFg').setAttribute('stroke-dashoffset', (C * (1 - s.frac)).toFixed(1));
      document.getElementById('l7RingTxt').textContent = pct + '%';
      var list = document.getElementById('l7Check');
      var items = [
        [s.aD === s.aT, 'Labs & activities: ' + s.aD + ' of ' + s.aT + ' done', firstTodo(req.a, m)],
        [s.pD === s.pT, 'Practice sets: ' + s.pD + ' of ' + s.pT + ' done', firstTodo(req.p, m)],
        [s.qPass, 'Module quiz passed (≥ 70%)' + (s.q ? ' – best ' + s.q.best + '/' + s.q.total : ''), s.qPass ? null : 'quiz']
      ];
      list.innerHTML = items.map(function (x) {
        return '<li class="' + (x[0] ? 'is-met' : '') + '">' + esc(x[1]) + (x[2] ? '<a href="#s-' + x[2] + '">Go →</a>' : '') + '</li>';
      }).join('');
      if (s.complete) {
        doneBtn.disabled = true; doneBtn.textContent = '✓ Module ' + n + ' completed';
        L7.fb(document.getElementById('l7DoneFb'), 'ok', '🎉 Saved to your Level 7 progress' + (n < 10 ? '. Continue with Module ' + (n + 1) + '.' : '. Open the Level 7 dashboard for your certificate.'));
      } else {
        doneBtn.disabled = !allMet();
        L7.fb(document.getElementById('l7DoneFb'), allMet() ? 'info' : '', allMet() ? 'All requirements met – press the button to save this module.' : '');
      }
    }
    function firstTodo(ids, m) { for (var i = 0; i < ids.length; i++) if (!m.a[ids[i]]) return ids[i]; return null; }
    api.refresh = refresh;
    refresh();

    /* Initial tab: #tab-x, #s-section, last visited, or Learn */
    var hsh = location.hash.slice(1), start = null;
    try { start = sessionStorage.getItem('l7tab' + n); } catch (e) { }
    if (/^tab-/.test(hsh)) showTab(hsh.slice(4), false);
    else if (/^s-/.test(hsh) && goTo(hsh.slice(2))) { /* opened */ }
    else showTab(start || order[0][0], false);
  };

  function makeApi(n, data, ms, refreshRef) {
    var api = {
      mark: function (id) {
        var d = load(), m = mod(d, n);
        if (m.a[id]) return;
        m.a[id] = 1; save(d);
        if (api.refresh) api.refresh();
      },
      isDone: function (id) { var m = load().m[n]; return !!(m && m.a && m.a[id]); },
      saveQuiz: function (score, total) {
        var d = load(), m = mod(d, n), q = m.q || { best: 0, tries: 0 };
        q.last = score; q.total = total; q.tries = (q.tries || 0) + 1; q.best = Math.max(q.best || 0, score); q.date = today();
        m.q = q; save(d);
        if (api.refresh) api.refresh();
      }
    };
    return api;
  }

  /* ---------- Click to reveal ---------- */
  function renderReveal(root, s, done) {
    var g = h('div', 'l7-reveal'), seen = {};
    s.items.forEach(function (it, i) {
      var b = h('button', 'l7-rv', '<span class="l7-rv-q">' + it.q + '</span><span class="l7-rv-a">' + it.a + '</span>');
      b.type = 'button'; b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) { seen[i] = 1; if (Object.keys(seen).length === s.items.length) done(); }
      });
      g.appendChild(b);
    });
    root.appendChild(g);
    root.appendChild(h('p', 'l7-hint', 'Open every card to complete this activity.'));
  }

  /* ---------- Drag & drop (mouse, touch and keyboard) ---------- */
  function renderDrag(root, s, done) {
    root.appendChild(h('p', 'l7-hint', 'Drag each card into the right box – or tap a card, then tap a box.'));
    var pool = h('div', 'l7-dd-pool'); pool.setAttribute('aria-label', 'Cards to place');
    var bins = h('div', 'l7-dd-bins'), binEls = [];
    s.bins.forEach(function (name, bi) {
      var b = h('div', 'l7-dd-bin', '<h4>' + esc(name) + '</h4><div class="l7-dd-list"></div>');
      b.setAttribute('data-bin', bi); b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'Box: ' + name);
      bins.appendChild(b); binEls.push(b);
    });
    var sel = null, chips = [];
    L7.shuffle(s.items.map(function (it, i) { return [it, i]; })).forEach(function (p) {
      var c = h('button', 'l7-chip', esc(p[0][0])); c.type = 'button';
      c.setAttribute('data-ans', p[0][1]); chips.push(c); pool.appendChild(c);
      wireChip(c);
    });
    root.appendChild(pool); root.appendChild(bins);
    var row = h('div', 'l7-row'), fb = h('div', 'l7-fb');
    row.appendChild(L7.btn('Check', 'pri', check));
    row.appendChild(L7.btn('Reset', 'ghost', function () { chips.forEach(function (c) { if (!c.classList.contains('is-ok')) pool.appendChild(c); }); L7.fb(fb, '', ''); }));
    root.appendChild(row); root.appendChild(fb);

    function place(c, bin) {
      if (c.classList.contains('is-ok')) return;
      (bin ? bin.querySelector('.l7-dd-list') : pool).appendChild(c);
      c.classList.remove('is-sel'); sel = null; mark();
    }
    function mark() { binEls.forEach(function (b) { b.classList.toggle('is-target', !!sel); }); }
    binEls.forEach(function (b) {
      b.addEventListener('click', function () { if (sel) place(sel, b); });
    });
    pool.addEventListener('click', function (e) { if (sel && e.target === pool) place(sel, null); });

    function wireChip(c) {
      var st = null, ghost = null, suppress = false;
      c.addEventListener('pointerdown', function (e) {
        if (c.classList.contains('is-ok') || (e.pointerType === 'mouse' && e.button !== 0)) return;
        st = { x: e.clientX, y: e.clientY, id: e.pointerId, moving: false };
        document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', cancel);
      });
      function over(x, y) {
        var el = document.elementFromPoint(x, y);
        return el && el.closest ? (el.closest('.l7-dd-bin') || (el.closest('.l7-dd-pool') ? pool : null)) : null;
      }
      function move(e) {
        if (!st || e.pointerId !== st.id) return;
        if (!st.moving && Math.abs(e.clientX - st.x) + Math.abs(e.clientY - st.y) > 8) {
          st.moving = true; ghost = c.cloneNode(true); ghost.classList.add('l7-ghost'); document.body.appendChild(ghost);
          c.style.opacity = '.35';
        }
        if (st.moving) {
          e.preventDefault();
          ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
          var t = over(e.clientX, e.clientY);
          binEls.forEach(function (b) { b.classList.toggle('is-over', b === t); });
        }
      }
      function finish() {
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancel);
        if (ghost) { ghost.parentNode && ghost.parentNode.removeChild(ghost); ghost = null; }
        c.style.opacity = ''; binEls.forEach(function (b) { b.classList.remove('is-over'); });
      }
      function up(e) {
        if (!st || e.pointerId !== st.id) return;
        var moving = st.moving, t = moving ? over(e.clientX, e.clientY) : null;
        finish(); st = null;
        if (moving) { suppress = true; setTimeout(function () { suppress = false; }, 350); if (t) place(c, t === pool ? null : t); }
      }
      function cancel() { finish(); st = null; }
      c.addEventListener('click', function (e) {
        e.stopPropagation();
        if (suppress || c.classList.contains('is-ok')) return;
        if (sel === c) { c.classList.remove('is-sel'); sel = null; }
        else { if (sel) sel.classList.remove('is-sel'); sel = c; c.classList.add('is-sel'); }
        mark();
      });
    }
    function check() {
      var right = 0, wrong = 0, left = 0;
      chips.forEach(function (c) {
        var bin = c.closest('.l7-dd-bin');
        if (!bin) { left++; return; }
        if (+bin.getAttribute('data-bin') === +c.getAttribute('data-ans')) { c.classList.add('is-ok'); c.disabled = false; right++; }
        else {
          wrong++; c.classList.add('is-bad'); pool.appendChild(c);
          (function (c) { setTimeout(function () { c.classList.remove('is-bad'); }, 400); })(c);
        }
      });
      var total = chips.length, ok = chips.filter(function (c) { return c.classList.contains('is-ok'); }).length;
      if (ok === total) { L7.fb(fb, 'ok', '✓ All ' + total + ' cards are in the right place.' + (s.explain ? ' ' + s.explain : '')); done(); }
      else L7.fb(fb, wrong ? 'bad' : 'info', ok + ' of ' + total + ' correct.' + (wrong ? ' ' + wrong + ' card' + (wrong > 1 ? 's were' : ' was') + ' sent back – try again.' : '') + (left ? ' ' + left + ' still to place.' : ''));
    }
  }

  /* ---------- Step-by-step animation ---------- */
  function renderSteps(root, s, done) {
    var stage = h('div', 'l7-steps-stage'), text = h('p', 'l7-steps-text');
    var row = h('div', 'l7-row'), dots = h('div', 'l7-dots'), i = 0, timer = null, seen = {};
    var prev = L7.btn('◀ Prev', 'ghost', function () { stop(); go(i - 1); });
    var play = L7.btn('▶ Play', '', function () { if (timer) stop(); else { if (i === s.frames.length - 1) go(0); timer = setInterval(function () { if (i >= s.frames.length - 1) stop(); else go(i + 1); }, s.delay || 1800); play.textContent = '⏸ Pause'; } });
    var next = L7.btn('Next ▶', 'pri', function () { stop(); go(i + 1); });
    s.frames.forEach(function (f, k) { var d = h('button', '', String(k + 1)); d.type = 'button'; d.setAttribute('aria-label', 'Step ' + (k + 1)); d.addEventListener('click', function () { stop(); go(k); }); dots.appendChild(d); });
    row.appendChild(prev); row.appendChild(play); row.appendChild(next);
    root.appendChild(stage); root.appendChild(text); root.appendChild(row); root.appendChild(dots);
    function stop() { if (timer) { clearInterval(timer); timer = null; } play.textContent = '▶ Play'; }
    function go(k) {
      i = Math.max(0, Math.min(s.frames.length - 1, k));
      var f = s.frames[i];
      stage.innerHTML = typeof f.svg === 'function' ? f.svg() : f.svg;
      text.innerHTML = '<b class="l7-step-n">' + (i + 1) + '/' + s.frames.length + '</b>' + f.t;
      seen[i] = 1;
      L7.$$('button', dots).forEach(function (d, k2) { d.classList.toggle('is-on', k2 === i); d.classList.toggle('is-seen', !!seen[k2]); });
      prev.disabled = i === 0; next.disabled = i === s.frames.length - 1;
      if (Object.keys(seen).length === s.frames.length) done();
    }
    go(0);
  }

  /* ---------- Calculation challenges ---------- */
  function parseNum(v) {
    v = String(v).trim().replace(/,/g, '').replace(/\s+/g, '').replace(/[×x]10\^?/i, 'e').replace(/−/g, '-');
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(v)) return NaN;
    return parseFloat(v);
  }
  function renderCalc(root, s, done) {
    var ok = {};
    s.items.forEach(function (it, i) {
      var q = h('div', 'l7-q');
      q.innerHTML = '<p class="l7-q-t"><span class="l7-q-n">C' + (i + 1) + '</span>' + it.q + '</p>';
      var row = h('div', 'l7-calc-row');
      var inp = document.createElement('input'); inp.className = 'l7-input'; inp.type = 'text'; inp.setAttribute('inputmode', 'decimal');
      inp.setAttribute('autocomplete', 'off'); inp.setAttribute('aria-label', 'Answer ' + (i + 1));
      row.appendChild(inp);
      if (it.u) row.appendChild(h('span', 'l7-unit', it.u));
      var tries = 0, fb = h('div', 'l7-fb'), sol = h('div', 'l7-sol l7-hidden', '<b>Worked solution:</b> ' + it.s);
      var chk = L7.btn('Check', 'pri', function () {
        var x = parseNum(inp.value);
        if (isNaN(x)) { L7.fb(fb, 'bad', 'Enter a number (for example 2.5 or 1.2e-3).'); return; }
        var tol = it.tol == null ? 0.02 : it.tol;
        var good = Math.abs(x - it.a) <= Math.max(Math.abs(it.a) * tol, it.abs || 1e-12);
        if (good) {
          L7.fb(fb, 'ok', '✓ Correct' + (it.u ? ': ' + L7.fmt(it.a, 4) + ' ' + it.u : '') + '.'); sol.classList.remove('l7-hidden');
          inp.disabled = true; chk.disabled = true; ok[i] = 1; if (Object.keys(ok).length === s.items.length) done();
        } else {
          tries++;
          L7.fb(fb, 'bad', '✗ Not yet.' + (it.h && tries >= 1 ? ' Hint: ' + it.h : '') + (tries >= 2 ? ' You can open the worked solution.' : ''));
          if (tries >= 2) showBtn.classList.remove('l7-hidden');
        }
      });
      var showBtn = L7.btn('Show solution', 'ghost l7-hidden', function () { sol.classList.remove('l7-hidden'); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') chk.click(); });
      row.appendChild(chk); row.appendChild(showBtn);
      q.appendChild(row); q.appendChild(fb); q.appendChild(sol); root.appendChild(q);
    });
  }

  /* ---------- Practice MCQ (retry until right) ---------- */
  function renderMcq(root, s, done) {
    var ok = {};
    s.items.forEach(function (it, i) {
      var q = h('div', 'l7-q'); q.innerHTML = '<p class="l7-q-t"><span class="l7-q-n">P' + (i + 1) + '</span>' + it.q + '</p>';
      var opts = h('div', 'l7-opts'), fb = h('div', 'l7-fb');
      it.o.forEach(function (o, k) {
        var b = h('button', 'l7-opt', o); b.type = 'button';
        b.addEventListener('click', function () {
          if (k === it.a) {
            b.classList.add('is-right'); L7.$$('.l7-opt', opts).forEach(function (x) { x.disabled = true; });
            L7.fb(fb, 'ok', '✓ ' + (it.w || 'Correct.')); ok[i] = 1; if (Object.keys(ok).length === s.items.length) done();
          } else { b.classList.add('is-wrong'); b.disabled = true; L7.fb(fb, 'bad', '✗ Not quite – think again and pick another option.'); }
        });
        opts.appendChild(b);
      });
      q.appendChild(opts); q.appendChild(fb); root.appendChild(q);
    });
  }

  /* ---------- Short answer (self-check against key ideas) ---------- */
  function renderShort(root, s, done) {
    var ok = {};
    s.items.forEach(function (it, i) {
      var q = h('div', 'l7-q'); q.innerHTML = '<p class="l7-q-t"><span class="l7-q-n">S' + (i + 1) + '</span>' + it.q + '</p>';
      var ta = document.createElement('textarea'); ta.setAttribute('aria-label', 'Your answer ' + (i + 1)); ta.placeholder = 'Write your answer in 2–4 sentences…';
      var fb = h('div', 'l7-fb'), model = h('div', 'l7-sol l7-hidden', '<b>Model answer:</b> ' + it.m);
      var chk = L7.btn('Check my answer', 'pri', function () {
        var txt = ta.value.toLowerCase();
        if (txt.trim().length < 20) { L7.fb(fb, 'bad', 'Write a little more (at least one full sentence) before checking.'); return; }
        var hit = it.k.filter(function (k) { return k.split('|').some(function (w) { return txt.indexOf(w.toLowerCase()) >= 0; }); });
        var miss = it.k.filter(function (k) { return hit.indexOf(k) < 0; }).map(function (k) { return k.split('|')[0]; });
        L7.fb(fb, hit.length === it.k.length ? 'ok' : 'info', 'Your answer covers <b>' + hit.length + ' of ' + it.k.length + '</b> key ideas.' +
          (miss.length ? ' Consider also mentioning: <i>' + miss.map(esc).join(', ') + '</i>.' : ' Excellent coverage!') + ' Compare with the model answer below.');
        model.classList.remove('l7-hidden'); ok[i] = 1; if (Object.keys(ok).length === s.items.length) done();
      });
      var row = h('div', 'l7-row'); row.appendChild(chk);
      q.appendChild(ta); q.appendChild(row); q.appendChild(fb); q.appendChild(model); root.appendChild(q);
    });
  }

  /* ---------- Scenario questions ---------- */
  function renderScen(root, s, done) {
    var ok = {};
    s.items.forEach(function (it, i) {
      var q = h('div', 'l7-q');
      q.innerHTML = '<div class="l7-scen"><b>Scenario ' + (i + 1) + ':</b> ' + it.s + '</div><p class="l7-q-t">' + it.q + '</p>';
      var opts = h('div', 'l7-opts'), fb = h('div', 'l7-fb');
      it.o.forEach(function (o) {
        var b = h('button', 'l7-opt', o.t); b.type = 'button';
        b.addEventListener('click', function () {
          if (o.ok) {
            b.classList.add('is-right'); L7.$$('.l7-opt', opts).forEach(function (x) { x.disabled = true; });
            L7.fb(fb, 'ok', '✓ ' + o.w); ok[i] = 1; if (Object.keys(ok).length === s.items.length) done();
          } else { b.classList.add('is-wrong'); b.disabled = true; L7.fb(fb, 'bad', '✗ ' + o.w); }
        });
        opts.appendChild(b);
      });
      q.appendChild(opts); q.appendChild(fb); root.appendChild(q);
    });
  }

  /* ---------- Module quiz (graded, retake allowed) ---------- */
  function renderQuiz(sec, qs, api) {
    var box = h('div', 'l7-quiz');
    sec.appendChild(h('p', 'l7-intro', qs.length + ' questions · pass mark 70% (' + Math.ceil(qs.length * PASS) + ' correct) · answer every question, then submit. You may retake the quiz; your best score is kept.'));
    sec.appendChild(box);
    var picks;
    function build() {
      picks = {};
      box.classList.remove('is-graded'); box.innerHTML = '';
      var head = h('div', 'l7-quiz-head', '<span class="l7-quiz-meter">Answered <b id="l7QA">0</b> / ' + qs.length + '</span>');
      box.appendChild(head);
      qs.forEach(function (it, i) {
        var q = h('div', 'l7-q'); q.innerHTML = '<p class="l7-q-t"><span class="l7-q-n">Q' + (i + 1) + '</span>' + it.q + '</p>';
        var opts = h('div', 'l7-opts');
        it.o.forEach(function (o, k) {
          var b = h('button', 'l7-opt', o); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
          b.addEventListener('click', function () {
            if (box.classList.contains('is-graded')) return;
            L7.$$('.l7-opt', opts).forEach(function (x) { x.classList.remove('is-picked'); x.setAttribute('aria-pressed', 'false'); });
            b.classList.add('is-picked'); b.setAttribute('aria-pressed', 'true'); picks[i] = k;
            var c = Object.keys(picks).length; document.getElementById('l7QA').textContent = c; submit.disabled = c < qs.length;
          });
          opts.appendChild(b);
        });
        q.appendChild(opts); q.appendChild(h('div', 'l7-why', '<b>Explanation:</b> ' + (it.w || '')));
        box.appendChild(q);
      });
      var result = h('div', ''); result.id = 'l7QRes';
      var row = h('div', 'l7-row');
      var submit = L7.btn('Submit quiz', 'pri', grade); submit.disabled = true;
      row.appendChild(submit); box.appendChild(row); box.appendChild(result);
      function grade() {
        var score = 0;
        L7.$$('.l7-q', box).forEach(function (q, i) {
          var right = qs[i].a, bs = L7.$$('.l7-opt', q);
          bs.forEach(function (b, k) { b.disabled = true; if (k === right) b.classList.add('is-right'); else if (k === picks[i]) b.classList.add('is-wrong'); });
          if (picks[i] === right) score++;
        });
        box.classList.add('is-graded');
        var pass = score / qs.length >= PASS;
        api.saveQuiz(score, qs.length);
        result.innerHTML = '<div class="l7-score ' + (pass ? 'pass' : 'fail') + '"><span class="big">' + score + ' / ' + qs.length + '</span>' +
          (pass ? '🎉 Passed! Read the explanations, then open the 🎯 Complete tab.' : 'Below 70%. Read the explanations and try again.') + '</div>';
        submit.remove();
        var again = L7.btn('↻ Retake quiz', '', function () { build(); sec.scrollIntoView({ behavior: 'smooth' }); });
        row.appendChild(again);
        result.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    build();
  }

  /* =====================================================================
     LEVEL 7 HUB (level7.html)
     ===================================================================== */
  L7.hub = function (root) {
    var s = L7.levelSummary(), C = 2 * Math.PI * 50;
    var html = '<div class="l7-page">' +
      '<section class="l7-hero"><div><p class="l7-kicker"><span class="l7-partb">PART B</span>Advanced VLSI · Level 7</p>' +
      '<h1><span class="l7-grad">Digital VLSI Design</span></h1><p class="l7-lead">Move from logic to silicon. Ten interactive modules on transistor-level logic styles, arithmetic and datapath architectures, memories, wires, standard cells, IP reuse, reliability and the technologies shaping the next generation of chips.</p>' +
      '<div class="l7-tags"><span class="l7-tag">10 modules</span><span class="l7-tag">' + 10 * 10 + ' quiz questions</span><span class="l7-tag">interactive labs</span><span class="l7-tag">mini project</span></div></div>' +
      '<svg class="l7-ring" viewBox="0 0 128 128" role="img" aria-label="Level 7 progress ' + s.pct + ' percent"><circle class="bg" cx="64" cy="64" r="50"/>' +
      '<circle class="fg" cx="64" cy="64" r="50" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - s.frac)).toFixed(1) + '"/>' +
      '<text x="64" y="68" text-anchor="middle">' + s.pct + '%</text><text class="sub" x="64" y="86" text-anchor="middle">LEVEL 7</text></svg></section>' +
      '<div class="l7-stats">' +
      '<div class="l7-stat"><span>Modules completed</span><b>' + s.mods + '<small> / 10</small></b></div>' +
      '<div class="l7-stat"><span>Activities</span><b>' + s.aD + '<small> / ' + (s.aT || '—') + '</small></b></div>' +
      '<div class="l7-stat"><span>Practice sets</span><b>' + s.pD + '<small> / ' + (s.pT || '—') + '</small></b></div>' +
      '<div class="l7-stat"><span>Quiz score (best)</span><b>' + s.qBest + '<small> / ' + (s.qTotal || 100) + '</small></b></div></div>' +
      '<div class="l7-part"><span>Modules</span></div><div class="l7-hub-grid">';
    L7.MODULES.forEach(function (m, i) {
      var n = i + 1, x = L7.summary(n);
      html += '<a class="l7-mod' + (x.complete ? ' is-done' : '') + '" style="--acc:' + L7.ACC[i] + '" href="level7-module' + n + '.html">' +
        '<div class="l7-mod-top"><span class="l7-mod-num">Module ' + n + '</span><span class="l7-mod-ico" aria-hidden="true">' + m.i + '</span></div>' +
        '<h3>' + esc(m.t) + '</h3><p>' + esc(m.d) + '</p>' +
        '<div class="l7-bar" aria-hidden="true"><span style="width:' + Math.round(100 * x.frac) + '%"></span></div>' +
        '<div class="l7-mod-meta">' +
        (x.started ? '<span>Activities ' + x.aD + '/' + x.aT + '</span><span>Practice ' + x.pD + '/' + x.pT + '</span>' : '<span>Not started</span>') +
        '<span>Quiz ' + (x.q ? x.q.best + '/' + x.q.total + (x.qPass ? ' ✓' : '') : '—') + '</span>' +
        '<span>' + (x.complete ? '✓ Completed' : Math.round(100 * x.frac) + '%') + '</span></div></a>';
    });
    html += '</div>';
    var all = s.mods === 10;
    html += '<div class="l7-cert-card"><div><h2>🏆 Level 7 Certificate</h2><p>' + (all ? 'All ten modules are complete. Your certificate is ready.' : 'Complete all ten modules to unlock your certificate (' + s.mods + ' of 10 done).') + '</p></div>' +
      '<a class="l7-btn ' + (all ? 'cu' : 'ghost') + '" href="level7-certificate.html">' + (all ? '🏆 Open certificate' : '🔒 View requirements') + '</a></div>';
    html += '<div class="l7-part"><span>Part B roadmap</span></div><div class="l7-roadmap">' +
      [[8, 'VLSI Timing & Power'], [9, 'RTL Design & Synthesis'], [10, 'Physical Design'], [11, 'Advanced Verification'], [12, 'DFT & Advanced Testing'], [13, 'Processor / VLSI Architecture'], [14, 'AI/ML for VLSI']]
        .map(function (r) { return '<div><b>LEVEL ' + r[0] + ' · 🔒 COMING SOON</b>' + esc(r[1]) + '</div>'; }).join('') + '</div></div>';
    root.innerHTML = html;
  };

  /* =====================================================================
     SVG helpers used by module scripts
     ===================================================================== */
  L7.svg = function (w, hgt, inner, label) {
    return '<svg viewBox="0 0 ' + w + ' ' + hgt + '" style="--w:' + w + '" xmlns="http://www.w3.org/2000/svg" role="img"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '>' + inner + '</svg>';
  };
  L7.t = function (x, y, s, cls, anchor) { return '<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : '') + ' text-anchor="' + (anchor || 'middle') + '">' + s + '</text>'; };
  L7.line = function (x1, y1, x2, y2, cls) { return '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" class="' + (cls || 'w') + '"/>'; };
  L7.path = function (d, cls) { return '<path d="' + d + '" class="' + (cls || 'w') + '"/>'; };
  L7.rect = function (x, y, w, hh, cls, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="' + (rx == null ? 6 : rx) + '" class="' + (cls || 'box') + '"/>'; };
  L7.dot = function (x, y, r, cls) { return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 3.5) + '" class="' + (cls || 'dot') + '"/>'; };
})();
