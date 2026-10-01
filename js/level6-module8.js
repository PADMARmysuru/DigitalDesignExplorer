/* Level 6 – Module 8: Constrained Randomization */
(function () {
  'use strict';
  var $ = L6.$, esc = L6.esc;

  function hist(counts, labels) {
    var mx = Math.max.apply(null, counts.concat([1]));
    return '<div class="l6-hist">' + counts.map(function (c, i) {
      return '<div style="height:' + (100 * c / mx) + '%" title="' + esc(labels[i]) + ': ' + c + '"></div>';
    }).join('') + '</div><div class="l6-hist-axis"><span>' + esc(labels[0]) + '</span><span>' + esc(labels[labels.length - 1]) + '</span></div>';
  }
  function pickWeighted(vals, w) {
    var tot = 0, i; for (i = 0; i < w.length; i++) tot += w[i];
    var r = Math.random() * tot;
    for (i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return vals[i]; }
    return vals[vals.length - 1];
  }

  /* ---------- rand vs randc ---------- */
  function initRandc() {
    var runs = 0;
    $('rcGo').addEventListener('click', function () {
      var r = [], c = [], perm = [];
      for (var i = 0; i < 12; i++) r.push(L6.rand(0, 3));
      while (c.length < 12) {
        if (!perm.length) { perm = [0, 1, 2, 3]; for (var k = 3; k > 0; k--) { var j = L6.rand(0, k), t = perm[k]; perm[k] = perm[j]; perm[j] = t; } }
        c.push(perm.pop());
      }
      function row(arr, isC) {
        return arr.map(function (v, i) {
          var rep = !isC && arr.slice(Math.floor(i / 4) * 4, i).indexOf(v) >= 0;
          return (isC && i && i % 4 === 0 ? '<span style="align-self:center;color:var(--ink-3)">|</span>' : '') +
            '<div class="l6-box' + (rep ? ' is-hit' : '') + '">' + v + '</div>';
        }).join('');
      }
      $('rcOut').innerHTML = '<p class="l6-label">rand bit [1:0] x</p><div class="l6-boxes">' + row(r, false) + '</div>' +
        '<p class="l6-label" style="margin-top:10px">randc bit [1:0] y</p><div class="l6-boxes">' + row(c, true) + '</div>';
      L6.feedback($('rcNote'), 'info', '<b>rand</b> can repeat at any time (repeats within each group of four are highlighted). <b>randc</b> deals out all 4 values in a random order, like a shuffled deck, before starting a new round. Every group between the bars contains 0, 1, 2 and 3 exactly once.');
      runs++; if (runs >= 2) L6.mark('randc');
    });
  }

  /* ---------- Constraint playground ---------- */
  function parseNum(s) {
    s = s.trim();
    var m;
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if ((m = s.match(/^(\d+)?'([hdbo])([0-9a-fA-F_]+)$/i))) {
      var b = { h: 16, d: 10, b: 2, o: 8 }[m[2].toLowerCase()];
      var v = parseInt(m[3].replace(/_/g, ''), b);
      return isNaN(v) ? null : v;
    }
    return null;
  }
  function parseSet(body) {
    var items = [], parts = body.split(','), i;
    for (i = 0; i < parts.length; i++) {
      var p = parts[i].trim(), m;
      if (!p) continue;
      if ((m = p.match(/^\[(.+):(.+)\]$/))) {
        var a = parseNum(m[1]), b = parseNum(m[2]);
        if (a === null || b === null) return null;
        items.push([Math.min(a, b), Math.max(a, b)]);
      } else {
        var v = parseNum(p); if (v === null) return null; items.push([v, v]);
      }
    }
    return items;
  }
  function inSet(v, set) { return set.some(function (r) { return v >= r[0] && v <= r[1]; }); }
  var OPS = { '==': function (a, b) { return a === b; }, '!=': function (a, b) { return a !== b; }, '<': function (a, b) { return a < b; }, '<=': function (a, b) { return a <= b; }, '>': function (a, b) { return a > b; }, '>=': function (a, b) { return a >= b; } };

  function parseConstraints(text) {
    var t = text.replace(/\/\/[^\n]*/g, '').replace(/constraint\s+\w+\s*\{/g, '').trim();
    t = t.replace(/\}\s*$/, '');
    // split on ; that are not inside braces
    var stmts = [], depth = 0, cur = '';
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (ch === ';' && depth === 0) { stmts.push(cur); cur = ''; } else cur += ch;
    }
    if (cur.trim()) stmts.push(cur);
    var out = [], dist = null;
    for (var k = 0; k < stmts.length; k++) {
      var s = stmts[k].trim().replace(/\s+/g, ' ');
      if (!s) continue;
      var m;
      if ((m = s.match(/^data inside ?\{(.*)\}$/))) {
        var set = parseSet(m[1]); if (!set) return { error: 'Could not read the set in: ' + s };
        out.push({ src: s, f: (function (S) { return function (v) { return inSet(v, S); }; })(set) });
      } else if ((m = s.match(/^! ?\( ?data inside ?\{(.*)\} ?\)$/))) {
        var set2 = parseSet(m[1]); if (!set2) return { error: 'Could not read the set in: ' + s };
        out.push({ src: s, f: (function (S) { return function (v) { return !inSet(v, S); }; })(set2) });
      } else if ((m = s.match(/^data ?(==|!=|<=|>=|<|>) ?(\S+)$/))) {
        var n = parseNum(m[2]); if (n === null) return { error: 'Not a number: ' + m[2] };
        out.push({ src: s, f: (function (op, n) { return function (v) { return OPS[op](v, n); }; })(m[1], n) });
      } else if ((m = s.match(/^(\S+) ?(==|!=|<=|>=|<|>) ?data$/))) {
        var n2 = parseNum(m[1]); if (n2 === null) return { error: 'Not a number: ' + m[1] };
        var flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=', '==': '==', '!=': '!=' }[m[2]];
        out.push({ src: s, f: (function (op, n) { return function (v) { return OPS[op](v, n); }; })(flip, n2) });
      } else if ((m = s.match(/^data ?% ?(\d+) ?(==|!=) ?(\d+)$/))) {
        var md = +m[1], r = +m[3];
        if (!md) return { error: 'Modulo by 0.' };
        out.push({ src: s, f: (function (md, op, r) { return function (v) { return OPS[op](v % md, r); }; })(md, m[2], r) });
      } else if ((m = s.match(/^data dist ?\{(.*)\}$/))) {
        if (dist) return { error: 'Use only one dist in this playground.' };
        var items = m[1].split(','), d = [];
        for (var q = 0; q < items.length; q++) {
          var it = items[q].trim(), mm = it.match(/^(.+?) ?(:=|:\/) ?(\d+)$/);
          if (!mm) return { error: 'Could not read dist item: ' + it + ' (use value := weight or [a:b] :/ weight)' };
          var st = parseSet(mm[1]); if (!st || st.length !== 1) return { error: 'Bad dist range: ' + mm[1] };
          d.push({ lo: st[0][0], hi: st[0][1], op: mm[2], w: +mm[3] });
        }
        dist = { src: s, items: d };
      } else {
        return { error: 'Not supported here: "' + s + '". Try a comparison, inside, % or dist on data.' };
      }
    }
    return { list: out, dist: dist };
  }

  function initPlayground() {
    var W = 8, tried = {};
    var presets = [
      ['range', 'data inside {[10:20]};'],
      ['set + exclusion', 'data inside {1, 2, [40:50], 99};\ndata != 45;'],
      ['even numbers', 'data % 2 == 0;\ndata < 64;'],
      ['dist', 'data dist { 0 := 30, [1:10] :/ 40, 255 := 30 };'],
      ['conflict', 'data > 200;\ndata < 100;'],
      ['outside a range', '!(data inside {[16:239]});']
    ];
    L6.buttonGroup($('pgW'), [['rand bit [3:0] data', 4], ['rand bit [7:0] data', 8]].map(function (o) {
      return { label: o[0], onSelect: function () { W = o[1]; } };
    }), { mono: true, select: 1 });
    presets.forEach(function (p) {
      var b = L6.btn(p[0]);
      b.addEventListener('click', function () { $('pgText').value = 'constraint c {\n  ' + p[1].split('\n').join('\n  ') + '\n}'; });
      $('pgPresets').appendChild(b);
    });
    $('pgText').value = 'constraint c {\n  data inside {[10:20]};\n}';

    function summarize(vals) {
      if (!vals.length) return 'none';
      var rs = [], s = vals[0], p = vals[0];
      for (var i = 1; i <= vals.length; i++) {
        if (i < vals.length && vals[i] === p + 1) { p = vals[i]; continue; }
        rs.push(s === p ? String(s) : s + '–' + p);
        if (i < vals.length) { s = p = vals[i]; }
      }
      return rs.length > 8 ? rs.slice(0, 8).join(', ') + ', …' : rs.join(', ');
    }
    function legal(list, dist, max, skip) {
      var vals = [], w = [];
      for (var v = 0; v <= max; v++) {
        var ok = true;
        for (var i = 0; i < list.length; i++) if (i !== skip && !list[i].f(v)) { ok = false; break; }
        if (!ok) continue;
        if (dist && skip !== -2) {
          var wt = 0, inD = false;
          dist.items.forEach(function (it) { if (v >= it.lo && v <= it.hi) { inD = true; wt += it.op === ':=' ? it.w : it.w / (it.hi - it.lo + 1); } });
          if (!inD) continue;
          vals.push(v); w.push(wt);
        } else { vals.push(v); w.push(1); }
      }
      return { vals: vals, w: w };
    }
    function run(count) {
      var p = parseConstraints($('pgText').value);
      var out = $('pgOut');
      if (p.error) { out.innerHTML = '<div class="l6-fb is-show is-bad">' + esc(p.error) + '</div>'; return; }
      var max = (1 << W) - 1, L = legal(p.list, p.dist, max);
      if (!L.vals.length) {
        var culprit = [];
        var all = p.list.map(function (c) { return c.src; }).concat(p.dist ? [p.dist.src] : []);
        for (var i = 0; i < p.list.length; i++) if (legal(p.list, p.dist, max, i).vals.length) culprit.push(p.list[i].src);
        if (p.dist && legal(p.list, p.dist, max, -2).vals.length) culprit.push(p.dist.src);
        out.innerHTML = '<div class="l6-verdict fail">randomize() returned 0 ✗</div><div class="l6-fb is-show is-bad">No value of <code>bit [' + (W - 1) + ':0] data</code> (0 to ' + max + ') satisfies every constraint at once. ' +
          (culprit.length ? 'Removing any one of these would fix it: <code>' + culprit.map(esc).join('</code>, <code>') + '</code>.' : 'The constraints contradict each other or the variable\'s range: ' + all.map(esc).join('; ')) +
          ' <b>data keeps its old value</b>, which is why you must always check the return value.</div>';
        tried[$('pgText').value] = 1; if (Object.keys(tried).length >= 3) L6.mark('playground');
        return;
      }
      var samples = [];
      for (var k = 0; k < count; k++) samples.push(pickWeighted(L.vals, L.w));
      var buckets = W === 4 ? 16 : 32, size = (max + 1) / buckets, counts = new Array(buckets).fill(0), labels = [];
      for (var b = 0; b < buckets; b++) labels.push(size === 1 ? String(b) : (b * size) + '–' + (b * size + size - 1));
      samples.forEach(function (v) { counts[Math.floor(v / size)]++; });
      out.innerHTML = '<div class="l6-verdict pass">randomize() returned 1 ✓</div>' +
        '<p><b>' + L.vals.length + '</b> legal value' + (L.vals.length > 1 ? 's' : '') + ': ' + summarize(L.vals) + '</p>' +
        '<p class="l6-label">Last ' + Math.min(20, samples.length) + ' generated</p><div class="l6-boxes">' + samples.slice(-20).map(function (v) { return '<div class="l6-box is-new">' + v + '</div>'; }).join('') + '</div>' +
        (count > 1 ? '<p class="l6-label" style="margin-top:10px">Histogram of ' + count + ' values' + (size > 1 ? ' (each bar covers ' + size + ' values)' : '') + '</p>' + hist(counts, labels) : '');
      tried[$('pgText').value] = 1; if (Object.keys(tried).length >= 3) L6.mark('playground');
    }
    $('pg1').addEventListener('click', function () { run(1); });
    $('pg20').addEventListener('click', function () { run(20); });
    $('pg500').addEventListener('click', function () { run(500); });
  }

  /* ---------- dist := vs :/ ---------- */
  function initDist() {
    var seen = {};
    L6.buttonGroup($('dsOp'), [':=', ':/'].map(function (op) {
      return {
        label: op, onSelect: function () {
          L6.setCode('dsCode', 'constraint c { data dist { 0 := 40, [1:3] ' + op + ' 60 }; }');
          var w = op === ':=' ? [40, 60, 60, 60] : [40, 20, 20, 20], tot = w.reduce(function (a, b) { return a + b; });
          var counts = [0, 0, 0, 0];
          for (var i = 0; i < 1000; i++) counts[pickWeighted([0, 1, 2, 3], w)]++;
          $('dsOut').innerHTML = [0, 1, 2, 3].map(function (v) {
            return '<div class="l6-meter"><span>data = ' + v + ' (weight ' + w[v] + ')</span><div class="l6-meter-track"><div class="l6-meter-fill" style="width:' + (100 * w[v] / tot) + '%"></div></div><b>' + Math.round(100 * w[v] / tot) + '%</b></div>';
          }).join('') + '<p class="l6-label">1000 samples: ' + counts.map(function (c, i) { return i + ' → ' + c; }).join(', ') + '</p>';
          L6.feedback($('dsNote'), 'info', op === ':='
            ? '<code>:=</code> gives weight 60 to <b>each</b> of 1, 2 and 3. Total weight 40 + 3 × 60 = 220, so 0 appears only 18% of the time.'
            : '<code>:/</code> shares 60 among 1, 2 and 3 (20 each). Total weight 100, so 0 appears 40% of the time and the range as a whole 60%.');
          seen[op] = 1; if (seen[':='] && seen[':/']) L6.mark('dist');
        }
      };
    }), { mono: true, select: 0 });
  }

  /* ---------- solve before ---------- */
  function initSolve() {
    var ordered = false, seen = {};
    function grid(counts) {
      var cells = '';
      for (var s = 0; s <= 1; s++) for (var l = 0; l <= 7; l++) {
        var legalC = !(s === 1 && l !== 0);
        var key = s + ':' + l;
        cells += '<div class="l6-box" style="' + (legalC ? '' : 'opacity:.25;border-style:dashed') + '">' + s + ',' + l + '<small>' + (legalC ? (counts ? counts[key] || 0 : 'legal') : 'illegal') + '</small></div>';
      }
      $('svGrid').innerHTML = '<p class="l6-label">(is_short, len): 9 legal combinations</p><div class="l6-boxes">' + cells + '</div>';
    }
    L6.buttonGroup($('svMode'), [['Without solve before', false], ['With solve is_short before len', true]].map(function (o) {
      return { label: o[0], onSelect: function () { ordered = o[1]; grid(null); $('svOut').innerHTML = ''; $('svNote').className = 'l6-fb'; } };
    }), { select: 0 });
    $('svRun').addEventListener('click', function () {
      var counts = {}, shorts = 0;
      for (var i = 0; i < 900; i++) {
        var s, l;
        if (ordered) { s = L6.rand(0, 1); l = s ? 0 : L6.rand(0, 7); }
        else { var k = L6.rand(0, 8); if (k === 8) { s = 1; l = 0; } else { s = 0; l = k; } }
        counts[s + ':' + l] = (counts[s + ':' + l] || 0) + 1;
        if (s) shorts++;
      }
      grid(counts);
      $('svOut').innerHTML = L6.meter('is_short = 1', 100 * shorts / 900);
      L6.feedback($('svNote'), ordered ? 'ok' : 'bad', ordered
        ? 'The solver first picks is_short (50/50), then a len that fits. Short packets now appear about half the time.'
        : 'All 9 legal combinations are equally likely, and only one of them has is_short = 1. Short packets appear only about 1 time in 9 (11%). Your test barely exercises them.');
      seen[ordered] = 1; if (seen['true'] && seen['false']) L6.mark('solve');
    });
    grid(null);
  }

  /* ---------- randomize() lifecycle ---------- */
  function initLife() {
    var fail = false, pos = 0, seen = {};
    var ok = [
      ['ok = f.randomize() with { len == 4; };', 'call'],
      ['pre_randomize() runs → prints "about to randomize"', 'dim'],
      ['solver: c_len says len in [1:8], inline says len == 4 → len = 4, payload = \'{8\'h3A, 8\'h91, 8\'h07, 8\'hC2}', 'ok'],
      ['post_randomize() runs → crc = 3A ^ 91 ^ 07 ^ C2 = 8\'h6E', 'ok'],
      ['randomize() returns 1 → ok = 1', 'ok']
    ];
    var bad = [
      ['ok = f.randomize() with { len == 12; };', 'call'],
      ['pre_randomize() runs → prints "about to randomize"', 'dim'],
      ['solver: c_len says len in [1:8], inline says len == 12 → NO SOLUTION', 'bad'],
      ['post_randomize() is NOT called; len, payload and crc keep their OLD values', 'bad'],
      ['randomize() returns 0 → ok = 0 → your if (!ok) $fatal(...) catches it', 'bad']
    ];
    function reset() { pos = 0; $('lcLog').innerHTML = '<span class="dim">// Press Step</span>'; $('lcNote').className = 'l6-fb'; }
    L6.buttonGroup($('lcMode'), [['with { len == 4; }', false], ['with { len == 12; }', true]].map(function (o) {
      return { label: o[0], onSelect: function () { fail = o[1]; reset(); } };
    }), { mono: true, select: 0 });
    $('lcStep').addEventListener('click', function () {
      var st = fail ? bad : ok;
      if (pos >= st.length) return;
      if (pos === 0) $('lcLog').innerHTML = '';
      var s = st[pos++];
      $('lcLog').insertAdjacentHTML('beforeend', '<div class="' + (s[1] === 'call' ? '' : s[1]) + '">' + (s[1] === 'call' ? L6.highlight(s[0]) : esc((pos - 1) + '. ' + s[0])) + '</div>');
      if (pos === st.length) {
        L6.feedback($('lcNote'), fail ? 'bad' : 'ok', fail ? 'An inline constraint cannot override a class constraint; both must hold. Here they contradict, so randomization fails.' : 'Inline and class constraints were solved together, then post_randomize() filled in the derived CRC.');
        seen[fail] = 1; if (seen['true'] && seen['false']) L6.mark('lifecycle');
      }
    });
    reset();
  }

  L6.initModule({
    module: 8,
    activities: ['randc', 'playground', 'dist', 'solve', 'lifecycle', 'tryit', 'debug', 'quiz'],
    passMark: 6,
    minActs: 6,
    init: function () { initRandc(); initPlayground(); initDist(); initSolve(); initLife(); },
    tryit: [
      { t: 'Declare a random 8-bit property <code>addr</code> of type bit.', re: [/^randbit\[7:0\]addr;?$/], hint: 'Put <code>rand</code> before the type.', ans: 'rand bit [7:0] addr;' },
      { t: 'Write a constraint block <code>c_range</code> that keeps <code>addr</code> between 16 and 31 inclusive using <code>inside</code>.', re: [/^constraintc_range\{addrinside\{\[16:31\]\};?\}$/, /^constraintc_range\{addrinside\{\[8'h10:8'h1f\]\};?\}$/i], hint: '<code>constraint name { x inside {[lo:hi]}; }</code>', ans: 'constraint c_range { addr inside {[16:31]}; }' },
      { t: 'Randomize object <code>t</code> with an inline constraint that <code>len</code> equals 8, and store the result in <code>ok</code>.', re: [/^ok=t\.randomize\(\)with\{len==8;?\};?$/], hint: '<code>obj.randomize() with { ... }</code>', ans: 'ok = t.randomize() with { len == 8; };' },
      { t: 'Write a constraint expression: if <code>mode</code> is 1 then <code>len</code> is 0.', re: [/^mode->len==0;?$/, /^mode==1->len==0;?$/, /^\(mode==1\)->\(len==0\);?$/], hint: 'Implication uses <code>-&gt;</code>.', ans: 'mode -> len == 0;' },
      { t: 'Make <code>op</code> equal 0 with weight 10 and each of 1 to 3 with weight 30, using dist.', re: [/^opdist\{0:=10,\[1:3\]:=30\};?$/], hint: 'Use <code>:=</code> so each value in the range gets the weight.', ans: 'op dist {0 := 10, [1:3] := 30};' }
    ],
    debug: {
      lines: [
        'class Txn;',
        '  rand bit [7:0] addr;',
        '  rand bit [3:0] len;',
        '       bit [7:0] data;      // payload: must be random each time',
        '  constraint c_addr { addr inside {[0:15]}; }',
        '  constraint c_len  { len > 0; }',
        '  constraint c_high { addr > 100; }',
        'endclass',
        '',
        'module tb;',
        '  initial begin',
        '    Txn t = new();',
        '    t.randomize();',
        '    $display("addr=%0d len=%0d", t.addr, t.len);',
        '  end',
        'endmodule'
      ],
      bugs: {
        4: { id: 'rand', t: '<b>Missing rand.</b> <code>data</code> is meant to be random but has no <code>rand</code> keyword, so randomize() never changes it; it stays 0 forever.' },
        7: { id: 'conf', t: '<b>Conflicting constraints.</b> c_addr keeps addr in 0–15, c_high demands addr &gt; 100. No value satisfies both, so every randomize() call fails.' },
        13: { id: 'chk', t: '<b>Return value ignored.</b> Because of the conflict, randomize() returns 0 and the values never change, but nobody notices. Write <code>if (!t.randomize()) $fatal(1, "randomize failed");</code>.' }
      },
      clean: { 2: 'Correct random property.', 5: 'A valid constraint on its own.', 6: 'len > 0 excludes zero-length transactions: fine.' },
      fix: 'class Txn;\n  rand bit [7:0] addr;\n  rand bit [3:0] len;\n  rand bit [7:0] data;\n  constraint c_addr { addr inside {[0:15]}; }\n  constraint c_len  { len > 0; }\nendclass\n\nmodule tb;\n  initial begin\n    Txn t = new();\n    if (!t.randomize()) $fatal(1, "randomize failed");\n    $display("addr=%0d len=%0d", t.addr, t.len);\n  end\nendmodule'
    },
    quiz: [
      { q: 'What does <code>randc</code> guarantee?', opts: ['Values are never 0', 'All values appear once before any repeats', 'Values increase', 'The same sequence every run'], a: 1, why: 'randc cycles through a random permutation.' },
      { q: 'What does <code>randomize()</code> return when the constraints conflict?', opts: ['1', '0', 'X', 'It stops the simulation'], a: 1, why: 'It returns 0 and leaves variables unchanged.' },
      { q: '<code>x dist {0 := 1, [1:4] := 1}</code>: what is P(x = 0)?', opts: ['50%', '20%', '25%', '0%'], a: 1, why: ':= gives weight 1 to each of 5 values, so 1/5.' },
      { q: '<code>x dist {0 := 1, [1:4] :/ 1}</code>: what is P(x = 0)?', opts: ['50%', '20%', '25%', '80%'], a: 0, why: ':/ divides 1 among 4 values; total weight 2, so 0 has 1/2.' },
      { q: 'What is <code>solve a before b</code> for?', opts: ['Fixing constraint conflicts', 'Changing the probability distribution by choosing a first', 'Making b depend on a\'s old value', 'Speeding up simulation only'], a: 1, why: 'It changes the distribution, not the set of legal solutions.' },
      { q: 'An inline constraint <code>with { len == 20; }</code> and a class constraint <code>len &lt; 10</code>. Result?', opts: ['len = 20', 'len &lt; 10', 'Randomization fails', 'The class constraint is ignored'], a: 2, why: 'Inline constraints are added to class constraints; both must hold.' },
      { q: 'When is <code>post_randomize()</code> called?', opts: ['Before solving', 'After a successful solve', 'Always, even on failure', 'Only if you call it'], a: 1, why: 'Only after randomization succeeds.' },
      { q: 'Which constraint makes <code>addr</code> a multiple of 4?', opts: ['<code>addr / 4 == 0;</code>', '<code>addr % 4 == 0;</code>', '<code>addr inside {4};</code>', '<code>addr == 4 * addr;</code>'], a: 1, why: 'The remainder after dividing by 4 must be 0.' }
    ]
  });
})();
