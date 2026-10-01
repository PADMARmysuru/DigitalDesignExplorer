/* Level 6 – Module 2: Procedural SystemVerilog */
(function () {
  'use strict';
  var $ = L6.$, esc = L6.esc;

  /* ---------- Block classifier ---------- */
  function initClassify() {
    L6.choiceGame($('clsList'), [
      { code: 'if (sel) y = a; else y = b;', a: 'always_comb', why: 'A mux: output depends only on current inputs, every path assigns y.' },
      { code: 'if (!rst_n) cnt <= \'0; else cnt <= cnt + 1\'b1;', a: 'always_ff', why: 'A counter must remember its value between clock edges, so it needs flip-flops.' },
      { code: 'if (gate) q <= d;   // q transparent while gate is high', a: 'always_latch', why: 'Level-sensitive: q follows d while gate is 1 and holds when gate is 0. That is a latch, stated on purpose.' },
      { code: 'sum = a + b; carry = sum[8];', a: 'always_comb', why: 'Pure arithmetic with no memory.' },
      { code: 'state <= next_state;', a: 'always_ff', why: 'The FSM state register updates on the clock edge.' }
    ], ['always_comb', 'always_ff', 'always_latch'], function () { L6.mark('classify'); }, $('clsScore'));
  }

  /* ---------- Blocking vs non-blocking stepper ---------- */
  function initNBA() {
    var blocking = false, inputs = [1, 0, 1, 1, 0], clk, step, vars, pending, history;
    var modes = L6.buttonGroup($('nbaMode'), [
      { label: 'Non-blocking  <=', onSelect: function () { blocking = false; reset(); } },
      { label: 'Blocking  =', onSelect: function () { blocking = true; reset(); } }
    ]);
    function code() {
      var op = blocking ? ' = ' : ' <= ';
      return ['always_ff @(posedge clk) begin', '  b' + op + 'a;', '  c' + op + 'b;', 'end'];
    }
    function reset() {
      clk = 0; step = 0; vars = { a: inputs[0], b: 0, c: 0 }; pending = []; history = [];
      render('Press Step. Input a follows the sequence ' + inputs.join(', ') + ' on successive clocks.');
    }
    function render(msg, kind) {
      var rows = L6.renderLines($('nbaCode'), code());
      if (step === 1 || step === 2) rows[step].classList.add('is-hl');
      var t = '<thead><tr><th>Clock edge</th><th>a</th><th>b</th><th>c</th><th>Scheduled (not yet visible)</th></tr></thead><tbody>';
      history.forEach(function (h) { t += '<tr><td>' + h.clk + '</td><td>' + h.a + '</td><td>' + h.b + '</td><td>' + h.c + '</td><td>–</td></tr>'; });
      t += '<tr style="font-weight:600"><td>' + (clk + 1) + (step ? ' (running)' : ' (next)') + '</td><td>' + vars.a + '</td><td>' + vars.b + '</td><td>' + vars.c + '</td><td>' +
        (pending.length ? pending.map(function (p) { return p.v + ' ← ' + p.val; }).join(', ') : '–') + '</td></tr></tbody>';
      $('nbaTable').innerHTML = t;
      L6.feedback($('nbaNote'), kind || 'info', msg);
    }
    $('nbaStep').addEventListener('click', function () {
      if (clk >= inputs.length) { render('Sequence finished. Press Reset to run again or switch style.', 'info'); return; }
      step++;
      if (step === 1) {
        if (blocking) { vars.b = vars.a; render('<code>b = a</code> runs: b becomes ' + vars.a + ' <b>immediately</b>.'); }
        else { pending.push({ v: 'b', val: vars.a }); render('<code>b &lt;= a</code>: the value of a (' + vars.a + ') is read now, but b keeps its old value for the moment.'); }
      } else if (step === 2) {
        if (blocking) { vars.c = vars.b; render('<code>c = b</code> reads the <b>new</b> b, so c = ' + vars.c + '. The value skipped a whole stage.', 'bad'); }
        else { pending.push({ v: 'c', val: vars.b }); render('<code>c &lt;= b</code> reads the <b>old</b> b (' + vars.b + '). Both updates wait for the end of the time step.'); }
      } else {
        pending.forEach(function (p) { vars[p.v] = p.val; });
        pending = [];
        history.push({ clk: clk + 1, a: vars.a, b: vars.b, c: vars.c });
        clk++; step = 0;
        if (clk < inputs.length) vars.a = inputs[clk];
        var n = history.length;
        var msg = blocking
          ? 'Clock ' + n + ' done. With <code>=</code>, c always equals b: the chain collapsed into <b>one</b> flip-flop stage. Synthesis would build this, not the shift register you wanted.'
          : 'Clock ' + n + ' done. Both flops updated together: c now holds what b had <b>before</b> the edge. That is a real 2-stage shift register.';
        render(msg, blocking ? 'bad' : 'ok');
        if (n >= 2) L6.mark('nba');
      }
    });
    $('nbaReset').addEventListener('click', reset);
    modes[0].click();
  }

  /* ---------- Case matcher ---------- */
  function initCase() {
    var kind = 'casez', mod = '', sel = ['0', '1', '1', '0'];
    var items = ['1???', '01??', '001?', '0001'];
    var cyc = { '0': '1', '1': 'x', 'x': 'z', 'z': '0' };
    var touched = 0;
    L6.buttonGroup($('caseKind'), ['case', 'casez', 'casex'].map(function (k) {
      return { label: k, onSelect: function () { kind = k; draw(); } };
    }), { mono: true, select: 1 });
    L6.buttonGroup($('caseMod'), [['(no modifier)', ''], ['unique', 'unique '], ['priority', 'priority ']].map(function (m) {
      return { label: m[0], onSelect: function () { mod = m[1]; draw(); } };
    }), { mono: true, select: 0 });
    $('caseDef').addEventListener('change', draw);

    function bitMatch(s, it) {
      if (kind === 'case') return s === (it === '?' ? 'z' : it);
      var dcZ = function (c) { return c === 'z' || c === '?'; };
      if (kind === 'casez') return dcZ(s) || dcZ(it) || s === it;
      var dcX = function (c) { return c === 'z' || c === '?' || c === 'x'; };
      return dcX(s) || dcX(it) || s === it;
    }
    function match(it) { for (var i = 0; i < 4; i++) if (!bitMatch(sel[i], it[i])) return false; return true; }

    function draw() {
      var box = $('caseSel');
      box.innerHTML = '';
      sel.forEach(function (v, i) {
        var w = document.createElement('div'); w.className = 'l6-cellwrap';
        var b = document.createElement('button'); b.type = 'button';
        b.className = 'l6-cell v' + v; b.textContent = v.toUpperCase();
        b.setAttribute('aria-label', 'sel[' + (3 - i) + '] = ' + v.toUpperCase());
        b.addEventListener('click', function () { sel[i] = cyc[sel[i]]; touched++; if (touched >= 3) L6.mark('casez'); draw(); });
        w.appendChild(b); w.insertAdjacentHTML('beforeend', '<span class="l6-idx">' + (3 - i) + '</span>');
        box.appendChild(w);
      });
      var def = $('caseDef').checked;
      var lines = [mod + kind + ' (sel)'];
      items.forEach(function (it, i) { lines.push("  4'b" + it + ': y = ' + (3 - i) + ';'); });
      if (def) lines.push("  default: y = 'x;");
      lines.push('endcase');
      var rows = L6.renderLines($('caseCode'), lines);
      var hits = [];
      items.forEach(function (it, i) { if (match(it)) hits.push(i); });
      var msg;
      if (hits.length) {
        rows[hits[0] + 1].classList.add('is-hl');
        msg = 'First match: <code>4\'b' + items[hits[0]] + '</code>, so <b>y = ' + (3 - hits[0]) + '</b>.';
      } else if (def) {
        rows[5].classList.add('is-hl');
        msg = 'No item matches, so the <code>default</code> branch runs.';
      } else {
        msg = 'No item matches and there is no default, so y keeps its old value. In <code>always_comb</code> that means a latch.';
      }
      var hasXZ = sel.some(function (c) { return c === 'x' || c === 'z'; });
      if (kind === 'casex' && sel.indexOf('x') >= 0 && hits.length) msg += ' <b>Warning:</b> the selector contains X, yet casex still matched. This is how casex hides unknowns.';
      if (kind === 'case' && hasXZ) msg += ' Plain <code>case</code> compares X and Z literally, so they match nothing here except the default.';
      var kindFb = 'info';
      if (mod === 'unique ' && hits.length > 1) { msg += '<br><span class="l6-fail">unique case violation:</span> ' + hits.length + ' items match. The tool assumed they never overlap, so simulation and hardware may disagree.'; kindFb = 'bad'; }
      if (mod === 'unique ' && hits.length === 0 && !def) { msg += '<br><span class="l6-fail">unique case violation:</span> no item matched and there is no default.'; kindFb = 'bad'; }
      if (mod === 'priority ' && hits.length === 0 && !def) { msg += '<br><span class="l6-fail">priority case violation:</span> no item matched.'; kindFb = 'bad'; }
      if (mod === 'priority ' && hits.length > 1) msg += '<br>Several items match, which is allowed with <code>priority</code>: the first one wins.';
      L6.feedback($('caseNote'), kindFb, msg);
    }
    draw();
  }

  /* ---------- Loop visualizer ---------- */
  function initLoops() {
    var kind = 'for', opt = 'none', start = 0, trace = [], pos = 0;
    var arr = [5, 8, 2, 9];
    function codeFor() {
      var brk = opt === 'break' ? ['    if (i == 2) break;'] : (opt === 'continue' ? ['    if (i == 1) continue;'] : []);
      switch (kind) {
        case 'for': return ['for (int i = ' + start + '; i < 4; i++) begin'].concat(brk, ['    $display("i = %0d", i);', 'end']);
        case 'while': return ['int i = ' + start + ';', 'while (i < 4) begin', '    i++;'].concat(brk.map(function (l) { return l.replace('i == 2', 'i == 3').replace('i == 1', 'i == 2'); }), ['    $display("i = %0d", i);', 'end']);
        case 'do-while': return ['int i = ' + start + ';', 'do begin', '    i++;'].concat(brk.map(function (l) { return l.replace('i == 2', 'i == 3').replace('i == 1', 'i == 2'); }), ['    $display("i = %0d", i);', 'end while (i < 4);']);
        case 'repeat': return ['int i = 0;', 'repeat (4) begin', '    $display("i = %0d", i);', '    i++;', 'end'];
        case 'foreach': return ["int arr[4] = '{5, 8, 2, 9};", 'foreach (arr[i]) begin'].concat(brk, ['    $display("arr[%0d] = %0d", i, arr[i]);', 'end']);
      }
    }
    function buildTrace() {
      var t = [], i, body = 0;
      var useOpt = kind !== 'repeat' ? opt : 'none';
      function out(s) { t.push({ i: i, body: body, log: s }); }
      if (kind === 'for' || kind === 'foreach') {
        for (i = (kind === 'for' ? start : 0); i < 4; i++) {
          body++;
          if (useOpt === 'break' && i === 2) { out('i == 2 → break: leave the loop now'); break; }
          if (useOpt === 'continue' && i === 1) { out('i == 1 → continue: skip to the next iteration'); continue; }
          out(kind === 'for' ? 'i = ' + i : 'arr[' + i + '] = ' + arr[i]);
        }
        if (kind === 'for' && start >= 4) t.push({ i: start, body: 0, log: 'condition i < 4 is false at the start: body never runs' });
      } else if (kind === 'while' || kind === 'do-while') {
        i = start;
        if (kind === 'while' && !(i < 4)) t.push({ i: i, body: 0, log: 'while checks first: ' + i + ' < 4 is false, body runs 0 times' });
        var first = true;
        while (kind === 'do-while' ? (first || i < 4) : i < 4) {
          first = false;
          i++; body++;
          if (useOpt === 'break' && i === 3) { out('i == 3 → break'); break; }
          if (useOpt === 'continue' && i === 2) { out('i == 2 → continue (skips the $display)'); continue; }
          out('i = ' + i);
        }
        if (kind === 'do-while' && start >= 4) t.push({ i: i, body: body, log: 'do-while ran the body once before checking ' + i + ' < 4' });
      } else {
        for (i = 0; i < 4; i++) { body++; out('i = ' + i); }
        t.push({ i: i, body: body, log: 'repeat (4) runs exactly 4 times; it has no loop variable of its own' });
      }
      t.push({ i: t.length ? t[t.length - 1].i : start, body: body, log: '-- loop finished --', end: true });
      return t;
    }
    function reset() {
      trace = buildTrace(); pos = 0;
      L6.renderLines($('loopCode'), codeFor());
      $('loopLog').innerHTML = '<span class="dim">Output appears here.</span>';
      $('loopI').textContent = '–'; $('loopIter').textContent = '0';
    }
    function step() {
      if (pos >= trace.length) return;
      var e = trace[pos++];
      if (pos === 1) $('loopLog').innerHTML = '';
      $('loopLog').insertAdjacentHTML('beforeend', '<div class="' + (e.end ? 'dim' : (/break|continue|false|once/.test(e.log) ? 'bad' : 'ok')) + '">' + esc(e.log) + '</div>');
      $('loopLog').scrollTop = 1e6;
      $('loopI').textContent = e.i; $('loopIter').textContent = e.body;
      if (e.end) L6.mark('loops');
    }
    L6.buttonGroup($('loopKind'), ['for', 'while', 'do-while', 'repeat', 'foreach'].map(function (k) {
      return { label: k, onSelect: function () { kind = k; reset(); } };
    }), { mono: true, select: 0 });
    L6.buttonGroup($('loopOpt'), [['plain', 'none'], ['with break', 'break'], ['with continue', 'continue']].map(function (o) {
      return { label: o[0], onSelect: function () { opt = o[1]; reset(); } };
    }), { select: 0 });
    L6.buttonGroup($('loopStart'), [['start i = 0', 0], ['start i = 5', 5]].map(function (o) {
      return { label: o[0], onSelect: function () { start = o[1]; reset(); } };
    }), { select: 0 });
    $('loopStep').addEventListener('click', step);
    $('loopRun').addEventListener('click', function () { while (pos < trace.length) step(); });
    $('loopReset').addEventListener('click', reset);
    reset();
  }

  /* ---------- Latch detector ---------- */
  function initLatch() {
    L6.choiceGame($('latchList'), [
      { code: 'always_comb\n  if (en) y = a;\n  else    y = b;', a: 'No latch', why: 'Both branches assign y.' },
      { code: 'always_comb\n  case (s)\n    2\'d0: y = a;\n    2\'d1: y = b;\n  endcase', a: 'Latch', why: 's = 2 and s = 3 leave y unassigned, so y must hold its old value.' },
      { code: 'always_comb begin\n  y = \'0;\n  if (en) y = a;\nend', a: 'No latch', why: 'The default assignment at the top covers every path.' },
      { code: 'always_comb begin\n  if (en) begin y = a; z = b; end\n  else y = \'0;\nend', a: 'Latch', why: 'z is not assigned when en is 0. Every variable needs a value on every path, not just y.' }
    ], ['Latch', 'No latch'], function () { L6.mark('latch'); }, $('latchScore'));
  }

  L6.initModule({
    module: 2,
    activities: ['classify', 'nba', 'casez', 'loops', 'latch', 'tryit', 'debug', 'quiz'],
    passMark: 6,
    minActs: 6,
    init: function () { initClassify(); initNBA(); initCase(); initLoops(); initLatch(); },
    tryit: [
      { t: 'Write a flip-flop: on the rising edge of <code>clk</code>, <code>q</code> takes <code>d</code>. Active-low async reset <code>rst_n</code> clears <code>q</code> to 0.', multi: 4,
        re: [/^always_ff@\(posedgeclk(or|,)negedgerst_n\)(begin)?if\(!rst_n\)q<=('0|1'b0|0|'b0|1'd0);?elseq<=d;?(end)?$/],
        hint: 'Start with <code>always_ff @(posedge clk or negedge rst_n)</code>, then an if/else using <code>&lt;=</code>.',
        ans: "always_ff @(posedge clk or negedge rst_n)\n  if (!rst_n) q <= '0;\n  else        q <= d;" },
      { t: 'Write a combinational block that sets <code>y</code> to <code>a &amp; b</code>.',
        re: [/^always_comb(begin)?y=a&b;?(end)?$/, /^always_comb(begin)?y=b&a;?(end)?$/],
        hint: 'Use <code>always_comb</code> with a blocking assignment.', ans: 'always_comb y = a & b;' },
      { t: 'Write the first line of a case on <code>sel</code> that promises the items never overlap and one always matches.',
        re: [/^uniquecase\(sel\)$/], hint: 'Put a modifier keyword before <code>case</code>.', ans: 'unique case (sel)' },
      { t: 'Write the header of a loop that visits every index <code>i</code> of array <code>data</code>.',
        re: [/^foreach\(data\[i\]\)(begin)?$/], hint: 'This loop type needs no bounds.', ans: 'foreach (data[i])' },
      { t: 'In a testbench, wait for 8 rising edges of <code>clk</code> in one line.',
        re: [/^repeat\(8\)@\(posedgeclk\);?$/], hint: 'Combine <code>repeat (n)</code> with an event control.', ans: 'repeat (8) @(posedge clk);' }
    ],
    debug: {
      lines: [
        'module mux_reg (',
        '  input  logic       clk, rst_n, sel,',
        '  input  logic [7:0] a, b,',
        '  output logic [7:0] q',
        ');',
        '  logic [7:0] m;',
        '  always_comb',
        '    if (sel) m = a;',
        '  always_ff @(posedge clk or negedge rst_n)',
        "    if (!rst_n) q = '0;",
        '    else        q = m;',
        '  always_ff @(posedge clk)',
        '    m <= b;',
        'endmodule'
      ],
      bugs: {
        8: { id: 'latch', t: '<b>Latch:</b> when <code>sel</code> is 0, <code>m</code> is not assigned, so it must hold its value. Add <code>else m = b;</code>.' },
        10: { id: 'block', t: '<b>Blocking assignment in always_ff.</b> Flip-flops should use <code>&lt;=</code>, otherwise other blocks reading <code>q</code> at the same edge can see the new value (a race).' },
        11: { id: 'block', t: '<b>Blocking assignment in always_ff.</b> Use <code>q &lt;= m;</code>.' },
        12: { id: 'multi', t: '<b>Two blocks drive m.</b> <code>m</code> is already written by the <code>always_comb</code>. A variable written in <code>always_comb</code> or <code>always_ff</code> may have only that one driver, so this is a compile error.' },
        13: { id: 'multi', t: '<b>Two blocks drive m.</b> Remove this block; the mux already produces <code>m</code>.' }
      },
      clean: { 6: 'Declaring the internal signal as logic is correct.', 7: 'always_comb is the right block for a mux. The problem is inside it.', 9: 'Correct flip-flop header with async active-low reset.' },
      fix: "module mux_reg (\n  input  logic       clk, rst_n, sel,\n  input  logic [7:0] a, b,\n  output logic [7:0] q\n);\n  logic [7:0] m;\n  always_comb\n    if (sel) m = a;\n    else     m = b;\n  always_ff @(posedge clk or negedge rst_n)\n    if (!rst_n) q <= '0;\n    else        q <= m;\nendmodule"
    },
    quiz: [
      { q: 'Which block automatically includes every signal it reads in its sensitivity list?', opts: ['<code>always_ff</code>', '<code>always_comb</code>', '<code>initial</code>', '<code>always @(posedge clk)</code>'], a: 1, why: '<code>always_comb</code> infers its sensitivity from everything read inside it (and from functions it calls).' },
      { q: 'With <code>a=1, b=0, c=0</code>, what is c after one clock of <code>b = a; c = b;</code> in an always_ff?', opts: ['0', '1', 'X', 'It depends on the simulator'], a: 1, why: 'Blocking assignments update immediately, so c reads the new b, which is 1.' },
      { q: 'Same values, but with <code>b &lt;= a; c &lt;= b;</code>. What is c after one clock?', opts: ['0', '1', 'X', 'Z'], a: 0, why: 'Non-blocking: c gets the old b (0). The two updates happen together at the end of the time step.' },
      { q: 'In a <code>casez</code>, what does <code>?</code> in an item mean?', opts: ['Unknown value X', 'Don\'t care (same as Z)', 'Match only 0', 'Syntax error'], a: 1, why: 'In casez, <code>?</code> is another way to write z, which is treated as don\'t-care.' },
      { q: 'Why is <code>casex</code> discouraged in RTL?', opts: ['It is not synthesizable', 'An X on the selector can match an item and hide a bug', 'It is slower in hardware', 'It cannot have a default'], a: 1, why: 'casex treats X on the selector as don\'t-care, so unknowns are silently absorbed.' },
      { q: 'What does <code>unique case</code> tell the tools?', opts: ['Evaluate items in order', 'Items are mutually exclusive and one always matches', 'Each item must be a constant', 'The case is inside a loop'], a: 1, why: 'Simulation warns when two items match or none match; synthesis can build parallel logic.' },
      { q: 'How many times does the body run? <code>int i = 7; do i++; while (i &lt; 4);</code>', opts: ['0', '1', '4', 'Forever'], a: 1, why: 'A do-while always runs once before checking its condition.' },
      { q: 'Which code infers a latch?', opts: ['<code>always_comb y = a | b;</code>', '<code>always_comb if (en) y = a;</code>', '<code>always_ff @(posedge clk) y &lt;= a;</code>', '<code>assign y = en ? a : b;</code>'], a: 1, why: 'When en is 0 nothing assigns y, so it must remember its value.' }
    ]
  });
})();
