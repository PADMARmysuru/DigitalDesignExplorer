/* Level 11 · Module 5 – Functional Coverage */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var OPS = ['ADD', 'SUB', 'AND', 'OR'], AB = ['zero', 'small', 'large', 'max'];
  function binOf(a) { return a === 0 ? 0 : a === 255 ? 3 : a <= 100 ? 1 : 2; }

  /* ---------- Widget: coverage analyzer ---------- */
  function covLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Coverage analyzer · ALU covergroup: op × operand a</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var hits = { op: [0, 0, 0, 0], a: [0, 0, 0, 0], x: {} }, n = 0, bias = false, done = false;
    body.appendChild(L.h('div', '', L.code('covergroup alu_cg @(posedge clk);\n  cp_op : coverpoint op;                                  // 4 bins\n  cp_a  : coverpoint a { bins zero = {0}; bins small = {[1:100]};\n                         bins large = {[101:254]}; bins max = {255}; }\n  cx    : cross cp_op, cp_a { bins corners = binsof(cp_a) intersect {0, 255}; }   // 8 bins\nendgroup')));
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    row.appendChild(L.btn('🎲 Run 20 random transactions', 'pri', function () { for (var i = 0; i < 20; i++) { var a = bias && Math.random() < 0.4 ? (Math.random() < 0.5 ? 0 : 255) : Math.floor(Math.random() * 256); add(Math.floor(Math.random() * 4), a); } draw(); }));
    var bBias = L.btn('Corner-biased constraint: OFF', '', function () { bias = !bias; draw(); }); row.appendChild(bBias);
    row.appendChild(L.btn('↺ Reset coverage', 'ghost', function () { hits = { op: [0, 0, 0, 0], a: [0, 0, 0, 0], x: {} }; n = 0; draw(); }));
    var drow = L.h('div', 'l7-row'); body.appendChild(drow);
    var dop = 0, da = 0;
    L.select(drow, 'Directed test: op', OPS.map(function (o, i) { return [String(i), o]; }), '0', function (v) { dop = +v; });
    L.select(drow, 'operand a', [['0', 'a = 0'], ['50', 'a = 50'], ['200', 'a = 200'], ['255', 'a = 255']], '0', function (v) { da = +v; });
    drow.appendChild(L.btn('▶ Run directed test', '', function () { add(dop, da); draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function add(op, a) { n++; hits.op[op]++; var b = binOf(a); hits.a[b]++; if (b === 0 || b === 3) hits.x[op + ',' + b] = (hits.x[op + ',' + b] || 0) + 1; }
    function draw() {
      bBias.innerHTML = 'Corner-biased constraint: ' + (bias ? 'ON' : 'OFF'); bBias.classList.toggle('is-on', bias);
      var o = '', cov = 0, tot = 16;
      o += T(10, 18, 'cp_op', 't-ink t-b t-sm', 'start') + T(220, 18, 'cp_a', 't-ink t-b t-sm', 'start') + T(430, 18, 'cross corners (op × {zero,max})', 't-ink t-b t-sm', 'start');
      OPS.forEach(function (op, i) { var h = hits.op[i]; if (h) cov++; o += R(10, 28 + i * 34, 180, 28, h ? 'box-ok' : 'box-bad', 6) + T(20, 47 + i * 34, op + ': ' + h, 't-ink t-sm', 'start'); });
      AB.forEach(function (b, i) { var h = hits.a[i]; if (h) cov++; o += R(220, 28 + i * 34, 180, 28, h ? 'box-ok' : 'box-bad', 6) + T(230, 47 + i * 34, b + ': ' + h, 't-ink t-sm', 'start'); });
      OPS.forEach(function (op, i) { [0, 3].forEach(function (b, j) { var h = hits.x[i + ',' + b] || 0; if (h) cov++; o += R(430 + j * 80, 28 + i * 34, 74, 28, h ? 'box-ok' : 'box-bad', 6) + T(467 + j * 80, 47 + i * 34, op + '/' + (b ? 'max' : '0'), 't-ink t-sm'); }); });
      var pct = Math.round(100 * cov / tot);
      o += R(10, 170, 580, 18, 'box', 6) + '<rect x="10" y="170" width="' + (5.8 * pct) + '" height="18" rx="6" fill="' + (pct === 100 ? '#34c759' : '#0071e3') + '"/>' + T(300, 184, 'coverage ' + pct + ' % (' + cov + ' / 16 bins) after ' + n + ' transactions', 't-ink t-b t-sm');
      pic.innerHTML = S(600, 196, o, 'Coverage bins');
      verdict.className = 'l7-verdict ' + (pct === 100 ? 'ok' : n ? 'warn' : 'bad');
      verdict.innerHTML = pct === 100 ? '✅ 100 % functional coverage in ' + n + ' transactions<small>Random stimulus filled the easy bins fast; the corner bins needed either a biased constraint or directed tests – exactly what coverage-driven verification is about.</small>' :
        n ? '📊 Coverage ' + pct + ' %<small>' + (hits.a[0] && hits.a[3] ? 'Some op × corner combinations are still missing.' : 'a = 0 and a = 255 are 1 value in 256 each – pure random almost never hits them. Use the corner-biased constraint or directed tests.') + '</small>' : 'Run some transactions';
      if (pct === 100 && !done) { done = true; api.done(); }
    }
    draw();
  }

  function cgFrame(k) {
    var o = '', b = [['zero', 0], ['small', 1], ['large', 1], ['max', 0]];
    if (k >= 1) b = [['zero', 0], ['small', 1], ['large', 1], ['max', 0]];
    b.forEach(function (x, i) { var hit = k >= 2 ? (k === 3 ? 1 : x[1]) : 0; o += R(40 + i * 130, 60, 110, 50, hit ? 'box-ok' : k ? 'box-bad' : 'box', 8) + T(95 + i * 130, 90, x[0], 't-ink t-b t-sm'); });
    o += T(300, 30, ['A coverpoint samples a variable; bins group its values', 'Empty bins (red) = scenarios never exercised', 'Random tests fill the common bins first', 'Targeted tests close the holes: 100 %'][k], 't-vio t-b t-sm');
    return S(600, 140, o, 'Coverage bins');
  }

  L.module({
    n: 5,
    lead: 'Passing tests only prove the tested scenarios work. Functional coverage measures which scenarios from the verification plan have actually happened – and points to the holes where bugs can still hide.',
    tags: ['coverage concepts', 'covergroups', 'coverpoints', 'bins', 'cross coverage', 'transition coverage', 'coverage goals', 'closure'],
    sections: [
      {
        id: 'c-why', type: 'concept', title: 'What functional coverage measures', nav: 'Concepts',
        html: '<p><b>Functional coverage</b> is user-defined: each coverpoint and bin corresponds to a feature or scenario in the verification plan. It answers <i>"have we exercised everything the specification describes?"</i> – something code coverage (Module 6) cannot.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Coverpoint & bins</h4><p>Which values (or ranges) of a signal were seen.</p></div><div class="l7-box cu"><h4>Cross</h4><p>Which <i>combinations</i> of coverpoints occurred (e.g. every op with a = 0).</p></div><div class="l7-box vio"><h4>Transition bins</h4><p>Sequences of values, e.g. <code>(EMPTY =&gt; FULL)</code> or state transitions.</p></div></div>' +
          '<p style="margin-top:12px">(Covergroup syntax: Level 6 Module 11. Here the focus is using coverage to drive verification.)</p>'
      },
      {
        id: 'st-cg', type: 'steps', title: 'Animation: bins filling up', nav: 'Bins',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Bins group the values of a coverpoint.', 'At the start, every bin is a hole.', 'Random tests hit the wide, common bins quickly.', 'The rare bins need biased constraints or directed tests.'][k], svg: cgFrame(k) }; })
      },
      { id: 'w-cov', type: 'widget', title: 'Coverage analyzer', nav: 'Coverage analyzer', intro: 'Reach 100 % coverage of all 16 bins. Watch which bins random tests fill and which need help.', build: covLab },
      {
        id: 'c-closure', type: 'concept', title: 'Coverage goals and closure', nav: 'Goals & closure',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Coverage-driven verification</h4><p>Run random regressions → read the coverage report → add constraints or directed tests for holes → repeat until goals are met.</p></div><div class="l7-box"><h4>Good coverage models</h4><p>Bins come from the plan; illegal bins flag impossible values; ignore_bins exclude what does not matter. Too many crosses = unreachable goals.</p></div></div>'
      },
      {
        id: 'rv-5', type: 'reveal', title: 'Click to reveal: coverage insights', nav: 'Reveal',
        items: [
          { q: 'Does 100 % functional coverage mean no bugs?', a: 'No – it means every modelled scenario happened while checkers watched. Missing bins in the model or weak checkers can still let bugs through.' },
          { q: 'What are illegal_bins?', a: 'Values that must never occur; hitting one reports an error.' },
          { q: 'Why are crosses expensive?', a: 'The number of bins multiplies: 8 opcodes × 10 operand bins × 4 flag bins = 320 bins.' },
          { q: 'Who decides the bins?', a: 'The verification plan, derived from the specification – not the RTL code.' }
        ]
      },
      {
        id: 'dd-5', type: 'drag', title: 'Drag & drop: coverpoint, cross or transition?', nav: 'Drag & drop',
        bins: ['Coverpoint bins', 'Cross coverage', 'Transition coverage'],
        items: [['Every opcode was executed', 0], ['Packet length 1, 2–63 and 64 seen', 0], ['Every opcode with operand 0', 1], ['Each baud rate with each parity mode', 1], ['FIFO went from EMPTY directly to FULL-1', 2], ['FSM moved IDLE → RUN → DONE', 2]]
      },
      {
        id: 'calc5', type: 'calc', title: 'Coverage calculations', nav: 'Calculate',
        items: [
          { q: 'cp_op has 8 bins, cp_a has 5 bins. How many bins does their full cross have?', a: 40, h: '8 × 5.', s: '<b>40</b>.' },
          { q: '34 of 40 bins are hit. Coverage (%)?', a: 85, h: '34 / 40.', s: '<b>85 %</b>.' },
          { q: 'a is uniform 0–255. Expected random transactions to hit a = 255 once?', a: 256, h: '1 / p.', s: '≈ <b>256</b> transactions.' }
        ]
      },
      {
        id: 'mcq5', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Functional coverage is defined by…', o: ['the verification engineer from the plan', 'the simulator automatically', 'the synthesis tool', 'the RTL lines'], a: 0, w: '' },
          { q: 'Cross coverage measures…', o: ['combinations of coverpoints', 'single values', 'code lines', 'timing'], a: 0, w: '' },
          { q: 'A coverage hole is…', o: ['a bin never hit', 'a failing test', 'a syntax error', 'an assertion'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen5', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'After 50,000 random tests, coverage is stuck at 93 %: the missing bins are all "FIFO full while reading and writing".', q: 'Best next step?', o: [{ t: 'Add a constraint/test that fills the FIFO and then does simultaneous push/pop', ok: true, w: 'Target the hole.' }, { t: 'Run 500,000 more random tests', ok: false, w: 'Diminishing returns.' }, { t: 'Delete the bins', ok: false, w: 'Only if the scenario is truly impossible.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'A covergroup contains…', o: ['coverpoints and crosses', 'assertions', 'RTL modules', 'clocks'], a: 0, w: '' },
      { d: 'Easy', q: 'Bins group…', o: ['values of a coverpoint', 'lines of code', 'test files', 'clock edges'], a: 0, w: '' },
      { d: 'Easy', q: 'Functional coverage answers…', o: ['have the planned scenarios been exercised?', 'is the RTL synthesizable?', 'is timing met?', 'is DRC clean?'], a: 0, w: '' },
      { d: 'Medium', q: '4 × 6 cross has how many bins?', o: ['10', '24', '46', '64'], a: 1, w: '' },
      { d: 'Medium', q: 'Transition coverage records…', o: ['sequences of values', 'single values', 'line numbers', 'gate counts'], a: 0, w: '' },
      { d: 'Medium', q: 'Rare corner bins are best closed by…', o: ['biased constraints or directed tests', 'more of the same random tests only', 'deleting them', 'synthesis'], a: 0, w: '' },
      { d: 'Medium', q: 'illegal_bins…', o: ['report an error when hit', 'are ignored', 'count toward coverage', 'add delays'], a: 0, w: '' },
      { d: 'Hard', q: '100 % functional coverage guarantees…', o: ['all modelled scenarios occurred – not that there are no bugs', 'no bugs', 'timing closure', '100 % code coverage'], a: 0, w: '' },
      { d: 'Hard', q: 'Why can a huge cross be a bad idea?', o: ['too many bins, many unreachable or irrelevant', 'it is not legal SV', 'it slows synthesis', 'it removes checks'], a: 0, w: '' },
      { d: 'Hard', q: 'Coverage-driven verification loops between…', o: ['regressions, coverage analysis and new constraints/tests', 'synthesis and layout', 'RTL and GDSII', 'ATPG and BIST'], a: 0, w: '' }
    ]
  });
})();
