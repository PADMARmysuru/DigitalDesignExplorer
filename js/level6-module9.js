/* Level 6 – Module 9: Testbench Architecture */
(function () {
  'use strict';
  var $ = L6.$, esc = L6.esc;

  function dut(a, b, bug) { var s = a + b; if (bug && a >= 128 && b >= 128) s = s & 0xFF; return s; }
  function logTo(el, html) { if (el.dataset.started !== '1') { el.innerHTML = ''; el.dataset.started = '1'; } el.insertAdjacentHTML('beforeend', '<div>' + html + '</div>'); el.scrollTop = 1e6; }

  /* ---------- Architecture blocks ---------- */
  var INFO = {
    Test: { role: 'Top of the testbench. Builds the environment, configures it (how many transactions, which constraints) and decides when the test ends.', talks: 'Environment', code: 'class test;\n  env e;\n  function new(virtual adder_if vif); e = new(vif); endfunction\n  task run();\n    e.gen.count = 100;\n    e.run();\n    e.sb.report();\n  endtask\nendclass' },
    Generator: { role: 'Creates transaction objects, randomizes them within constraints and puts them in a mailbox for the driver. Knows nothing about pins.', talks: 'Driver (mailbox)', code: 'task run();\n  repeat (count) begin\n    adder_txn t = new();\n    if (!t.randomize()) $fatal(1, "rand failed");\n    gen2drv.put(t);\n  end\nendtask' },
    Driver: { role: 'Takes transactions from the mailbox and turns them into pin activity on the DUT interface, following the protocol timing.', talks: 'Generator (mailbox), DUT (virtual interface)', code: 'task run();\n  forever begin\n    gen2drv.get(t);\n    @(posedge vif.clk);\n    vif.a <= t.a;  vif.b <= t.b;  vif.valid <= 1;\n    @(posedge vif.clk);\n    vif.valid <= 0;\n  end\nendtask' },
    DUT: { role: 'The Design Under Test: your RTL. The testbench treats it as a black box and only sees its pins.', talks: 'Driver and Monitor via the interface', code: 'module adder (input  logic clk, valid,\n              input  logic [7:0] a, b,\n              output logic [8:0] sum);\n  always_ff @(posedge clk)\n    if (valid) sum <= a + b;\nendmodule' },
    Monitor: { role: 'Watches the pins passively, rebuilds transactions from what really happened (inputs and outputs) and sends them to the scoreboard. It never drives anything.', talks: 'DUT (virtual interface), Scoreboard (mailbox)', code: 'task run();\n  forever begin\n    @(posedge vif.clk iff vif.valid);\n    t = new();  t.a = vif.a;  t.b = vif.b;\n    @(posedge vif.clk);\n    t.sum = vif.sum;\n    mon2sb.put(t);\n  end\nendtask' },
    Scoreboard: { role: 'Compares each observed transaction with the reference model\'s prediction, counts matches and mismatches and reports the final verdict.', talks: 'Monitor (mailbox), Reference model', code: 'mon2sb.get(t);\nif (t.sum === ref_model(t.a, t.b)) n_ok++;\nelse begin n_err++; $error(...); end' },
    'Reference model': { role: 'An independent, untimed description of what the DUT should do, written from the specification. Often a simple function.', talks: 'Scoreboard', code: 'function bit [8:0] ref_model(bit [7:0] a, b);\n  return a + b;\nendfunction' },
    Interface: { role: 'The bundle of DUT pins. The driver and monitor reach it through a virtual interface handle.', talks: 'Driver, Monitor, DUT', code: 'interface adder_if (input logic clk);\n  logic valid;\n  logic [7:0] a, b;\n  logic [8:0] sum;\nendinterface' }
  };
  function initBlocks() {
    var top = ['Test', 'Generator', 'Driver', 'DUT', 'Monitor', 'Scoreboard'], bottom = ['Interface', 'Reference model'];
    var seen = {}, all = [];
    function mk(root, list, arrows) {
      list.forEach(function (n, i) {
        if (arrows && i) root.insertAdjacentHTML('beforeend', '<span class="l6-arrow" aria-hidden="true">' + (n === 'DUT' || n === 'Monitor' ? '⇄' : '→') + '</span>');
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'l6-block' + (n === 'DUT' ? ' is-dut' : '');
        b.innerHTML = esc(n);
        b.addEventListener('click', function () {
          all.forEach(function (x) { x.classList.remove('is-on'); }); b.classList.add('is-on');
          var d = INFO[n];
          $('tbInfo').innerHTML = '<div class="l6-card" style="margin-top:12px"><p class="l6-card-title">' + esc(n) + '</p><p>' + d.role + '</p><p><b>Talks to:</b> ' + esc(d.talks) + '</p><pre class="l6-code"><code>' + L6.highlight(d.code) + '</code></pre></div>';
          seen[n] = 1; if (Object.keys(seen).length >= 6) L6.mark('blocks');
        });
        all.push(b); root.appendChild(b);
      });
    }
    mk($('tbTop'), top, true);
    mk($('tbBottom'), bottom, false);
    $('tbBottom').insertAdjacentHTML('afterbegin', '<span style="color:var(--ink-3);font-size:.85rem">Also:</span>');
  }

  /* ---------- Transaction flow ---------- */
  function initFlow() {
    var names = ['Generator', 'Driver', 'DUT', 'Monitor', 'Reference model', 'Scoreboard'], els = {}, busy = false;
    var st = { sent: 0, ok: 0, bad: 0 };
    names.forEach(function (n, i) {
      if (i) $('flDiagram').insertAdjacentHTML('beforeend', '<span class="l6-arrow" aria-hidden="true">→</span>');
      var d = document.createElement('div'); d.className = 'l6-block' + (n === 'DUT' ? ' is-dut' : ''); d.style.cursor = 'default';
      d.innerHTML = esc(n) + '<small id="fl_' + i + '">idle</small>';
      $('flDiagram').appendChild(d); els[n] = d;
    });
    function stats() {
      $('flSent').textContent = st.sent; $('flOk').textContent = st.ok; $('flBad').textContent = st.bad;
      $('flVerdict').textContent = st.sent ? (st.bad ? 'FAIL' : 'PASS') : '–';
      $('flVerdict').style.color = st.bad ? 'var(--bad)' : 'var(--ok)';
      if (st.sent >= 8 && st.bad >= 1) L6.mark('flow');
    }
    function oneTxn(animate, done) {
      var a = L6.rand(0, 255), b = L6.rand(0, 255), bug = $('flBug').checked;
      if (bug && Math.random() < 0.4) { a = L6.rand(128, 255); b = L6.rand(128, 255); }
      var sum = dut(a, b, bug), exp = a + b, id = st.sent + 1;
      var stages = [
        ['Generator', 'txn #' + id + ': a=' + a + ' b=' + b, '<span class="dim">[gen]</span> randomized txn #' + id + ': a=' + a + ', b=' + b + ' → put in mailbox'],
        ['Driver', 'driving pins', '<span class="dim">[drv]</span> got txn #' + id + ', drove a, b and valid on the interface'],
        ['DUT', 'sum = ' + sum, '<span class="dim">[dut]</span> computed sum = ' + sum],
        ['Monitor', 'saw sum = ' + sum, '<span class="dim">[mon]</span> observed a=' + a + ', b=' + b + ', sum=' + sum + ' on the pins'],
        ['Reference model', 'expects ' + exp, '<span class="dim">[ref]</span> predicted ' + a + ' + ' + b + ' = ' + exp],
        ['Scoreboard', sum === exp ? 'MATCH' : 'MISMATCH', sum === exp ? '<span class="ok">[sb] txn #' + id + ' MATCH ✓</span>' : '<span class="bad">[sb] txn #' + id + ' MISMATCH ✗ DUT ' + sum + ' ≠ expected ' + exp + ' (bit 8 lost when both inputs ≥ 128)</span>']
      ];
      function finish() {
        st.sent++; if (sum === exp) st.ok++; else st.bad++;
        stats(); if (done) done();
      }
      if (!animate) { logTo($('flLog'), stages[5][2]); finish(); return; }
      var k = 0;
      (function next() {
        names.forEach(function (n) { els[n].classList.remove('is-active'); });
        if (k >= stages.length) { finish(); return; }
        var s = stages[k], i = names.indexOf(s[0]);
        els[s[0]].classList.add('is-active');
        $('fl_' + i).textContent = s[1];
        logTo($('flLog'), s[2]);
        k++;
        setTimeout(next, 420);
      })();
    }
    $('flOne').addEventListener('click', function () { if (busy) return; busy = true; oneTxn(true, function () { busy = false; }); });
    $('flTen').addEventListener('click', function () { if (busy) return; for (var i = 0; i < 10; i++) oneTxn(false); });
    $('flReset').addEventListener('click', function () {
      st = { sent: 0, ok: 0, bad: 0 }; stats();
      $('flLog').dataset.started = '0'; $('flLog').innerHTML = '<span class="dim">// log</span>';
      names.forEach(function (n, i) { $('fl_' + i).textContent = 'idle'; });
    });
    $('flLog').innerHTML = '<span class="dim">// Send a transaction to watch each component work</span>';
    stats();
  }

  /* ---------- Directed vs random ---------- */
  function initDirRand() {
    var did = {}, found = false;
    function run(list, label) {
      $('drLog').dataset.started = '0';
      var fails = 0;
      logTo($('drLog'), '<span class="dim">// ' + esc(label) + '</span>');
      list.forEach(function (p) {
        var s = dut(p[0], p[1], true), e = p[0] + p[1];
        if (s === e) logTo($('drLog'), '<span class="ok">PASS</span> ' + p[0] + ' + ' + p[1] + ' = ' + s);
        else { fails++; logTo($('drLog'), '<span class="bad">FAIL</span> ' + p[0] + ' + ' + p[1] + ': DUT ' + s + ', expected ' + e); }
      });
      return fails;
    }
    $('drDir').addEventListener('click', function () {
      var f = run([[1, 2], [10, 20], [100, 27], [0, 0], [50, 50]], 'directed tests written by hand');
      L6.feedback($('drNote'), f ? 'bad' : 'info', f ? 'Found it.' : 'All 5 directed tests pass. Would you sign off this adder? The bug is still there: none of these cases has both inputs ≥ 128.');
      did.d = 1; check();
    });
    $('drRand').addEventListener('click', function () {
      var list = []; for (var i = 0; i < 20; i++) list.push([L6.rand(0, 255), L6.rand(0, 255)]);
      var f = run(list, '20 random tests');
      if (f) found = true;
      L6.feedback($('drNote'), f ? 'ok' : 'info', f ? 'Random stimulus found <b>' + f + '</b> failing case' + (f > 1 ? 's' : '') + '. Look at them: both inputs are ≥ 128 and the carry into bit 8 is lost. You never wrote a test for that, the solver simply wandered into it (about 1 in 4 random pairs).' : 'No failure this time (it happens: about 1 in 300 runs of 20). Run again.');
      did.r = 1; check();
    });
    function check() { if (did.d && did.r && found) L6.mark('dirrand'); }
    $('drLog').innerHTML = '<span class="dim">// results</span>';
  }

  function initWho() {
    var C = ['Generator', 'Driver', 'Monitor', 'Scoreboard', 'Reference model'];
    L6.choiceGame($('whoList'), [
      { q: 'Calls <code>randomize()</code> on each new transaction.', a: 'Generator', why: 'Creating stimulus is the generator\'s job.' },
      { q: 'Waits for <code>@(posedge vif.clk)</code> and assigns <code>vif.a &lt;= t.a</code>.', a: 'Driver', why: 'Only the driver drives pins.' },
      { q: 'Reads <code>vif.sum</code> and builds a transaction from it.', a: 'Monitor', why: 'The monitor observes pins passively.' },
      { q: 'Computes <code>a + b</code> without any timing.', a: 'Reference model', why: 'The model predicts the correct answer.' },
      { q: 'Increments an error counter when two values differ.', a: 'Scoreboard', why: 'The scoreboard compares and keeps score.' }
    ], C, function () { L6.mark('selfcheck'); }, $('whoScore'));
  }

  L6.initModule({
    module: 9,
    activities: ['blocks', 'flow', 'dirrand', 'selfcheck', 'tryit', 'debug', 'quiz'],
    passMark: 6,
    minActs: 5,
    init: function () { initBlocks(); initFlow(); initDirRand(); initWho(); },
    tryit: [
      { t: 'Declare a mailbox <code>gen2drv</code> that carries <code>adder_txn</code> handles.', re: [/^mailbox#\(adder_txn\)gen2drv;?$/], hint: 'Mailboxes can be parameterised with a type: <code>mailbox #(type) name;</code>', ans: 'mailbox #(adder_txn) gen2drv;' },
      { t: 'In the generator, put transaction <code>t</code> into <code>gen2drv</code>.', re: [/^gen2drv\.put\(t\);?$/], hint: 'Use the mailbox method that adds an item.', ans: 'gen2drv.put(t);' },
      { t: 'In the driver, take the next transaction from <code>gen2drv</code> into <code>t</code>, waiting if none is available.', re: [/^gen2drv\.get\(t\);?$/], hint: 'The blocking method is <code>get</code>.', ans: 'gen2drv.get(t);' },
      { t: 'In the scoreboard, compare <code>t.sum</code> with <code>ref_model(t.a, t.b)</code> using a 4-state-safe equality, as an if-condition.', re: [/^if\(t\.sum===ref_model\(t\.a,t\.b\)\)$/], hint: 'Use <code>===</code> so X or Z in the DUT output counts as a mismatch.', ans: 'if (t.sum === ref_model(t.a, t.b))' },
      { t: 'Randomize <code>t</code> and stop the simulation with <code>$fatal</code> if it fails (one line).', re: [/^if\(!t\.randomize\(\)\)\$fatal(\(.*\))?;?$/], hint: '<code>if (!obj.randomize()) $fatal(...);</code>', ans: 'if (!t.randomize()) $fatal(1, "randomize failed");' }
    ],
    debug: {
      lines: [
        'class scoreboard;',
        '  mailbox #(adder_txn) mon2sb;',
        '  int errors = 0;',
        '  task run();',
        '    adder_txn t;',
        '    bit [8:0] exp;',
        '    forever begin',
        '      mon2sb.try_get(t);',
        '      exp = t.a + t.b;',
        '      if (t.sum !== exp)',
        '        $display("mismatch");',
        '    end',
        '  endtask',
        'endclass',
        '',
        '// in the test',
        'task run();',
        '  env.run();',
        '  $display("TEST PASSED");',
        'endtask'
      ],
      bugs: {
        8: { id: 'get', t: '<b>try_get does not wait.</b> If the mailbox is empty it returns 0 immediately and <code>t</code> is null (or the old one). The forever loop then spins in zero time and the simulation hangs. Use <code>mon2sb.get(t);</code>.' },
        11: { id: 'err', t: '<b>Error not counted.</b> A mismatch only prints a message; <code>errors</code> is never incremented, so nothing can make the test fail. Use <code>errors++; $error("a=%0d b=%0d got %0d exp %0d", ...);</code>.' },
        19: { id: 'pass', t: '<b>Unconditional PASS.</b> The test prints PASSED without looking at the scoreboard. It must check <code>env.sb.errors == 0</code> (and that transactions were actually checked).' }
      },
      clean: { 6: 'A 9-bit expected value is correct: the sum of two 8-bit values needs 9 bits.', 9: 'The reference calculation is right.', 10: '<code>!==</code> also treats X and Z as mismatches: good.' },
      fix: 'class scoreboard;\n  mailbox #(adder_txn) mon2sb;\n  int errors = 0, checked = 0;\n  task run();\n    adder_txn t;\n    bit [8:0] exp;\n    forever begin\n      mon2sb.get(t);\n      exp = t.a + t.b;\n      checked++;\n      if (t.sum !== exp) begin\n        errors++;\n        $error("a=%0d b=%0d: got %0d, expected %0d", t.a, t.b, t.sum, exp);\n      end\n    end\n  endtask\nendclass\n\ntask run();\n  env.run();\n  if (env.sb.errors == 0 && env.sb.checked > 0) $display("TEST PASSED");\n  else                                           $display("TEST FAILED");\nendtask'
    },
    quiz: [
      { q: 'Which component converts transactions into pin activity?', opts: ['Generator', 'Driver', 'Monitor', 'Scoreboard'], a: 1, why: 'The driver implements the protocol on the interface.' },
      { q: 'Why is the monitor independent of the driver?', opts: ['To save memory', 'To report what really happened on the pins', 'Because classes cannot share data', 'It is not; they are the same class'], a: 1, why: 'An independent observer catches driver and DUT problems.' },
      { q: 'What does the reference model do?', opts: ['Drives the DUT', 'Predicts the expected output', 'Measures coverage', 'Generates the clock'], a: 1, why: 'It is the untimed "golden" behaviour.' },
      { q: 'Which components normally use the virtual interface?', opts: ['Generator and scoreboard', 'Driver and monitor', 'Only the test', 'All of them'], a: 1, why: 'Only pin-level components need it.' },
      { q: 'What is the main advantage of constrained-random over directed tests?', opts: ['Easier to read', 'Finds bugs in cases nobody thought of', 'Needs no scoreboard', 'Always faster'], a: 1, why: 'Random exploration reaches unexpected corners.' },
      { q: 'A random test fails. What do you need to reproduce it?', opts: ['The waveform', 'The random seed', 'A new constraint', 'A faster computer'], a: 1, why: 'The same seed regenerates the same stimulus.' },
      { q: 'What makes a testbench "self-checking"?', opts: ['It uses assertions only', 'It decides PASS/FAIL automatically by comparing against expected results', 'It has no waveform', 'It runs without a DUT'], a: 1, why: 'No human needs to inspect waveforms to judge the result.' },
      { q: 'How do generator and driver usually communicate?', opts: ['Global variables', 'A mailbox', 'Direct pin connections', '$display'], a: 1, why: 'A mailbox passes transaction handles safely between processes.' }
    ]
  });
})();
