/* =========================================================
   Digital Design Explorer – Level 6 shared helpers
   Used by every level6-module*.html page.
   Exposes one global: window.L6
   ========================================================= */
(function () {
  'use strict';

  var L6 = (window.L6 = window.L6 || {});

  /* ---------- Safe localStorage ---------- */
  L6.store = {
    get: function (k, fallback) {
      try { var v = localStorage.getItem(k); return v === null ? fallback : v; } catch (e) { return fallback; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ }
    }
  };

  /* ---------- SystemVerilog syntax highlighter ---------- */
  var KW = ('module endmodule input output inout typedef enum struct union packed signed unsigned ' +
    'parameter localparam const package endpackage import always always_ff always_comb always_latch ' +
    'assign if else begin end initial posedge negedge or and case endcase unique priority for foreach ' +
    'while repeat class endclass function endfunction task endtask return interface endinterface modport ' +
    'automatic static rand randc constraint assert property new extends virtual').split(' ');
  var TY = 'logic bit byte shortint int longint integer time real reg wire string void tri'.split(' ');
  var KWS = {}, TYS = {};
  KW.forEach(function (k) { KWS[k] = 1; });
  TY.forEach(function (k) { TYS[k] = 1; });

  var TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*")|(\d*'[sS]?[bBoOdDhH][0-9a-fA-FxXzZ_?]+|'[01xXzZ](?![\w])|\b\d+(?:\.\d+)?\b)|(\$[A-Za-z_]\w*)|([A-Za-z_]\w*)/g;

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  L6.esc = esc;

  L6.highlight = function (text) {
    var out = '', last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(text)) !== null) {
      out += esc(text.slice(last, m.index));
      var t = esc(m[0]);
      if (m[1]) out += '<span class="tk-com">' + t + '</span>';
      else if (m[2]) out += '<span class="tk-str">' + t + '</span>';
      else if (m[3]) out += '<span class="tk-num">' + t + '</span>';
      else if (m[4]) out += '<span class="tk-sys">' + t + '</span>';
      else if (KWS[m[5]]) out += '<span class="tk-kw">' + t + '</span>';
      else if (TYS[m[5]]) out += '<span class="tk-ty">' + t + '</span>';
      else out += t;
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  };

  /* Highlight every <pre class="l6-code"> on the page */
  L6.highlightAll = function (root) {
    (root || document).querySelectorAll('pre.l6-code:not([data-hl])').forEach(function (pre) {
      var code = pre.querySelector('code') || pre;
      code.innerHTML = L6.highlight(code.textContent.replace(/^\n/, '').replace(/\s+$/, ''));
      pre.setAttribute('data-hl', '1');
    });
  };

  /* Render code as numbered lines; returns array of line elements */
  L6.renderLines = function (container, lines, opts) {
    opts = opts || {};
    container.innerHTML = '';
    container.classList.add('l6-codebox');
    return lines.map(function (txt, i) {
      var row = document.createElement('div');
      row.className = 'l6-line';
      row.dataset.line = i + 1;
      row.innerHTML = '<span class="l6-ln">' + (i + 1) + '</span><span>' + (L6.highlight(txt) || ' ') + '</span>';
      if (opts.clickable) {
        row.classList.add('is-click');
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
      }
      container.appendChild(row);
      return row;
    });
  };

  /* Make Enter/Space act like click on role=button elements */
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.tagName !== 'BUTTON') {
      e.preventDefault();
      t.click();
    }
  });

  /* ---------- Activity progress (per module) ---------- */
  var prog = { key: null, ids: [], done: {} };

  L6.initProgress = function (storageKey, activityIds) {
    prog.key = storageKey;
    prog.ids = activityIds;
    try { prog.done = JSON.parse(L6.store.get(storageKey, '{}')) || {}; } catch (e) { prog.done = {}; }
    renderProgress();
  };

  L6.mark = function (id) {
    if (!prog.key || prog.done[id]) return;
    prog.done[id] = true;
    L6.store.set(prog.key, JSON.stringify(prog.done));
    renderProgress();
  };

  L6.isDone = function (id) { return !!prog.done[id]; };
  L6.doneCount = function () { return prog.ids.filter(function (i) { return prog.done[i]; }).length; };

  function renderProgress() {
    var n = L6.doneCount(), total = prog.ids.length;
    var fill = document.getElementById('l6ProgressFill');
    var text = document.getElementById('l6ProgressText');
    if (fill) fill.style.width = (total ? (100 * n / total) : 0) + '%';
    if (text) text.textContent = n + ' of ' + total + ' activities';
    document.querySelectorAll('[data-activity]').forEach(function (el) {
      var done = !!prog.done[el.getAttribute('data-activity')];
      el.classList.toggle('is-done', done);
      if (el.classList.contains('l6-tag')) el.textContent = done ? 'Done' : 'Activity';
    });
    document.querySelectorAll('.l6-toc a[data-acts]').forEach(function (a) {
      var ids = a.getAttribute('data-acts').split(',');
      a.classList.toggle('is-done', ids.every(function (i) { return prog.done[i]; }));
    });
    document.dispatchEvent(new CustomEvent('l6:progress'));
  }

  /* ---------- Table of contents: highlight current section ---------- */
  L6.initToc = function () {
    var links = Array.prototype.slice.call(document.querySelectorAll('.l6-toc a'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.classList.remove('is-active'); });
          var a = map[en.target.id];
          if (a) a.classList.add('is-active');
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  };

  /* ---------- Feedback helper ---------- */
  L6.feedback = function (el, kind, html) {
    el.className = 'l6-fb is-show is-' + kind;
    el.innerHTML = html;
  };

  /* ---------- MCQ quiz engine ---------- */
  /* questions: [{q, opts:[...], a: index, why}] */
  L6.quiz = function (root, questions, opts) {
    opts = opts || {};
    var answered, score;

    function build() {
      answered = 0; score = 0;
      root.innerHTML = '';
      questions.forEach(function (item, qi) {
        var box = document.createElement('div');
        box.className = 'l6-q';
        box.innerHTML = '<p class="l6-q-text">' + (qi + 1) + '. ' + item.q + '</p><div class="l6-q-opts"></div><div class="l6-fb"></div>';
        var optsEl = box.querySelector('.l6-q-opts');
        var fb = box.querySelector('.l6-fb');
        item.opts.forEach(function (o, oi) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'l6-btn l6-q-opt';
          b.innerHTML = o;
          b.addEventListener('click', function () {
            var buttons = optsEl.querySelectorAll('button');
            buttons.forEach(function (x) { x.disabled = true; });
            buttons[item.a].classList.add('is-right');
            answered++;
            if (oi === item.a) {
              score++;
              L6.feedback(fb, 'ok', '<span class="l6-pass">Correct.</span> ' + item.why);
            } else {
              b.classList.add('is-wrong');
              L6.feedback(fb, 'bad', '<span class="l6-fail">Not quite.</span> ' + item.why);
            }
            if (answered === questions.length) finish();
          });
          optsEl.appendChild(b);
        });
        root.appendChild(box);
      });
      var foot = document.createElement('div');
      foot.innerHTML = '<p class="l6-score" aria-live="polite"></p>';
      root.appendChild(foot);
    }

    function finish() {
      var pct = Math.round(100 * score / questions.length);
      var pass = score >= (opts.passMark || Math.ceil(questions.length * 0.6));
      var foot = root.querySelector('.l6-score');
      foot.innerHTML = 'Score: ' + score + ' / ' + questions.length + ' (' + pct + '%) ' +
        (pass ? '<span class="l6-pass">PASS ✓</span>' : '<span class="l6-fail">Below pass mark ✗</span>');
      var retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'l6-btn';
      retry.textContent = 'Retake quiz';
      retry.style.marginLeft = '12px';
      retry.addEventListener('click', build);
      foot.appendChild(retry);
      if (opts.onFinish) opts.onFinish(score, questions.length, pass);
    }

    build();
  };

  /* ---------- Module completion ----------
     cfg: { level, module, completedKey, button, status, reqs:[{el, test()}] }
     To connect to Supabase, define window.markModuleComplete(level, module)
     in your existing progress script (returning a Promise is fine). */
  L6.initCompletion = function (cfg) {
    function met() { return cfg.reqs.every(function (r) { return r.test(); }); }
    function refresh() {
      cfg.reqs.forEach(function (r) { r.el.classList.toggle('is-met', !!r.test()); });
      var already = L6.store.get(cfg.completedKey, '') === 'true';
      cfg.button.disabled = already || !met();
      if (already) {
        cfg.button.textContent = 'Module ' + cfg.module + ' completed ✓';
        cfg.status.innerHTML = '<span class="l6-pass">Saved to your progress.</span>';
      }
    }
    cfg.button.addEventListener('click', function () {
      if (!met()) return;
      L6.store.set(cfg.completedKey, 'true');
      cfg.status.textContent = 'Saving…';
      var p;
      try {
        if (typeof window.markModuleComplete === 'function') p = window.markModuleComplete(cfg.level, cfg.module);
      } catch (e) { p = Promise.reject(e); }
      Promise.resolve(p).then(function () {
        refresh();
      }, function () {
        cfg.status.innerHTML = '<span class="l6-fail">Saved on this device, but the online save failed.</span> Check your connection and press the button again.';
        L6.store.set(cfg.completedKey, '');
        refresh();
      });
    });
    document.addEventListener('l6:progress', refresh);
    L6.refreshCompletion = refresh;
    refresh();
  };
})();

