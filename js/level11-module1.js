/* Level 11 · Module 1 – Advanced Verification Methodology */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var DUTS = {
    fifo: { n: '16-deep synchronous FIFO', ok: { obj: ['order', 'flags'], test: ['crv', 'mixed'], cov: ['fillcross'], strat: ['sb'] } },
    alu: { n: '32-bit ALU (8 operations, flags)', ok: { obj: ['math', 'flags'], test: ['crv', 'mixed'], cov: ['opcross'], strat: ['ref'] } },
    uart: { n: 'UART transmitter/receiver (configurable baud, parity)', ok: { obj: ['proto', 'cfg'], test: ['mixed', 'crv'], cov: ['cfgcross'], strat: ['loop'] } }
  };
  var F = {
    obj: [['order', 'Data comes out in the same order it went in, never lost or duplicated'], ['flags', 'Status flags (full/empty, carry/zero/overflow) are always correct'], ['math', 'Every operation produces the arithmetically correct result'], ['proto', 'Frames follow the protocol (start, data, parity, stop) at every baud rate'], ['cfg', 'Every configuration (baud, parity, stop bits) works'], ['speed', 'The design runs as fast as possible']],
    test: [['dir', 'Directed tests only (hand-written cases)'], ['crv', 'Constrained-random tests with a self-checking environment'], ['mixed', 'Constrained-random plus directed tests for corner cases'], ['manual', 'Look at waveforms by eye']],
    cov: [['line', '100 % line coverage only'], ['fillcross', 'Functional: fill levels × push/pop combinations incl. full/empty corners'], ['opcross', 'Functional: every opcode × operand classes (0, max, negative) × flags'], ['cfgcross', 'Functional: baud × parity × stop-bit combinations + error frames'], ['none', 'No coverage – run until no failures']],
    strat: [['sb', 'Scoreboard with a reference queue model'], ['ref', 'Reference model computing the expected result'], ['loop', 'Loop-back: transmitter → receiver, compare with a scoreboard'], ['wave', 'Compare waveforms with a golden VCD']]
  };

  /* ---------- Widget: build a verification plan ---------- */
  function planLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Build a verification plan · choose for each line, then review</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var pick = { dut: 'fifo', obj: '', test: '', cov: '', strat: '' }, solved = {};
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    L.select(row, 'DUT', Object.keys(DUTS).map(function (k) { return [k, DUTS[k].n]; }), 'fifo', function (v) { pick.dut = v; pick.obj = pick.test = pick.cov = pick.strat = ''; draw(); });
    var form = L.h('div', ''); body.appendChild(form);
    var plan = L.h('div', ''); body.appendChild(plan);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var labels = { obj: 'Main verification objective', test: 'Test type', cov: 'Coverage goal', strat: 'Checking strategy' };
    function draw() {
      form.innerHTML = '';
      ['obj', 'test', 'cov', 'strat'].forEach(function (k) {
        var r = L.h('div', 'l7-row'); form.appendChild(r);
        L.select(r, labels[k], [['', '– choose –']].concat(F[k].slice().sort(function (a, b) { return a[1] < b[1] ? -1 : 1; })), pick[k], function (v) { pick[k] = v; draw(); });
      });
      var d = DUTS[pick.dut], bad = [];
      ['obj', 'test', 'cov', 'strat'].forEach(function (k) { if (pick[k] && d.ok[k].indexOf(pick[k]) < 0) bad.push(k); });
      var complete = ['obj', 'test', 'cov', 'strat'].every(function (k) { return pick[k]; });
      plan.innerHTML = '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Plan item</th><th>Your choice</th><th></th></tr>' + ['obj', 'test', 'cov', 'strat'].map(function (k) {
        var t = (F[k].filter(function (x) { return x[0] === pick[k]; })[0] || [0, '–'])[1];
        return '<tr><td>' + labels[k] + '</td><td>' + t + '</td><td>' + (!pick[k] ? '' : bad.indexOf(k) < 0 ? '✅' : '❌') + '</td></tr>';
      }).join('') + '</table></div>';
      if (!complete) { L.fb(fb, 'info', 'Plan for: <b>' + d.n + '</b>. Fill in every line.'); return; }
      if (bad.length) {
        var why = { obj: 'This objective does not describe what can go wrong in this DUT.', test: 'Directed-only or visual checking cannot explore the huge input space of this DUT.', cov: 'This goal does not measure the features that matter here (line coverage alone says nothing about scenarios).', strat: 'This checking method is not automatic or does not suit this DUT.' };
        L.fb(fb, 'bad', bad.map(function (k) { return '❌ <b>' + labels[k] + '</b>: ' + why[k]; }).join('<br>'));
      } else {
        solved[pick.dut] = 1;
        L.fb(fb, 'ok', '✅ A coherent plan for the ' + d.n + '. Plans solved: ' + Object.keys(solved).length + ' of 3.' + (Object.keys(solved).length < 3 ? ' Choose another DUT.' : ' 🎉 All three plans complete.'));
        if (Object.keys(solved).length === 3) api.done();
      }
    }
    draw();
  }

  function flowFrame(k) {
    var st = ['Spec', 'Verification plan', 'Testbench', 'Tests + regression', 'Coverage', 'Closure / sign-off'], o = '';
    st.forEach(function (s, i) { var x = 8 + i * 98; o += R(x, 56, 90, 50, i === k ? 'box-on' : i < k ? 'box-ok' : 'box', 10) + T(x + 45, 86, s, i <= k ? 't-ink t-b t-sm' : 't-dim t-sm'); if (i < 5) o += P('M' + (x + 90) + ' 81H' + (x + 98), 'w'); });
    if (k >= 4) o += '<path d="M' + (8 + 4 * 98 + 45) + ' 106V130H' + (8 + 3 * 98 + 45) + 'V106" class="w-cu" fill="none"/>' + T(8 + 3.9 * 98, 146, 'holes → new tests', 't-cu t-sm');
    o += T(300, 30, ['Requirements: what must the design do?', 'Features → tests, checks and coverage goals', 'Reusable, self-checking environment', 'Directed + constrained-random tests, run nightly', 'Measure what has really been exercised', 'All goals met, no open bugs → sign-off'][k], 't-vio t-b t-sm');
    return S(600, 160, o, 'Verification flow');
  }

  L.module({
    n: 1,
    lead: 'In industry, verification takes more effort than design. This module shows how professional teams organise it: from the verification plan, through strategy and testbench architecture, to regressions, metrics and the evidence that the design is ready for silicon.',
    tags: ['verification vs validation', 'pre-silicon', 'verification plan', 'strategy', 'directed vs random', 'regression', 'metrics', 'closure'],
    sections: [
      {
        id: 'c-vv', type: 'concept', title: 'Verification, validation and pre-silicon', nav: 'Verification vs validation',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Verification</h4><p><i>"Did we build the design right?"</i> – does the RTL behave as the specification says? Done pre-silicon by simulation, formal checks and emulation.</p></div><div class="l7-box cu"><h4>Validation</h4><p><i>"Did we build the right design?"</i> – does the chip work in the real system? Mostly post-silicon (Level 12).</p></div></div>' +
          '<p style="margin-top:12px">Level 6 taught the SystemVerilog constructs. Level 11 is about <b>methodology</b>: how to use them to find every bug before tape-out, when a missed bug may cost a new mask set.</p>'
      },
      {
        id: 'st-flow', type: 'steps', title: 'Animation: the verification flow', nav: 'Verification flow',
        frames: [0, 1, 2, 3, 4, 5].map(function (k) { return { t: ['Start from the <b>specification</b>.', 'The <b>verification plan</b> lists every feature, how it will be stimulated, checked and measured.', 'Build a <b>self-checking testbench</b> once and reuse it for all tests.', 'Run <b>directed and constrained-random tests</b> in nightly <b>regressions</b>.', 'Measure <b>coverage</b>; holes lead to new or better-constrained tests.', 'When all goals are met and no bugs remain open: <b>closure and sign-off</b>.'][k], svg: flowFrame(k) }; })
      },
      {
        id: 'c-plan', type: 'concept', title: 'The verification plan and strategy', nav: 'Plan & strategy',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Plan section</th><th>Example (FIFO)</th></tr><tr><td>Features</td><td>push, pop, simultaneous push/pop, full, empty, reset</td></tr><tr><td>Stimulus</td><td>random push/pop with weights; directed fill-to-full</td></tr><tr><td>Checking</td><td>scoreboard with a reference queue; assertions on flags</td></tr><tr><td>Coverage</td><td>fill level × operation, full/empty transitions</td></tr><tr><td>Exit criteria</td><td>100 % functional coverage, 0 open bugs, regression green 3 nights</td></tr></table></div>' +
          '<div class="l7-grid3"><div class="l7-box"><h4>Directed tests</h4><p>targeted, readable, good for corner cases and bring-up</p></div><div class="l7-box"><h4>Constrained-random</h4><p>explores far more scenarios automatically; needs checking and coverage</p></div><div class="l7-box"><h4>Regression</h4><p>the full test suite re-run after every change to catch new bugs</p></div></div>'
      },
      { id: 'w-plan', type: 'widget', title: 'Build a verification plan', nav: 'Plan builder', intro: 'Build a coherent plan for each of the three DUTs.', build: planLab },
      {
        id: 'c-metrics', type: 'concept', title: 'Verification metrics, goals and closure', nav: 'Metrics',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Progress metrics</h4><ul><li>functional and code coverage (Modules 5–6)</li><li>pass rate of the regression</li><li>assertion hits</li></ul></div><div class="l7-box cu"><h4>Quality metrics</h4><ul><li>bug discovery rate (should fall to ~0)</li><li>open bugs by severity</li><li>time since last bug</li></ul></div></div><p style="margin-top:12px"><b>Closure</b> is reached when the exit criteria in the plan are met – not when the team runs out of time.</p>'
      },
      {
        id: 'rv-1', type: 'reveal', title: 'Click to reveal: methodology insights', nav: 'Reveal',
        items: [
          { q: 'Why can\'t we just simulate every input combination?', a: 'A 32-bit ALU alone has 2⁶⁴ operand pairs per opcode; with internal state the space is astronomically larger. Plans and coverage focus effort on what matters.' },
          { q: 'Why must a testbench be self-checking?', a: 'Thousands of random tests run overnight; nobody can inspect waveforms. The testbench must decide pass/fail itself.' },
          { q: 'Why does the bug discovery rate matter?', a: 'A falling rate (with good coverage) suggests the design is maturing; a steady rate means many bugs remain.' },
          { q: 'Who writes the verification plan?', a: 'Verification engineers with designers and architects, reviewed against the specification so nothing is missed.' }
        ]
      },
      {
        id: 'dd-1', type: 'drag', title: 'Drag & drop: directed or constrained-random?', nav: 'Drag & drop',
        bins: ['Best as directed test', 'Best as constrained-random'],
        items: [['Reset in the middle of a transfer – one specific scenario', 0], ['Fill the FIFO exactly to full, then read once', 0], ['Thousands of mixed push/pop sequences', 1], ['All opcode/operand combinations in proportion', 1], ['First smoke test after RTL is written', 0], ['Exploring unexpected interactions', 1]]
      },
      {
        id: 'mcq1', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Verification answers…', o: ['did we build the design right?', 'did we build the right design?', 'can it be manufactured?', 'is the layout clean?'], a: 0, w: '' },
          { q: 'A regression is…', o: ['the whole test suite re-run after changes', 'a single directed test', 'a coverage report', 'a waveform'], a: 0, w: '' },
          { q: 'Exit criteria belong in…', o: ['the verification plan', 'the RTL', 'the GDSII', 'the synthesis report'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen1', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Two weeks before tape-out, all tests pass but functional coverage is 71 % and three new bugs were found last week.', q: 'Is the design ready?', o: [{ t: 'No – coverage holes and a non-zero bug rate mean closure is not reached', ok: true, w: 'Passing tests only show that the tested scenarios work.' }, { t: 'Yes – all tests pass', ok: false, w: 'Untested scenarios may hide bugs.' }, { t: 'Yes, if line coverage is 100 %', ok: false, w: 'Line coverage misses scenarios.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Pre-silicon verification happens…', o: ['before tape-out', 'after packaging', 'during wafer test', 'in the field'], a: 0, w: '' },
      { d: 'Easy', q: 'A self-checking testbench…', o: ['decides pass/fail automatically', 'needs waveform inspection', 'has no checks', 'only drives inputs'], a: 0, w: '' },
      { d: 'Easy', q: 'Constrained-random testing…', o: ['generates legal random stimulus automatically', 'uses only hand-written vectors', 'needs no checker', 'is post-silicon'], a: 0, w: '' },
      { d: 'Medium', q: 'Validation (vs verification) mainly asks…', o: ['did we build the right design?', 'is the RTL equal to the netlist?', 'is DRC clean?', 'is timing met?'], a: 0, w: '' },
      { d: 'Medium', q: 'Which is an exit criterion?', o: ['100 % functional coverage and no open critical bugs', 'all engineers agree', 'one test passes', 'RTL compiles'], a: 0, w: '' },
      { d: 'Medium', q: 'A good checking strategy for an ALU is…', o: ['a reference model computing expected results', 'waveform inspection', 'counting cycles', 'line coverage'], a: 0, w: '' },
      { d: 'Medium', q: 'Directed tests are best for…', o: ['specific corner cases and bring-up', 'exploring huge spaces', 'replacing coverage', 'timing closure'], a: 0, w: '' },
      { d: 'Hard', q: 'Why is 100 % line coverage not enough?', o: ['scenarios and combinations may still be unexercised', 'lines cannot be counted', 'it measures timing', 'it is always enough'], a: 0, w: '' },
      { d: 'Hard', q: 'A steady weekly bug-discovery rate late in a project suggests…', o: ['the design is not yet mature', 'closure is reached', 'coverage is 100 %', 'tests are too strict'], a: 0, w: '' },
      { d: 'Hard', q: 'The verification plan is primarily derived from…', o: ['the specification', 'the netlist', 'the layout', 'the test patterns'], a: 0, w: '' }
    ]
  });
})();
