/* Level 6 – Module 4: Functions and Tasks */
(function () {
  'use strict';
  var $ = L6.$, esc = L6.esc;

  /* ---------- Timeline ---------- */
  function initTimeline() {
    var t = 0, calls = 0, used = {}, bits = [1, 0, 1, 0, 0, 1, 0, 1]; // 8'hA5 LSB first
    var logEl = $('tlLog');
    function log(s, cls) { if (!calls) logEl.innerHTML = ''; logEl.insertAdjacentHTML('beforeend', '<div class="' + (cls || '') + '">' + s + '</div>'); logEl.scrollTop = 1e6; }
    function show(wave) {
      $('tlTime').textContent = t + ' ns'; $('tlCalls').textContent = calls;
      if (wave) L6.wave($('tlWave'), { cycles: 8, signals: [{ name: 'clk', kind: 'clk' }, { name: 'tx', kind: 'bit', vals: bits }] });
    }
    $('tlFunc').addEventListener('click', function () {
      log('<span class="dim">[' + t + ' ns]</span> p = parity(8\'hA5) → p = 0 <span class="ok">(returned at ' + t + ' ns: no time passed)</span>');
      calls++; used.f = 1; show(false); if (used.f && used.t) L6.mark('timeline');
    });
    $('tlTask').addEventListener('click', function () {
      var t0 = t; t += 80;
      log('<span class="dim">[' + t0 + ' ns]</span> send_byte(8\'hA5) starts, waits for 8 clock edges…');
      log('<span class="dim">[' + t + ' ns]</span> send_byte returns <span class="bad">(80 ns of simulation time passed)</span>');
      calls++; used.t = 1; show(true); if (used.f && used.t) L6.mark('timeline');
    });
    $('tlReset').addEventListener('click', function () { t = 0; calls = 0; show(false); $('tlWave').innerHTML = ''; logEl.innerHTML = '<span class="dim">// Click a call</span>'; });
    logEl.innerHTML = '<span class="dim">// Click a call</span>';
    show(false);
  }

  /* ---------- Function or task ---------- */
  function initFT() {
    L6.choiceGame($('ftList'), [
      { q: 'Compute the CRC of a packet stored in an array.', a: 'Function', why: 'Pure calculation, no waiting.' },
      { q: 'Drive a write on the bus: set address and data, wait for <code>ready</code>, then release.', a: 'Task', why: 'Waiting for ready consumes time.' },
      { q: 'Convert an opcode enum to a printable string.', a: 'Function', why: 'Zero-time conversion; can even be used inside $display.' },
      { q: 'Apply reset for 5 clock cycles.', a: 'Task', why: 'Needs <code>repeat (5) @(posedge clk)</code>.' },
      { q: 'Predict the ALU result for given operands in the reference model.', a: 'Function', why: 'A reference model computes expected values instantly.' }
    ], ['Function', 'Task'], function () { L6.mark('fortask'); }, $('ftScore'));
  }

  /* ---------- Argument directions ---------- */
  function initArgs() {
    var dir = 'input', step = 0, rows = [];
    var scen = {
      input: { x0: 1, v: [1, 1, 1, 1, 1], note: 'input copies v into x at the call. The task only changes its private copy, so v stays 1.' },
      output: { x0: 0, v: [1, 1, 1, 1, 20], note: 'output does NOT copy in: x starts at 0 (the default for int). v receives the final x (20) only when the task returns at 5 ns.' },
      inout: { x0: 1, v: [1, 1, 1, 1, 22], note: 'inout copies in (1) and copies out (22) at the end. Process B at 2 ns still sees the old value 1.' },
      ref: { x0: 1, v: [1, 11, 11, 22, 22], note: 'ref makes x another name for v. Every change is visible at once: process B sees 11 at 2 ns, before bump has finished.' }
    };
    var events = [
      { t: 0, what: 'bump(v) called' },
      { t: 0, what: 'x = x + 10' },
      { t: 2, what: 'process B reads v' },
      { t: 5, what: 'x = x * 2' },
      { t: 5, what: 'bump returns' }
    ];
    function xs(d) { var x0 = scen[d].x0; return [x0, x0 + 10, x0 + 10, (x0 + 10) * 2, '(gone)']; }
    L6.buttonGroup($('argDir'), ['input', 'output', 'inout', 'ref'].map(function (d) {
      return { label: d, onSelect: function () { dir = d; reset(); } };
    }), { mono: true, select: 0 });
    var seen = {};
    function reset() {
      step = 0; rows = [];
      render();
      L6.feedback($('argNote'), 'info', 'Direction: <code>' + dir + '</code>. Press Step. Before the call, v = 1.');
    }
    function render() {
      $('argTable').innerHTML = '<thead><tr><th>Time</th><th>Event</th><th>x (inside task)</th><th>v (caller)</th></tr></thead><tbody>' +
        rows.join('') + '</tbody>';
    }
    $('argStep').addEventListener('click', function () {
      if (step >= events.length) return;
      var e = events[step], x = xs(dir)[step], v = scen[dir].v[step];
      var vCell = v;
      if (step === 2) vCell = '<b>' + v + '</b> ← B prints this';
      rows.push('<tr><td>' + e.t + ' ns</td><td>' + e.what + '</td><td>' + x + '</td><td>' + vCell + '</td></tr>');
      step++;
      render();
      if (step === events.length) {
        L6.feedback($('argNote'), dir === 'ref' ? 'ok' : 'info', scen[dir].note);
        seen[dir] = 1;
        if (Object.keys(seen).length >= 3) L6.mark('args');
      }
    });
    $('argReset').addEventListener('click', reset);
  }

  /* ---------- Recursion ---------- */
  function initRec() {
    var mode = 'automatic', steps, pos;
    var seen = {};
    function build() {
      var s = [];
      if (mode === 'automatic') {
        var fr = [];
        [4, 3, 2, 1].forEach(function (n) { fr = fr.concat([{ n: n, r: '' }]); s.push({ frames: JSON.parse(JSON.stringify(fr)), msg: 'Call fact(' + n + '): a new frame with its own n = ' + n + '.' }); });
        var ret = 1; fr[3].r = 'returns 1'; s.push({ frames: JSON.parse(JSON.stringify(fr)), msg: 'n <= 1, so fact(1) returns 1.' });
        for (var k = 2; k >= 0; k--) {
          ret = fr[k].n * ret; fr.pop(); fr[k].r = 'returns ' + fr[k].n + ' × ' + (ret / fr[k].n) + ' = ' + ret;
          s.push({ frames: JSON.parse(JSON.stringify(fr)), msg: 'fact(' + fr[k].n + ') multiplies its own n = ' + fr[k].n + ' by the result below.' + (k === 0 ? ' <b>Final answer 24. Correct.</b>' : ''), done: k === 0, ok: true });
        }
      } else {
        var shared = 0, frs = [];
        [4, 3, 2, 1].forEach(function (n) { shared = n; frs.push({ n: 'n', r: '' }); s.push({ frames: JSON.parse(JSON.stringify(frs)), shared: shared, msg: 'Call fact(' + n + '): there is only ONE n, now overwritten with ' + n + '.' }); });
        frs[3].r = 'returns 1'; s.push({ frames: JSON.parse(JSON.stringify(frs)), shared: 1, msg: 'fact(1) returns 1, but it left the shared n = 1.' });
        var r = 1;
        for (var j = 2; j >= 0; j--) {
          frs.pop(); r = 1 * r; frs[j].r = 'returns n × ' + r + ' = 1 × ' + r + ' = ' + r;
          s.push({ frames: JSON.parse(JSON.stringify(frs)), shared: 1, msg: 'This call expected its n to be ' + (4 - j) + ', but the shared n is 1.' + (j === 0 ? ' <b>Final answer 1. Wrong!</b>' : ''), done: j === 0, ok: false });
        }
      }
      return s;
    }
    function draw() {
      var st = pos < 0 ? null : steps[pos];
      var el = $('recStack');
      if (!st) { el.innerHTML = '<span class="l6-empty">stack empty: press Step</span>'; return; }
      el.innerHTML = st.frames.slice().reverse().map(function (f, i) {
        var depth = st.frames.length - 1 - i;
        var nTxt = mode === 'automatic' ? 'n = ' + f.n : 'n = ' + st.shared + ' (shared)';
        return '<div class="l6-box" style="text-align:left;border-color:' + (i === 0 ? 'var(--accent)' : '#9BB4DF') + '">fact(' + (4 - depth) + ') &nbsp; ' + nTxt + (f.r ? ' &nbsp; <span style="color:var(--ok)">' + esc(f.r) + '</span>' : '') + '<small>' + (i === 0 ? 'top of stack' : 'waiting') + '</small></div>';
      }).join('');
      L6.feedback($('recNote'), st.done ? (st.ok ? 'ok' : 'bad') : 'info', st.msg);
      if (st.done) { seen[mode] = 1; if (seen.automatic && seen['static']) L6.mark('recursion'); }
    }
    function reset() { steps = build(); pos = -1; draw(); $('recNote').className = 'l6-fb'; }
    L6.buttonGroup($('recMode'), ['automatic', 'static'].map(function (m) {
      return { label: 'function ' + m, onSelect: function () { mode = m; reset(); } };
    }), { mono: true, select: 0 });
    $('recStep').addEventListener('click', function () { if (pos < steps.length - 1) { pos++; draw(); } });
    $('recReset').addEventListener('click', reset);
  }

  L6.initModule({
    module: 4,
    activities: ['timeline', 'fortask', 'args', 'recursion', 'tryit', 'debug', 'quiz'],
    passMark: 6,
    minActs: 5,
    init: function () { initTimeline(); initFT(); initArgs(); initRec(); },
    tryit: [
      { t: 'Write the header line of an automatic function <code>add</code> that takes two <code>int</code> inputs <code>a</code> and <code>b</code> and returns <code>int</code>.',
        re: [/^functionautomaticintadd\((input)?inta,(input)?intb\);?$/, /^functionautomaticintadd\((input)?inta,b\);?$/], hint: '<code>function automatic &lt;return type&gt; name(args);</code>', ans: 'function automatic int add(int a, int b);' },
      { t: 'Inside a function, return the sum of <code>a</code> and <code>b</code>.', re: [/^returna\+b;?$/, /^returnb\+a;?$/], hint: 'Use the <code>return</code> keyword.', ans: 'return a + b;' },
      { t: 'Write the header of an automatic task <code>wait_clks</code> with one <code>int</code> input <code>n</code>.', re: [/^taskautomaticwait_clks\((input)?intn\);?$/], hint: 'Tasks have no return type.', ans: 'task automatic wait_clks(int n);' },
      { t: 'Write the header of an automatic void function <code>clear_q</code> that takes an int queue <code>q</code> by reference.', re: [/^functionautomaticvoidclear_q\(refintq\[\$\]\);?$/], hint: 'Use <code>ref</code> before the type, and <code>[$]</code> after the name.', ans: 'function automatic void clear_q(ref int q[$]);' },
      { t: 'Call <code>max3</code> passing 7 to <code>a</code> and 2 to <code>b</code> by name, storing the result in <code>m</code>.', re: [/^m=max3\(\.a\(7\),\.b\(2\)\);?$/, /^m=max3\(\.b\(2\),\.a\(7\)\);?$/], hint: 'Named arguments look like port connections: <code>.name(value)</code>.', ans: 'm = max3(.a(7), .b(2));' }
    ],
    debug: {
      lines: [
        'function int add3(input int a, b, c);',
        '  #1;',
        '  return a + b + c;',
        'endfunction',
        '',
        'function void clear(ref int arr[]);',
        '  arr.delete();',
        'endfunction',
        '',
        'task automatic wait_cycles(int n);',
        '  repeat (n) @(posedge clk);',
        'endtask',
        '',
        'function int total(int x);',
        '  wait_cycles(2);',
        '  return x;',
        'endfunction'
      ],
      bugs: {
        2: { id: 'delay', t: '<b>Delay inside a function.</b> Functions must run in zero time, so <code>#1</code> is a compile error. Remove it or make this a task.' },
        6: { id: 'ref', t: '<b>ref argument in a static function.</b> Functions in a module are static by default, and <code>ref</code> is only allowed in automatic subroutines. Write <code>function automatic void clear(ref int arr[]);</code>.' },
        15: { id: 'call', t: '<b>A function calling a task.</b> <code>wait_cycles</code> consumes time, so a function cannot call it. Make <code>total</code> a task, or remove the wait.' }
      },
      clean: { 1: 'Several inputs of the same type can share one declaration: fine.', 7: 'delete() on a dynamic array is fine.', 10: 'A correct automatic task header.', 11: 'Waiting for clock edges is exactly what tasks are for.' },
      fix: 'function automatic int add3(input int a, b, c);\n  return a + b + c;\nendfunction\n\nfunction automatic void clear(ref int arr[]);\n  arr.delete();\nendfunction\n\ntask automatic wait_cycles(int n);\n  repeat (n) @(posedge clk);\nendtask\n\ntask automatic total(input int x, output int y);\n  wait_cycles(2);\n  y = x;\nendtask'
    },
    quiz: [
      { q: 'Which of these may a function contain?', opts: ['<code>@(posedge clk)</code>', '<code>#10</code>', '<code>wait (ready)</code>', 'A <code>for</code> loop'], a: 3, why: 'Loops run in zero time. Delays and event controls are not allowed in functions.' },
      { q: 'Which can be used inside an expression such as <code>y = f(a) + 1</code>?', opts: ['A task', 'A non-void function', 'A void function', 'Both tasks and functions'], a: 1, why: 'Only functions with a return value can appear inside expressions.' },
      { q: 'A task has an <code>output int x</code> argument. When is the caller\'s variable updated?', opts: ['Each time x is assigned', 'When the task returns', 'At the next clock edge', 'Never'], a: 1, why: 'Outputs are copied back once, when the task completes.' },
      { q: 'Which argument direction lets the caller see changes while the task is still running?', opts: ['input', 'output', 'inout', 'ref'], a: 3, why: 'ref passes a reference to the caller\'s variable.' },
      { q: 'What is the default lifetime of a task declared in a module?', opts: ['automatic', 'static', 'dynamic', 'It depends on the simulator'], a: 1, why: 'Module-level subroutines are static unless you write automatic. Class methods are automatic.' },
      { q: 'A recursive function gives wrong answers. What is the most likely fix?', opts: ['Add a return type', 'Make it automatic', 'Use ref arguments', 'Turn it into a task'], a: 1, why: 'Static functions share one copy of their variables across calls, which breaks recursion.' },
      { q: 'What does <code>const ref</code> mean for an array argument?', opts: ['A copy is made', 'Passed by reference but cannot be modified', 'The array is constant for the whole simulation', 'Only the first element is passed'], a: 1, why: 'No copy, and the compiler forbids writes. Good for big arrays.' },
      { q: 'Can a task call a function?', opts: ['Yes', 'No', 'Only void functions', 'Only automatic functions'], a: 0, why: 'Tasks can call both functions and other tasks.' }
    ]
  });
})();