/* =========================================================
   Shared widgets for Modules 2–12
   ========================================================= */
(function () {
  'use strict';
  var L6 = window.L6;
  var esc = L6.esc;
  L6.$ = function (id) { return document.getElementById(id); };

  L6.btn = function (label, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'l6-btn' + (cls ? ' ' + cls : '');
    b.innerHTML = label;
    return b;
  };
  L6.setOn = function (group, btn) {
    group.forEach(function (b) { b.classList.remove('is-on'); b.setAttribute('aria-pressed', 'false'); });
    if (btn) { btn.classList.add('is-on'); btn.setAttribute('aria-pressed', 'true'); }
  };
  L6.setCode = function (el, text) {
    if (typeof el === 'string') el = L6.$(el);
    var code = el.querySelector('code') || el;
    code.innerHTML = L6.highlight(text);
  };
  L6.rand = function (lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); };
  L6.hex = function (n, w) { var s = (n >>> 0).toString(16).toUpperCase(); while (s.length < w) s = '0' + s; return s.slice(-w); };
  L6.bin = function (n, w) { var s = (n >>> 0).toString(2); while (s.length < w) s = '0' + s; return s.slice(-w); };

  /* Tab/button group: items [{label, onSelect}] */
  L6.buttonGroup = function (root, items, opts) {
    opts = opts || {};
    var btns = items.map(function (it, i) {
      var b = L6.btn(it.label, opts.mono ? 'is-mono' : '');
      b.addEventListener('click', function () { L6.setOn(btns, b); it.onSelect(i, b); });
      root.appendChild(b);
      return b;
    });
    if (opts.select !== undefined && btns[opts.select]) btns[opts.select].click();
    return btns;
  };

  /* ---------- Choice game ----------
     items: [{q (html) | code (text), a: answer label, why}]
     choices: ['Legal', 'Error'] ... */
  L6.choiceGame = function (root, items, choices, onDone, scoreEl) {
    var answered = 0, right = 0;
    items.forEach(function (it) {
      var card = document.createElement('div');
      card.className = 'l6-choice';
      card.innerHTML = (it.q ? '<p style="margin:0 0 6px">' + it.q + '</p>' : '') +
        (it.code ? '<pre class="l6-code"><code>' + L6.highlight(it.code) + '</code></pre>' : '') +
        '<div class="l6-btnrow" style="margin:0"></div><div class="l6-fb"></div>';
      var row = card.querySelector('.l6-btnrow'), fb = card.querySelector('.l6-fb');
      (it.choices || choices).forEach(function (c) {
        var b = L6.btn(c);
        b.addEventListener('click', function () {
          row.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
          answered++;
          if (c === it.a) {
            right++; card.classList.add('is-right'); b.classList.add('is-on');
            L6.feedback(fb, 'ok', '<span class="l6-pass">✓ ' + esc(it.a) + '.</span> ' + it.why);
          } else {
            card.classList.add('is-wrong');
            L6.feedback(fb, 'bad', '<span class="l6-fail">✗ Answer: ' + esc(it.a) + '.</span> ' + it.why);
          }
          if (scoreEl) scoreEl.textContent = right + ' of ' + answered + ' correct' + (answered === items.length ? ' (finished)' : '');
          if (answered === items.length && onDone) onDone(right);
        });
        row.appendChild(b);
      });
      root.appendChild(card);
    });
  };

  /* ---------- Code tour ----------
     parts: [{n: label, r: [from, to], t: html}] */
  L6.codeTour = function (btnRoot, codeEl, noteEl, lines, parts, minSeen, onDone) {
    var rows = L6.renderLines(codeEl, lines), btns = [], seen = {};
    parts.forEach(function (p, i) {
      var b = L6.btn(p.n);
      b.addEventListener('click', function () {
        L6.setOn(btns, b);
        rows.forEach(function (row, idx) { row.classList.toggle('is-hl', idx + 1 >= p.r[0] && idx + 1 <= p.r[1]); });
        L6.feedback(noteEl, 'info', p.t);
        seen[i] = 1;
        if (Object.keys(seen).length >= (minSeen || parts.length) && onDone) onDone();
      });
      btns.push(b);
      btnRoot.appendChild(b);
    });
  };

  /* ---------- Try it yourself ---------- */
  L6.tryIt = function (root, tasks, onAll) {
    var solved = {};
    tasks.forEach(function (tk, i) {
      var card = document.createElement('div');
      card.className = 'l6-card';
      var multi = tk.multi;
      card.innerHTML = '<p class="l6-card-title">Task ' + (i + 1) + '</p><p>' + tk.t + '</p>' +
        (multi ? '<textarea class="l6-input is-wide" rows="' + multi + '" spellcheck="false" aria-label="Your answer for task ' + (i + 1) + '"></textarea>' : '') +
        '<div class="l6-btnrow">' + (multi ? '' : '<input class="l6-input" style="flex:1" spellcheck="false" autocomplete="off" aria-label="Your answer for task ' + (i + 1) + '">') +
        '<button type="button" class="l6-btn is-primary">Check</button><button type="button" class="l6-btn">Hint</button><button type="button" class="l6-btn">Show answer</button></div><div class="l6-fb"></div>';
      var inp = card.querySelector('input, textarea'), bs = card.querySelectorAll('button'), fb = card.querySelector('.l6-fb');
      function check() {
        var norm = inp.value.replace(/\s+/g, '');
        if (!norm) { L6.feedback(fb, 'bad', 'Type your answer first.'); return; }
        var ok = tk.re.some(function (r) { return r.test(norm); });
        if (ok) {
          L6.feedback(fb, 'ok', '<span class="l6-pass">PASS ✓</span> ' + (tk.ok || 'Correct.'));
          solved[i] = 1;
          if (Object.keys(solved).length === tasks.length && onAll) onAll();
        } else {
          L6.feedback(fb, 'bad', '<span class="l6-fail">FAIL ✗</span> Not quite. Check keywords, names and punctuation, or use Hint.');
        }
      }
      bs[0].addEventListener('click', check);
      if (!multi) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
      bs[1].addEventListener('click', function () { L6.feedback(fb, 'info', tk.hint); });
      bs[2].addEventListener('click', function () {
        L6.feedback(fb, 'info', 'One correct answer:<pre class="l6-code"><code>' + L6.highlight(tk.ans) + '</code></pre>Type it in and press Check to complete the task.');
      });
      root.appendChild(card);
    });
  };

  /* ---------- Debugging challenge ----------
     spec: { lines, bugs: {lineNo: {id, t}}, clean: {lineNo: text}, fix: text } */
  L6.debugChallenge = function (spec, onDone) {
    var rows = L6.renderLines(L6.$('dbgCode'), spec.lines, { clickable: true });
    var ids = {}; Object.keys(spec.bugs).forEach(function (k) { ids[spec.bugs[k].id] = 1; });
    var total = Object.keys(ids).length, found = {}, note = L6.$('dbgNote'), score = L6.$('dbgScore');
    score.textContent = 'Bugs found: 0 of ' + total;
    if (spec.fix) L6.setCode(L6.$('dbgFix'), spec.fix);
    rows.forEach(function (row, i) {
      var ln = i + 1;
      row.addEventListener('click', function () {
        var bug = spec.bugs[ln];
        if (bug) {
          Object.keys(spec.bugs).forEach(function (k) { if (spec.bugs[k].id === bug.id) rows[k - 1].classList.add('is-bug'); });
          found[bug.id] = 1;
          L6.feedback(note, 'ok', '<span class="l6-pass">Found one.</span> ' + bug.t);
        } else {
          row.classList.add('is-clean');
          setTimeout(function () { row.classList.remove('is-clean'); }, 1200);
          L6.feedback(note, 'bad', '<span class="l6-fail">No bug on line ' + ln + '.</span> ' + ((spec.clean && spec.clean[ln]) || 'This line is fine.'));
        }
        var n = Object.keys(found).length;
        score.innerHTML = 'Bugs found: ' + n + ' of ' + total + (n === total ? ' <span class="l6-pass">All found ✓</span>' : '');
        if (n === total) { L6.$('dbgFixWrap').hidden = false; if (onDone) onDone(); }
      });
    });
  };

  /* ---------- Waveform viewer ----------
     cfg: { cycles, signals: [{name, kind:'clk'|'bit'|'bus', vals:[], edit: fn(cycle) }],
            marks: [ {cycle, kind:'pass'|'fail'|'dis'|'pend', label} ], hl: [from, to] } */
  L6.wave = function (root, cfg) {
    var n = cfg.cycles;
    var grid = document.createElement('div');
    grid.className = 'l6-wavegrid';
    grid.style.gridTemplateColumns = 'auto repeat(' + n + ', ' + (cfg.cell || 42) + 'px)';
    var html = '<div class="wv-hdr"></div>';
    for (var c = 0; c < n; c++) html += '<div class="wv-hdr">' + c + '</div>';
    grid.innerHTML = html;
    function hl(c) { return cfg.hl && c >= cfg.hl[0] && c <= cfg.hl[1] ? ' hl' : ''; }
    cfg.signals.forEach(function (s, si) {
      var nm = document.createElement('div');
      nm.className = 'wv-name'; nm.textContent = s.name;
      grid.appendChild(nm);
      for (var c = 0; c < n; c++) {
        var el;
        if (s.kind === 'clk') {
          el = document.createElement('div');
          el.className = 'wv wv-clk' + hl(c);
          el.innerHTML = '<svg viewBox="0 0 42 34" preserveAspectRatio="none" aria-hidden="true"><path d="M0,28 L0,6 L21,6 L21,28 L42,28" fill="none" stroke="#4A5668" stroke-width="2"/><path d="M0,14 l-3,5 h6z" fill="#0B7A83"/></svg>';
        } else {
          el = document.createElement(s.edit ? 'button' : 'div');
          if (s.edit) el.type = 'button';
          var v = s.vals[c];
          if (s.kind === 'bus') {
            el.className = 'wv wv-bus' + (c > 0 && s.vals[c - 1] === v ? ' same' : '') + hl(c);
            el.innerHTML = '<span>' + esc(String(v)) + '</span>';
          } else {
            var vs = String(v).toLowerCase();
            el.className = 'wv wv-b v' + vs + (c > 0 && String(s.vals[c - 1]).toLowerCase() !== vs ? ' edge' : '') + hl(c);
          }
          el.setAttribute('aria-label', s.name + ' cycle ' + c + ' = ' + v);
          if (s.edit) (function (cc) { el.addEventListener('click', function () { s.edit(cc); }); })(c);
        }
        grid.appendChild(el);
      }
    });
    if (cfg.marks) {
      var nm2 = document.createElement('div');
      nm2.className = 'wv-name'; nm2.textContent = cfg.markLabel || 'result';
      grid.appendChild(nm2);
      var byC = {};
      cfg.marks.forEach(function (m) { byC[m.cycle] = m; });
      for (var c2 = 0; c2 < n; c2++) {
        var m = byC[c2], d = document.createElement('div');
        d.className = 'wv-mark' + (m ? ' ' + m.kind : '');
        d.textContent = m ? (m.label || { pass: '✓', fail: '✗', dis: '⊘', pend: '…' }[m.kind]) : '';
        if (m && m.title) d.title = m.title;
        grid.appendChild(d);
      }
    }
    root.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'l6-wave-wrap';
    wrap.appendChild(grid);
    root.appendChild(wrap);
  };

  /* ---------- Meter ---------- */
  L6.meter = function (label, pct) {
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    return '<div class="l6-meter"><span>' + label + '</span><div class="l6-meter-track"><div class="l6-meter-fill' + (pct === 100 ? ' is-full' : '') +
      '" style="width:' + pct + '%"></div></div><b>' + pct + '%</b></div>';
  };

  /* ---------- One-call module setup ----------
     cfg: { module, activities, quiz, passMark, minActs, tryit, debug, init } */
  L6.initModule = function (cfg) {
    var n = cfg.module;
    var keyActs = 'level6_module' + n + '_activities';
    var keyDone = 'level6_module' + n + '_completed';
    var keyQuiz = 'level6_module' + n + '_quiz_best';
    var pass = cfg.passMark || Math.ceil(cfg.quiz.length * 0.6);
    var minActs = cfg.minActs || Math.ceil(cfg.activities.length * 0.6);
    document.addEventListener('DOMContentLoaded', function () {
      L6.initProgress(keyActs, cfg.activities);
      L6.highlightAll();
      if (cfg.init) cfg.init();
      if (cfg.tryit && L6.$('tryList')) L6.tryIt(L6.$('tryList'), cfg.tryit, function () { L6.mark('tryit'); });
      if (cfg.debug && L6.$('dbgCode')) L6.debugChallenge(cfg.debug, function () { L6.mark('debug'); });
      L6.quiz(L6.$('quizRoot'), cfg.quiz, {
        passMark: pass,
        onFinish: function (score) {
          var best = parseInt(L6.store.get(keyQuiz, '0'), 10) || 0;
          if (score > best) L6.store.set(keyQuiz, String(score));
          if (score >= pass) L6.mark('quiz');
          if (L6.refreshCompletion) L6.refreshCompletion();
        }
      });
      var rq = L6.$('reqQuiz'), ra = L6.$('reqActs');
      rq.textContent = 'Score ' + pass + ' or more on the quiz';
      ra.textContent = 'Finish at least ' + minActs + ' of the ' + cfg.activities.length + ' activities';
      L6.initCompletion({
        level: 6, module: n, completedKey: keyDone,
        button: L6.$('completeBtn'), status: L6.$('completeStatus'),
        reqs: [
          { el: rq, test: function () { return (parseInt(L6.store.get(keyQuiz, '0'), 10) || 0) >= pass; } },
          { el: ra, test: function () { return L6.doneCount() >= minActs; } }
        ]
      });
      L6.initToc();
    });
  };
})();

