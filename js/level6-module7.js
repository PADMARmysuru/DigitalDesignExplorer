/* Level 6 – Module 7: SystemVerilog Assertions */
(function () {
  'use strict';
  var $ = L6.$, esc = L6.esc;
  var N = 10;

  /* ---------- |-> vs |=> demo ---------- */
  function initImpl() {
    var req = [0, 1, 0, 0, 1, 0, 0, 0], ack = [0, 1, 0, 0, 0, 1, 0, 0], seen = {};
    function draw(op) {
      L6.setCode('imCode', 'assert property (@(posedge clk) req ' + op + ' ack);');
      var marks = [], off = op === '|->' ? 0 : 1, msgs = [];
      [1, 4].forEach(function (s) {
        var c = s + off, ok = ack[c] === 1;
        marks.push({ cycle: c, kind: ok ? 'pass' : 'fail' });
        msgs.push('req at cycle ' + s + ' → ack checked at cycle ' + c + ': ' + (ok ? '<span class="l6-pass">PASS</span>' : '<span class="l6-fail">FAIL</span> (ack is 0)'));
      });
      L6.wave($('imWave'), { cycles: 8, marks: marks, signals: [{ name: 'clk', kind: 'clk' }, { name: 'req', kind: 'bit', vals: req }, { name: 'ack', kind: 'bit', vals: ack }] });
      L6.feedback($('imNote'), 'info', (op === '|->' ? '<b>Overlapping</b>: the consequent is checked at the <b>same</b> edge as the antecedent.<br>' : '<b>Non-overlapping</b>: the consequent is checked one edge <b>later</b>.<br>') + msgs.join('<br>') +
        '<br>Same waveform, opposite results. Choosing the wrong operator is one of the most common assertion bugs.');
      seen[op] = 1; if (seen['|->'] && seen['|=>']) L6.mark('impl');
    }
    L6.buttonGroup($('imOp'), ['|->', '|=>'].map(function (o) { return { label: o, onSelect: function () { draw(o); } }; }), { mono: true, select: 0 });
  }

  /* ---------- Sampled value lab ---------- */
  function initSampled() {
    var a = [0, 1, 1, 0, 0, 1, 0, 1, 1, 1], edits = 0;
    function draw() {
      var prev = function (i) { return i === 0 ? 0 : a[i - 1]; };
      var rose = a.map(function (v, i) { return v === 1 && prev(i) === 0 ? 1 : 0; });
      var fell = a.map(function (v, i) { return v === 0 && prev(i) === 1 ? 1 : 0; });
      var stab = a.map(function (v, i) { return v === prev(i) ? 1 : 0; });
      var chg = stab.map(function (v) { return 1 - v; });
      var past = a.map(function (v, i) { return prev(i); });
      L6.wave($('svWave'), {
        cycles: N, signals: [
          { name: 'clk', kind: 'clk' },
          { name: 'a (click)', kind: 'bit', vals: a, edit: function (c) { a[c] = 1 - a[c]; edits++; if (edits >= 3) L6.mark('sampled'); draw(); } },
          { name: '$past(a)', kind: 'bit', vals: past },
          { name: '$rose(a)', kind: 'bit', vals: rose },
          { name: '$fell(a)', kind: 'bit', vals: fell },
          { name: '$stable(a)', kind: 'bit', vals: stab },
          { name: '$changed(a)', kind: 'bit', vals: chg }
        ]
      });
      L6.feedback($('svNote'), 'info', '$past(a) is simply a delayed by one clock. $rose is 1 for exactly one cycle when a goes 0→1, even if a then stays high. A signal held at 1 is <b>stable</b>, not rising.');
    }
    draw();
  }

  /* ---------- Assertion checker engine ---------- */
  function att(start, end, status, why) { return { start: start, end: end, status: status, why: why }; }
  var PROPS = [
    {
      id: 'hs', label: 'Handshake', code: 'assert property (@(posedge clk)\n  req |-> ##[1:3] ack);',
      desc: 'Every request must be acknowledged 1 to 3 cycles later.',
      sigs: [{ n: 'req' }, { n: 'ack' }],
      scen: {
        'A: ack after 2': { req: [0, 1, 0, 0, 0, 0, 1, 0, 0, 0], ack: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0] },
        'B: ack too late': { req: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0], ack: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0] },
        'C: ack same cycle': { req: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0], ack: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0] }
      },
      ev: function (S) {
        var r = [];
        for (var i = 0; i < N; i++) if (S.req[i]) {
          var hit = -1;
          for (var j = i + 1; j <= i + 3 && j < N; j++) if (S.ack[j]) { hit = j; break; }
          if (hit >= 0) r.push(att(i, hit, 'pass', 'req at ' + i + ', ack found at ' + hit + ' (' + (hit - i) + ' cycle' + (hit - i > 1 ? 's' : '') + ' later, inside ##[1:3]).'));
          else if (i + 3 >= N) r.push(att(i, N - 1, 'pend', 'req at ' + i + ': the window ends after the simulation stops, so the result is unknown (reported as incomplete).'));
          else r.push(att(i, i + 3, 'fail', 'req at ' + i + ', but ack is 0 at cycles ' + (i + 1) + ', ' + (i + 2) + ' and ' + (i + 3) + '.' + (S.ack[i] ? ' The ack in the same cycle as req does not count: ##[1:3] starts one cycle later.' : '')));
        }
        return r;
      }
    },
    {
      id: 'next', label: 'Grant next cycle', code: 'assert property (@(posedge clk)\n  req |=> gnt);',
      desc: 'A grant must follow exactly one cycle after each request.',
      sigs: [{ n: 'req' }, { n: 'gnt' }],
      scen: {
        'A: gnt next cycle': { req: [0, 1, 0, 1, 0, 0, 0, 0, 0, 0], gnt: [0, 0, 1, 0, 1, 0, 0, 0, 0, 0] },
        'B: gnt too early': { req: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0], gnt: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0] }
      },
      ev: function (S) {
        var r = [];
        for (var i = 0; i < N; i++) if (S.req[i]) {
          if (i + 1 >= N) r.push(att(i, i, 'pend', 'req at the last cycle: no next cycle to check.'));
          else if (S.gnt[i + 1]) r.push(att(i, i + 1, 'pass', 'req at ' + i + ', gnt = 1 at ' + (i + 1) + '.'));
          else r.push(att(i, i + 1, 'fail', 'req at ' + i + ', but gnt = 0 at ' + (i + 1) + '.' + (S.gnt[i] ? ' gnt came in the same cycle: |=> checks the NEXT cycle.' : '')));
        }
        return r;
      }
    },
    {
      id: 'rose', label: 'FSM start/busy', code: 'assert property (@(posedge clk)\n  $rose(start) |-> busy);',
      desc: 'When start goes high, the FSM must be busy in the same cycle.',
      sigs: [{ n: 'start' }, { n: 'busy' }],
      scen: {
        'A: busy immediately': { start: [0, 1, 1, 1, 0, 0, 0, 0, 0, 0], busy: [0, 1, 1, 1, 1, 0, 0, 0, 0, 0] },
        'B: busy one cycle late': { start: [0, 0, 0, 1, 1, 0, 0, 0, 0, 0], busy: [0, 0, 0, 0, 1, 1, 0, 0, 0, 0] }
      },
      ev: function (S) {
        var r = [];
        for (var i = 0; i < N; i++) {
          var prev = i ? S.start[i - 1] : 0;
          if (S.start[i] && !prev) r.push(S.busy[i] ? att(i, i, 'pass', 'start rose at ' + i + ' and busy = 1 at ' + i + '.') : att(i, i, 'fail', 'start rose at ' + i + ' but busy = 0 at the same edge.'));
        }
        return r;
      }
    },
    {
      id: 'stable', label: 'Handshake data stable', code: 'assert property (@(posedge clk)\n  valid && !ready |=> valid && $stable(data));',
      desc: 'While the receiver is not ready, the sender must keep valid high and data unchanged.',
      sigs: [{ n: 'valid' }, { n: 'ready' }, { n: 'data', bus: ['A', 'B', 'C', 'D'] }],
      scen: {
        'A: held correctly': { valid: [0, 1, 1, 1, 0, 1, 1, 0, 0, 0], ready: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0], data: ['A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B'] },
        'B: data changes early': { valid: [0, 1, 1, 1, 0, 0, 0, 0, 0, 0], ready: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0], data: ['A', 'A', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C'] },
        'C: valid dropped': { valid: [0, 1, 0, 1, 1, 0, 0, 0, 0, 0], ready: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0], data: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'] }
      },
      ev: function (S) {
        var r = [];
        for (var i = 0; i < N; i++) if (S.valid[i] && !S.ready[i]) {
          if (i + 1 >= N) { r.push(att(i, i, 'pend', 'waiting at the last cycle.')); continue; }
          var v = S.valid[i + 1], st = S.data[i + 1] === S.data[i];
          if (v && st) r.push(att(i, i + 1, 'pass', 'valid && !ready at ' + i + '; at ' + (i + 1) + ' valid is still 1 and data is still ' + S.data[i] + '.'));
          else r.push(att(i, i + 1, 'fail', 'valid && !ready at ' + i + '; at ' + (i + 1) + ' ' + (!v ? 'valid dropped to 0 before the transfer completed.' : 'data changed from ' + S.data[i] + ' to ' + S.data[i + 1] + ' while the receiver was waiting.')));
        }
        return r;
      }
    },
    {
      id: 'cnt', label: 'Counter + disable iff', code: 'assert property (@(posedge clk) disable iff (!rst_n)\n  en |=> count == $past(count) + 1);',
      desc: 'When enabled, a 3-bit counter increases by exactly 1 (wrapping 7 → 0). Checks are abandoned during reset.',
      sigs: [{ n: 'rst_n' }, { n: 'en' }, { n: 'count', bus: [0, 1, 2, 3, 4, 5, 6, 7] }],
      scen: {
        'A: counts correctly': { rst_n: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1], en: [0, 1, 1, 1, 0, 0, 1, 1, 0, 0], count: [0, 0, 1, 2, 3, 3, 3, 4, 5, 5] },
        'B: skips a value': { rst_n: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1], en: [0, 1, 1, 1, 0, 0, 0, 0, 0, 0], count: [0, 0, 1, 3, 4, 4, 4, 4, 4, 4] },
        'C: reset in the middle': { rst_n: [0, 1, 1, 1, 0, 1, 1, 1, 1, 1], en: [0, 1, 1, 1, 1, 1, 1, 1, 1, 0], count: [0, 0, 1, 2, 0, 0, 1, 2, 3, 4] }
      },
      ev: function (S) {
        var r = [];
        for (var i = 0; i < N; i++) if (S.en[i]) {
          if (!S.rst_n[i]) { r.push(att(i, i, 'dis', 'en at ' + i + ' but rst_n = 0: disable iff is true, so no check.')); continue; }
          if (i + 1 >= N) { r.push(att(i, i, 'pend', 'en at the last cycle: nothing to compare yet.')); continue; }
          if (!S.rst_n[i + 1]) { r.push(att(i, i + 1, 'dis', 'check started at ' + i + ', but reset asserted at ' + (i + 1) + ': the attempt is abandoned, not failed.')); continue; }
          var exp = (S.count[i] + 1) % 8;
          if (S.count[i + 1] === exp) r.push(att(i, i + 1, 'pass', '$past(count) = ' + S.count[i] + ', count = ' + S.count[i + 1] + ' at ' + (i + 1) + '.'));
          else r.push(att(i, i + 1, 'fail', 'expected ' + S.count[i] + ' + 1 = ' + exp + ' at cycle ' + (i + 1) + ', but count = ' + S.count[i + 1] + '.'));
        }
        return r;
      }
    },
    {
      id: 'fifo', label: 'FIFO overflow', code: 'assert property (@(posedge clk)\n  full |-> !wr_en);',
      desc: 'Nobody may write into a full FIFO.',
      sigs: [{ n: 'full' }, { n: 'wr_en' }],
      scen: {
        'A: writes wait': { full: [0, 0, 1, 1, 0, 0, 1, 0, 0, 0], wr_en: [1, 1, 0, 0, 1, 1, 0, 1, 0, 0] },
        'B: write when full': { full: [0, 0, 1, 1, 0, 0, 0, 0, 0, 0], wr_en: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0] }
      },
      ev: function (S) {
        var r = [];
        for (var i = 0; i < N; i++) if (S.full[i]) r.push(S.wr_en[i] ? att(i, i, 'fail', 'full = 1 and wr_en = 1 at ' + i + ': data would be lost.') : att(i, i, 'pass', 'full at ' + i + ', no write.'));
        return r;
      }
    },
    {
      id: 'fell', label: 'FSM done', code: 'assert property (@(posedge clk)\n  $fell(busy) |-> done);',
      desc: 'The cycle busy goes low, done must pulse.',
      sigs: [{ n: 'busy' }, { n: 'done' }],
      scen: {
        'A: done on time': { busy: [0, 1, 1, 1, 0, 0, 1, 1, 0, 0], done: [0, 0, 0, 0, 1, 0, 0, 0, 1, 0] },
        'B: done late': { busy: [0, 1, 1, 1, 0, 0, 1, 1, 0, 0], done: [0, 0, 0, 0, 0, 1, 0, 0, 1, 0] }
      },
      ev: function (S) {
        var r = [];
        for (var i = 1; i < N; i++) if (S.busy[i - 1] && !S.busy[i]) r.push(S.done[i] ? att(i, i, 'pass', 'busy fell at ' + i + ' and done = 1.') : att(i, i, 'fail', 'busy fell at ' + i + ' but done = 0 in that cycle.'));
        return r;
      }
    }
  ];

  function initChecker() {
    var prop, S, results = null, hl = null, checked = {}, preds = 0, predOk = 0;
    var propBtns = L6.buttonGroup($('acProps'), PROPS.map(function (p) {
      return { label: p.label, onSelect: function () { selectProp(p); } };
    }));
    function selectProp(p) {
      prop = p;
      L6.setCode('acCode', p.code);
      $('acDesc').textContent = p.desc;
      $('acScen').innerHTML = '';
      var keys = Object.keys(p.scen);
      L6.buttonGroup($('acScen'), keys.map(function (k) { return { label: k, onSelect: function () { loadScen(k); } }; }), { select: 0 });
    }
    function loadScen(k) { S = JSON.parse(JSON.stringify(prop.scen[k])); clearResults(); draw(); }
    function clearResults() { results = null; hl = null; $('acVerdict').innerHTML = ''; $('acList').innerHTML = ''; }
    function draw() {
      var sigs = [{ name: 'clk', kind: 'clk' }];
      prop.sigs.forEach(function (sg) {
        sigs.push({
          name: sg.n, kind: sg.bus ? 'bus' : 'bit', vals: S[sg.n],
          edit: function (c) {
            if (sg.bus) { var o = sg.bus, i = o.indexOf(S[sg.n][c]); S[sg.n][c] = o[(i + 1) % o.length]; }
            else S[sg.n][c] = 1 - S[sg.n][c];
            clearResults(); draw();
          }
        });
      });
      var marks = null;
      if (results) {
        var byC = {};
        results.forEach(function (r) {
          var cur = byC[r.end], rank = { fail: 3, pend: 2, pass: 1, dis: 0 };
          if (!cur || rank[r.status] > rank[cur.kind]) byC[r.end] = { cycle: r.end, kind: r.status };
        });
        marks = Object.keys(byC).map(function (k) { return byC[k]; });
      }
      L6.wave($('acWave'), { cycles: N, signals: sigs, marks: marks || [], hl: hl });
    }
    function run(pred) {
      results = prop.ev(S);
      var fails = results.filter(function (r) { return r.status === 'fail'; }).length;
      var passes = results.filter(function (r) { return r.status === 'pass'; }).length;
      var verdict = fails ? 'FAIL' : 'PASS';
      var head = '<div class="l6-verdict ' + (fails ? 'fail' : 'pass') + '">' + (fails ? 'FAIL ✗ ' : 'PASS ✓ ') + ' ' + fails + ' failed, ' + passes + ' passed' +
        (results.length === 0 ? ' (antecedent never true: vacuous pass)' : '') + '</div>';
      if (pred) {
        preds++;
        var ok = pred === verdict;
        if (ok) predOk++;
        head = '<div class="l6-fb is-show ' + (ok ? 'is-ok' : 'is-bad') + '">' + (ok ? 'Your prediction was right.' : 'Your prediction was ' + pred + ', but the assertion ' + (fails ? 'fails' : 'passes') + '. Read the attempts below to see why.') + '</div>' + head;
        $('acScore').textContent = 'Predictions: ' + predOk + ' correct out of ' + preds;
        if (predOk >= 5) L6.mark('predict');
      }
      $('acVerdict').innerHTML = head;
      var icon = { pass: '✓', fail: '✗', pend: '…', dis: '⊘' }, word = { pass: 'PASS', fail: 'FAIL', pend: 'INCOMPLETE', dis: 'DISABLED' };
      $('acList').innerHTML = results.length ? '<p class="l6-label">Attempts (click one to highlight its cycles)</p>' + results.map(function (r, i) {
        return '<div class="l6-choice" role="button" tabindex="0" data-i="' + i + '" style="cursor:pointer;margin:6px 0"><b class="' + (r.status === 'fail' ? 'l6-fail' : (r.status === 'pass' ? 'l6-pass' : '')) + '">' + icon[r.status] + ' ' + word[r.status] + '</b> cycles ' + r.start + (r.end !== r.start ? '–' + r.end : '') + ': ' + esc(r.why) + '</div>';
      }).join('') : '<p>The antecedent was never true, so nothing was checked. A <code>cover property</code> would reveal that this scenario never exercised the rule.</p>';
      $('acList').querySelectorAll('[data-i]').forEach(function (el) {
        el.addEventListener('click', function () { var r = results[+el.dataset.i]; hl = [r.start, r.end]; draw(); });
      });
      draw();
      checked[prop.id] = 1;
      if (Object.keys(checked).length >= 4) L6.mark('checker');
    }
    $('acRun').addEventListener('click', function () { run(null); });
    $('acPredPass').addEventListener('click', function () { run('PASS'); });
    $('acPredFail').addEventListener('click', function () { run('FAIL'); });
    propBtns[0].click();
  }

  L6.initModule({
    module: 7,
    activities: ['impl', 'sampled', 'checker', 'predict', 'tryit', 'debug', 'quiz'],
    passMark: 6,
    minActs: 5,
    init: function () { initImpl(); initSampled(); initChecker(); },
    tryit: [
      { t: 'Write an immediate assertion that <code>count</code> is less than 10.', re: [/^assert\(count<10\);?$/, /^assert\(count<=9\);?$/], hint: 'Immediate assertions look like <code>assert (expression);</code>.', ans: 'assert (count < 10);' },
      { t: 'Write a concurrent assertion: on every rising edge of <code>clk</code>, if <code>req</code> is high then <code>gnt</code> must be high in the next cycle.', re: [/^assertproperty\(@\(posedgeclk\)req\|=>gnt\);?$/, /^assertproperty\(@\(posedgeclk\)req\|->##1gnt\);?$/], hint: 'Use the non-overlapping implication.', ans: 'assert property (@(posedge clk) req |=> gnt);' },
      { t: 'Write a property expression (no assert) that says: when <code>start</code> rises, <code>done</code> follows within 1 to 4 cycles.', re: [/^\$rose\(start\)\|->##\[1:4\]done;?$/], hint: 'Use <code>$rose</code>, <code>|-&gt;</code> and a range delay.', ans: '$rose(start) |-> ##[1:4] done' },
      { t: 'Write the clocking and reset part of a property: rising edge of <code>clk</code>, disabled while <code>rst_n</code> is low.', re: [/^@\(posedgeclk\)disableiff\(!rst_n\)$/, /^@\(posedgeclk\)disableiff\(rst_n==0\)$/, /^@\(posedgeclk\)disableiff\(~rst_n\)$/], hint: '<code>@(...) disable iff (...)</code>', ans: '@(posedge clk) disable iff (!rst_n)' },
      { t: 'Write an expression that is true when <code>data</code> is the same as one clock earlier, using <code>$past</code>.', re: [/^data==\$past\(data\);?$/, /^\$past\(data\)==data;?$/], hint: '<code>$past(x)</code> returns the previous sampled value.', ans: 'data == $past(data)' }
    ],
    debug: {
      lines: [
        'module fifo_sva (input logic clk, rst_n, wr_en, rd_en, full, empty);',
        '  // No write when full',
        '  property p_no_overflow;',
        '    @(posedge clk) disable iff (!rst_n)',
        '      full |-> !wr_en;',
        '  endproperty',
        '  a_no_overflow: assert property (p_no_overflow);',
        '',
        '  // Right after reset, the FIFO must be empty',
        '  a_reset: assert property (@(posedge clk) $rose(rst_n) |-> empty)',
        '',
        '  // No read when empty (in the same cycle)',
        '  a_no_underflow: assert property (@(posedge clk) empty |=> !rd_en);',
        '',
        '  // full and empty are never both high',
        '  assert (full && empty);',
        'endmodule'
      ],
      bugs: {
        10: { id: 'semi', t: '<b>Missing semicolon.</b> An assert property statement ends with <code>;</code> (or an else clause). This is a syntax error.' },
        13: { id: 'op', t: '<b>Wrong implication.</b> The rule is about the same cycle, so it needs <code>|-&gt;</code>. With <code>|=&gt;</code> it checks rd_en one cycle after empty, which catches the wrong thing and misses real underflows.' },
        16: { id: 'imm', t: '<b>Two problems in one line.</b> An immediate assertion must be inside procedural code, and the condition is inverted: it asserts that full and empty ARE both high. Write <code>a_full_empty: assert property (@(posedge clk) !(full &amp;&amp; empty));</code>.' }
      },
      clean: { 4: 'Clock and reset handling are correct.', 5: 'The overflow rule is right.', 7: 'Asserting a named property is good style.' },
      fix: "module fifo_sva (input logic clk, rst_n, wr_en, rd_en, full, empty);\n  property p_no_overflow;\n    @(posedge clk) disable iff (!rst_n)\n      full |-> !wr_en;\n  endproperty\n  a_no_overflow: assert property (p_no_overflow);\n\n  a_reset: assert property (@(posedge clk) $rose(rst_n) |-> empty);\n\n  a_no_underflow: assert property (@(posedge clk) empty |-> !rd_en);\n\n  a_full_empty: assert property (@(posedge clk) !(full && empty));\nendmodule"
    },
    quiz: [
      { q: 'When is a concurrent assertion evaluated?', opts: ['Whenever any signal changes', 'At each occurrence of its clocking event', 'Only at time 0', 'Only when $error is called'], a: 1, why: 'Concurrent assertions are sampled on their clock.' },
      { q: '<code>a |-&gt; b</code>: when is b checked?', opts: ['At the same clock edge as a', 'At the next edge', 'At any later edge', 'Before a'], a: 0, why: 'Overlapping implication.' },
      { q: '<code>req |-&gt; ##[1:3] ack</code>: req at cycle 4, ack only at cycle 8. Result?', opts: ['PASS', 'FAIL at cycle 7', 'FAIL at cycle 8', 'Vacuous'], a: 1, why: 'The window is cycles 5–7. No ack there, so it fails at 7.' },
      { q: 'A signal is 0,1,1,1. At which cycle is <code>$rose</code> true?', opts: ['Cycles 1, 2 and 3', 'Cycle 1 only', 'Cycle 3 only', 'Never'], a: 1, why: '$rose is true only on the 0→1 transition.' },
      { q: 'What does <code>$past(x)</code> return?', opts: ['The first value of x', 'x at the previous clock edge', 'x one time unit earlier', 'The average of x'], a: 1, why: 'By default one clock cycle back.' },
      { q: 'What happens to an attempt when its <code>disable iff</code> condition becomes true?', opts: ['It fails', 'It passes', 'It is abandoned (disabled)', 'It restarts'], a: 2, why: 'Disabled attempts are neither pass nor fail.' },
      { q: 'An assertion never fails in any test. What should you check?', opts: ['Nothing: the design is correct', 'That the antecedent actually occurred, using cover', 'The simulator version', 'Whether it uses |=>'], a: 1, why: 'It may be vacuously true because the antecedent never happened.' },
      { q: 'Where can an immediate assertion be written?', opts: ['Only inside procedural code', 'Only at module level', 'Only in interfaces', 'Only inside classes'], a: 0, why: 'Immediate assertions are procedural statements.' }
    ]
  });
})();
