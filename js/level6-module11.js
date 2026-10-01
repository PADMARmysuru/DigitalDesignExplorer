/* Level 6 – Module 11: Functional Coverage */
(function () {
  'use strict';
  var $ = L6.$, esc = L6.esc;

  function initKind() {
    L6.choiceGame($('kindList'), [
      { q: 'Every <code>else</code> branch in the RTL has executed at least once.', a: 'Code coverage', why: 'Branch coverage is measured automatically from the RTL.' },
      { q: 'A burst of length 16 has been sent while the FIFO was full.', a: 'Functional coverage', why: 'A scenario from the specification: you must write it as a coverpoint or cross.' },
      { q: 'Every bit of the address bus has toggled 0→1 and 1→0.', a: 'Code coverage', why: 'Toggle coverage is automatic.' },
      { q: 'All four opcodes have been used with operand a = 0.', a: 'Functional coverage', why: 'A cross of opcode and operand value.' },
      { q: 'The FSM has visited every state.', a: 'Code coverage', why: 'FSM state and transition coverage is extracted automatically by most tools (it can also be written as functional coverage).' }
    ], ['Code coverage', 'Functional coverage'], function () { L6.mark('kind'); }, $('kindScore'));
  }

  function initBins() {
    L6.choiceGame($('binList'), [
      { code: 'coverpoint x { bins b[] = {[0:3]}; }', a: '4', choices: ['1', '4', '8'], why: '<code>[]</code> creates one bin per value: 0, 1, 2, 3.' },
      { code: 'coverpoint x { bins b = {[0:3]}; }', a: '1', choices: ['1', '4', '8'], why: 'Without <code>[]</code>, the whole range is one bin, covered by any of the values.' },
      { code: 'bit [2:0] y;\ncoverpoint y;   // no bins written', a: '8', choices: ['1', '3', '8'], why: 'Automatic bins: one per possible value of a 3-bit variable.' },
      { code: 'coverpoint x { bins b[4] = {[0:15]}; }', a: '4', choices: ['4', '15', '16'], why: '<code>[4]</code> spreads the 16 values over 4 bins of 4 values each.' },
      { code: 'cp_op has 4 bins, cp_a has 4 bins;\ncross cp_op, cp_a;', a: '16', choices: ['8', '16', '4'], why: 'A cross has one bin for every combination: 4 × 4.' }
    ], null, function () { L6.mark('bins'); }, $('binScore'));
  }

  /* ---------- Dashboard ---------- */
  function initDash() {
    var OPS = ['ADD', 'SUB', 'AND', 'OR'], AB = ['zero', 'small', 'large', 'max'];
    var st;
    function reset() {
      st = { n: 0, op: [0, 0, 0, 0], a: [0, 0, 0, 0], x: [], ill: 0, ign: 0, randOnly: true };
      for (var i = 0; i < 4; i++) st.x.push([0, 0, 0, 0]);
      $('cvLog').dataset.started = '0'; $('cvLog').innerHTML = '<span class="dim">// last samples appear here</span>';
      $('cvNote').className = 'l6-fb';
      draw();
    }
    function abin(a) { return a === 0 ? 0 : (a <= 127 ? 1 : (a <= 254 ? 2 : 3)); }
    function log(html) { var el = $('cvLog'); if (el.dataset.started !== '1') { el.innerHTML = ''; el.dataset.started = '1'; } el.insertAdjacentHTML('beforeend', '<div>' + html + '</div>'); while (el.childNodes.length > 60) el.removeChild(el.firstChild); el.scrollTop = 1e6; }
    function sample(op, a, quiet) {
      st.n++;
      if (op === 'NOP') { st.ign++; if (!quiet) log('<span class="dim">op=NOP a=' + a + '  (ignore_bins: not counted)</span>'); return; }
      if (op === 'RSV') { st.ill++; log('<span class="bad">** Error: illegal_bins rsv hit: op=RSV a=' + a + '</span>'); return; }
      var o = OPS.indexOf(op), b = abin(a);
      st.op[o]++; st.a[b]++; st.x[o][b]++;
      if (!quiet) log('op=' + op + ' a=' + a + ' → cp_op.' + op + ', cp_a.' + AB[b]);
    }
    function randA() {
      if ($('cvDist').checked) { var r = Math.random(); return r < 0.1 ? 0 : (r < 0.2 ? 255 : L6.rand(1, 254)); }
      return L6.rand(0, 255);
    }
    function randOp() {
      var pool = OPS.concat(['NOP']); if (!$('cvNoRsv').checked) pool.push('RSV');
      return pool[L6.rand(0, pool.length - 1)];
    }
    function pct(arr) { return 100 * arr.filter(function (c) { return c > 0; }).length / arr.length; }
    function draw() {
      var flat = [].concat.apply([], st.x);
      var pOp = pct(st.op), pA = pct(st.a), pX = pct(flat), tot = (pOp + pA + pX) / 3;
      $('cvN').textContent = st.n; $('cvTot').textContent = Math.floor(tot) + '%'; $('cvIll').textContent = st.ill; $('cvIgn').textContent = st.ign;
      $('cvIll').style.color = st.ill ? 'var(--bad)' : '';
      $('cvMeters').innerHTML = L6.meter('cp_op', pOp) + L6.meter('cp_a', pA) + L6.meter('cx_op_a', pX) + L6.meter('<b>cg_alu total</b>', tot);
      function binRows(names, counts) {
        return '<div class="l6-boxes">' + names.map(function (n, i) { return '<div class="l6-box" style="border-color:' + (counts[i] ? 'var(--ok)' : 'var(--bad)') + '">' + n + '<small>' + (counts[i] ? counts[i] + ' hits' : 'HOLE') + '</small></div>'; }).join('') + '</div>';
      }
      $('cvOp').innerHTML = binRows(OPS, st.op);
      $('cvA').innerHTML = binRows(AB, st.a);
      var t = '<table class="l6-heat"><thead><tr><th></th>' + AB.map(function (b) { return '<th>' + b + '</th>'; }).join('') + '</tr></thead><tbody>';
      OPS.forEach(function (o, i) {
        t += '<tr><th>' + o + '</th>' + st.x[i].map(function (c) { var h = c === 0 ? 'h0' : (c === 1 ? 'h1' : (c < 5 ? 'h2' : 'h3')); return '<td class="' + h + '">' + (c || '·') + '</td>'; }).join('') + '</tr>';
      });
      $('cvX').innerHTML = t + '</tbody></table>';
      if (st.n >= 100) L6.mark('dashboard');
      if (tot >= 100) {
        L6.mark('closure');
        L6.feedback($('cvNote'), st.ill ? 'bad' : 'ok', '<b>100% coverage.</b> ' + (st.ill ? 'But ' + st.ill + ' illegal opcode' + (st.ill > 1 ? 's were' : ' was') + ' generated: the test would still fail. Enable <code>op != RSV</code> so the generator never produces them.' : 'Every bin and every combination has been exercised, with no illegal values.'));
      }
    }
    function hint() {
      if (st.a[0] && st.a[3]) return;
      if (st.n >= 100 && st.randOnly) L6.feedback($('cvNote'), 'info', 'Notice the holes in <b>zero</b> and <b>max</b>: with uniform random values, a = 0 or a = 255 appears only 1 time in 256 each, and each needs to happen with all 4 opcodes. Enable the <code>dist</code> constraint or use the directed button.');
    }
    function rand(k) { for (var i = 0; i < k; i++) sample(randOp(), randA(), k > 10); if (k > 10) log('<span class="dim">... ' + k + ' random samples</span>'); draw(); hint(); }
    $('cvR1').addEventListener('click', function () { rand(1); });
    $('cvR10').addEventListener('click', function () { rand(10); });
    $('cvR100').addEventListener('click', function () { rand(100); });
    $('cvDir').addEventListener('click', function () {
      var rep = [0, 64, 200, 255], added = 0;
      st.randOnly = false;
      for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) if (!st.x[i][j]) { sample(OPS[i], rep[j], true); added++; }
      log(added ? '<span class="ok">directed test: ' + added + ' targeted samples, one per empty cross bin</span>' : '<span class="dim">no holes left</span>');
      draw();
      if (added) L6.feedback($('cvNote'), 'info', 'The directed test targeted exactly the ' + added + ' missing combinations. In real projects you first try adjusting constraints, then write directed tests for whatever random stimulus still cannot reach.');
    });
    $('cvDist').addEventListener('change', function () { if (this.checked) st.randOnly = false; });
    $('cvReset').addEventListener('click', reset);
    reset();
  }

  L6.initModule({
    module: 11,
    activities: ['kind', 'bins', 'dashboard', 'closure', 'tryit', 'debug', 'quiz'],
    passMark: 6,
    minActs: 5,
    init: function () { initKind(); initBins(); initDash(); },
    tryit: [
      { t: 'Write the first line of a covergroup <code>cg</code> sampled on every rising edge of <code>clk</code>.', re: [/^covergroupcg@\(posedgeclk\);?$/], hint: '<code>covergroup name @(event);</code>', ans: 'covergroup cg @(posedge clk);' },
      { t: 'Write a coverpoint named <code>cp_len</code> on <code>len</code> with automatic bins (no body).', re: [/^cp_len:coverpointlen;?$/], hint: '<code>label: coverpoint variable;</code>', ans: 'cp_len: coverpoint len;' },
      { t: 'Write a bin declaration <code>low</code> for the values 0 to 3.', re: [/^binslow=\{\[0:3\]\};?$/], hint: '<code>bins name = {[lo:hi]};</code>', ans: 'bins low = {[0:3]};' },
      { t: 'Write an illegal bin <code>bad</code> for the value 15.', re: [/^illegal_binsbad=\{15\};?$/, /^illegal_binsbad=\{4'hf\};?$/i], hint: 'Like bins, but with the keyword <code>illegal_bins</code>.', ans: 'illegal_bins bad = {15};' },
      { t: 'Write a cross named <code>cx</code> of <code>cp_op</code> and <code>cp_len</code>.', re: [/^cx:crosscp_op,cp_len;?$/], hint: '<code>label: cross cp1, cp2;</code>', ans: 'cx: cross cp_op, cp_len;' }
    ],
    debug: {
      lines: [
        'covergroup cg_pkt @(posedge clk);',
        '  cp_len: coverpoint len {',
        '    bins small = {[1:4]};',
        '    bins big   = {[4:8]};',
        '    bins zero  = 0;',
        '  }',
        '  cp_kind: coverpoint kind;',
        '  cx: cross cp_len, cp_kind;',
        'endgroup',
        '',
        'module tb;',
        '  cg_pkt cov;',
        '  initial begin',
        '    run_test();',
        '    $display("coverage = %0.1f%%", cov.get_coverage());',
        '  end',
        'endmodule'
      ],
      bugs: {
        4: { id: 'overlap', t: '<b>Overlapping bins.</b> Length 4 belongs to both small and big, so one sample counts for both and the report overstates what was tested. Use <code>{[5:8]}</code>.' },
        5: { id: 'brace', t: '<b>Missing braces.</b> A bin value list must be in braces: <code>bins zero = {0};</code>. This is a syntax error.' },
        12: { id: 'new', t: '<b>Covergroup never constructed.</b> Like a class, a covergroup does nothing until <code>cov = new();</code>. Here nothing is sampled and <code>cov.get_coverage()</code> hits a null handle.' }
      },
      clean: { 1: 'Sampling on the clock edge is fine (often refined with iff valid).', 7: 'Automatic bins for an enum give one bin per value: good.', 8: 'Crossing length with kind is a sensible goal.' },
      fix: 'covergroup cg_pkt @(posedge clk);\n  cp_len: coverpoint len {\n    bins small = {[1:4]};\n    bins big   = {[5:8]};\n    bins zero  = {0};\n  }\n  cp_kind: coverpoint kind;\n  cx: cross cp_len, cp_kind;\nendgroup\n\nmodule tb;\n  cg_pkt cov;\n  initial begin\n    cov = new();\n    run_test();\n    $display("coverage = %0.1f%%", cov.get_coverage());\n  end\nendmodule'
    },
    quiz: [
      { q: 'Which coverage can reveal that a whole feature was never implemented?', opts: ['Line coverage', 'Toggle coverage', 'Functional coverage', 'Branch coverage'], a: 2, why: 'Code coverage only measures code that exists.' },
      { q: 'When is a bin considered covered (by default)?', opts: ['When hit 100 times', 'When hit at least once', 'When the test passes', 'When all bins are hit'], a: 1, why: 'The default at_least is 1.' },
      { q: 'What does <code>illegal_bins</code> do when a value in it occurs?', opts: ['Ignores it silently', 'Reports an error', 'Counts it towards coverage', 'Stops randomization'], a: 1, why: 'Illegal values must never happen, so the tool reports an error.' },
      { q: 'cp_a has 4 bins, cp_b has 3 bins. How many bins does their cross have?', opts: ['7', '12', '4', '3'], a: 1, why: '4 × 3 combinations.' },
      { q: 'Uniform random 8-bit values rarely hit <code>a == 255</code>. Best fix?', opts: ['Run 100× longer', 'Add a dist constraint weighting corner values', 'Delete the bin', 'Use illegal_bins'], a: 1, why: 'Shaping the distribution reaches corners efficiently.' },
      { q: 'What must you do before a covergroup samples anything?', opts: ['Nothing', 'Construct it with new()', 'Call $finish', 'Randomize it'], a: 1, why: 'A covergroup is instantiated like a class.' },
      { q: 'Coverage reaches 100% but the scoreboard reported errors. Is verification done?', opts: ['Yes', 'No: all tests must also pass', 'Only if coverage is functional', 'Only for directed tests'], a: 1, why: 'Coverage measures what ran, not correctness.' },
      { q: '<code>bins b[] = {[0:7]};</code> creates…', opts: ['1 bin', '7 bins', '8 bins', 'an error'], a: 2, why: 'One bin per value from 0 to 7.' }
    ]
  });
})();