/* =========================================================
   Visual refresh: hero artwork, hero chips, code title bars
   ========================================================= */
(function () {
  'use strict';
  var T = '#3FC1C9', G = '#C9A227', W = '#EAF2FB', D = 'rgba(255,255,255,.12)';
  function chip(x, y, w, h, label) {
    var pins = '';
    for (var i = 0; i < 4; i++) {
      var py = y + 14 + i * (h - 28) / 3;
      pins += '<path d="M' + (x - 10) + ' ' + py + 'h10M' + (x + w) + ' ' + py + 'h10" stroke="' + G + '" stroke-width="3" stroke-linecap="round"/>';
    }
    return pins + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="#0E1C33" stroke="' + T + '" stroke-width="3"/>' +
      (label ? '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 6) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="17" font-weight="700" fill="' + W + '">' + label + '</text>' : '');
  }
  var ART = {
    1: chip(55, 60, 90, 80, '0 1 X Z'),
    2: '<rect x="70" y="26" width="60" height="30" rx="8" fill="none" stroke="' + T + '" stroke-width="3"/><path d="M100 56v18" stroke="' + W + '" stroke-width="3"/><path d="M100 74l30 26-30 26-30-26z" fill="#0E1C33" stroke="' + G + '" stroke-width="3"/><path d="M70 100H40v44M130 100h30v44" stroke="' + W + '" stroke-width="3" fill="none"/><rect x="18" y="144" width="46" height="28" rx="7" fill="none" stroke="' + T + '" stroke-width="3"/><rect x="136" y="144" width="46" height="28" rx="7" fill="none" stroke="' + T + '" stroke-width="3"/><text x="100" y="105" text-anchor="middle" font-size="13" font-family="IBM Plex Mono" fill="' + G + '">if</text>',
    3: [0, 1, 2, 3].map(function (i) { return '<rect x="' + (22 + i * 40) + '" y="78" width="34" height="44" rx="7" fill="' + (i === 3 ? G : '#0E1C33') + '" stroke="' + T + '" stroke-width="3"/><text x="' + (39 + i * 40) + '" y="140" text-anchor="middle" font-size="12" font-family="IBM Plex Mono" fill="' + W + '">[' + i + ']</text>'; }).join('') + '<path d="M150 58q20-26 36 0" stroke="' + G + '" stroke-width="3" fill="none"/><path d="M182 52l5 8-9 1" fill="' + G + '"/><text x="100" y="40" text-anchor="middle" font-size="14" font-family="IBM Plex Mono" fill="' + W + '">q[$]</text>',
    4: '<rect x="28" y="56" width="90" height="70" rx="12" fill="#0E1C33" stroke="' + T + '" stroke-width="3"/><text x="73" y="98" text-anchor="middle" font-size="22" font-style="italic" font-family="Georgia,serif" fill="' + W + '">f(x)</text><circle cx="148" cy="120" r="34" fill="#0E1C33" stroke="' + G + '" stroke-width="3"/><path d="M148 100v20l14 10" stroke="' + G + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
    5: '<rect x="66" y="22" width="68" height="40" rx="9" fill="#0E1C33" stroke="' + G + '" stroke-width="3"/><text x="100" y="47" text-anchor="middle" font-size="13" font-family="IBM Plex Mono" fill="' + W + '">class</text><path d="M100 62v22M54 84h92M54 84v22M146 84v22" stroke="' + W + '" stroke-width="3" fill="none"/><rect x="22" y="106" width="64" height="40" rx="9" fill="none" stroke="' + T + '" stroke-width="3"/><rect x="114" y="106" width="64" height="40" rx="9" fill="none" stroke="' + T + '" stroke-width="3"/><text x="54" y="131" text-anchor="middle" font-size="12" font-family="IBM Plex Mono" fill="' + W + '">obj</text><text x="146" y="131" text-anchor="middle" font-size="12" font-family="IBM Plex Mono" fill="' + W + '">obj</text>',
    6: chip(18, 64, 50, 72) + chip(132, 64, 50, 72) + '<rect x="70" y="86" width="60" height="28" rx="14" fill="' + T + '"/><path d="M78 94h44M78 100h44M78 106h44" stroke="#0E1C33" stroke-width="2" opacity=".5"/>',
    7: '<path d="M18 120h30v-40h40v40h30v-40h30v40h34" stroke="' + T + '" stroke-width="4" fill="none"/><circle cx="148" cy="62" r="24" fill="' + G + '"/><path d="M137 62l8 8 15-16" stroke="#0E1C33" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    8: '<rect x="40" y="52" width="76" height="76" rx="16" fill="#0E1C33" stroke="' + T + '" stroke-width="3" transform="rotate(-12 78 90)"/><g fill="' + W + '" transform="rotate(-12 78 90)"><circle cx="60" cy="72" r="6"/><circle cx="96" cy="108" r="6"/><circle cx="78" cy="90" r="6"/></g><rect x="108" y="92" width="58" height="58" rx="12" fill="' + G + '" transform="rotate(14 137 121)"/><g fill="#0E1C33" transform="rotate(14 137 121)"><circle cx="124" cy="108" r="5"/><circle cx="150" cy="134" r="5"/></g>',
    9: [['GEN', 30], ['DRV', 74], ['DUT', 118]].map(function (b, i) { return '<rect x="' + (b[1] - 4) + '" y="78" width="40" height="40" rx="8" fill="' + (i === 2 ? G : '#0E1C33') + '" stroke="' + T + '" stroke-width="3"/><text x="' + (b[1] + 16) + '" y="102" text-anchor="middle" font-size="10" font-weight="700" font-family="IBM Plex Mono" fill="' + (i === 2 ? '#0E1C33' : W) + '">' + b[0] + '</text>'; }).join('') + '<rect x="158" y="78" width="30" height="40" rx="8" fill="none" stroke="' + T + '" stroke-width="3"/><path d="M68 98h4M112 98h4M156 98h4" stroke="' + W + '" stroke-width="3"/><path d="M50 128q50 40 120 0" stroke="' + W + '" stroke-width="2" stroke-dasharray="5 4" fill="none"/>',
    10: '<rect x="22" y="30" width="156" height="140" rx="16" fill="none" stroke="' + D + '" stroke-width="3"/><rect x="38" y="48" width="124" height="70" rx="12" fill="none" stroke="' + T + '" stroke-width="3"/><rect x="52" y="64" width="30" height="38" rx="6" fill="#0E1C33" stroke="' + W + '" stroke-width="2"/><rect x="118" y="64" width="30" height="38" rx="6" fill="#0E1C33" stroke="' + W + '" stroke-width="2"/><path d="M84 83h32" stroke="' + G + '" stroke-width="3"/><path d="M60 136h80v20H60z" fill="' + G + '"/><path d="M60 136l40 12 40-12" stroke="#0E1C33" stroke-width="2" fill="none"/>',
    11: (function () { var s = '', v = [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1]; for (var i = 0; i < 16; i++) s += '<rect x="' + (40 + (i % 4) * 32) + '" y="' + (40 + Math.floor(i / 4) * 32) + '" width="26" height="26" rx="6" fill="' + (v[i] ? T : 'none') + '" stroke="' + (v[i] ? T : G) + '" stroke-width="2" opacity="' + (v[i] ? (0.5 + (i % 3) * 0.25) : 1) + '"/>'; return s; })(),
    12: '<path d="M64 40h72v34a36 36 0 01-72 0z" fill="' + G + '"/><path d="M64 50H44a20 20 0 0020 24M136 50h20a20 20 0 01-20 24" stroke="' + G + '" stroke-width="5" fill="none"/><path d="M100 110v22M78 132h44v14H78z" fill="' + G + '" stroke="' + G + '" stroke-width="4"/><path d="M88 66l9 9 17-18" stroke="#0E1C33" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  function moduleNumber() { var m = location.pathname.match(/level6-module(\d+)\.html/); return m ? +m[1] : 0; }

  function decorate() {
    var n = moduleNumber(), hero = document.querySelector('.l6-hero');
    if (hero && n && ART[n] && !hero.querySelector('.l6-hero-art')) {
      hero.classList.add('has-art');
      hero.insertAdjacentHTML('beforeend', '<svg class="l6-hero-art" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="96" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.12)"/>' + ART[n] + '</svg>');
      var acts = {}; Array.prototype.forEach.call(document.querySelectorAll('[data-activity]'), function (t) { acts[t.getAttribute('data-activity')] = 1; });
      var q = document.querySelectorAll('#quizRoot .l6-q').length;
      var lead = hero.querySelector('.l6-lead');
      var ul = document.createElement('ul'); ul.className = 'l6-hero-chips';
      ul.innerHTML = '<li>Module ' + n + ' of 12</li><li>⚡ ' + Object.keys(acts).length + ' interactive activities</li>' + (q ? '<li>📝 ' + q + '-question quiz</li>' : '') + '<li>🏆 Completion badge</li>';
      if (lead) lead.insertAdjacentElement('afterend', ul);
    }
    // Code blocks in the reading flow get a title bar with a Copy button
    Array.prototype.forEach.call(document.querySelectorAll('.l6-section pre.l6-code'), function (pre) {
      if (pre.closest('.l6-choice, .l6-fb, .l6-codewrap, details') || pre.parentNode.classList.contains('l6-codewrap')) return;
      var wrap = document.createElement('div'); wrap.className = 'l6-codewrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.innerHTML = '<div class="l6-codehead"><i></i><i></i><i></i><span>SystemVerilog</span><button type="button">Copy</button></div>';
      wrap.appendChild(pre);
      var btn = wrap.querySelector('button');
      btn.addEventListener('click', function () {
        var txt = pre.textContent;
        function done() { btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = 'Copy'; }, 1400); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { btn.textContent = 'Select & copy'; });
        else btn.textContent = 'Select & copy';
      });
    });
  }
  // after each module's own setup (quiz, code highlighting) has run
  window.addEventListener('load', decorate);
})();
