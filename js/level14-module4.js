/* Level 14 · Module 4 – ML for Verification */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  /* t: runtime (h); churn: touches recently changed RTL; past: past failure rate; cov: new coverage; bug: really fails tonight (ground truth) */
  var TESTS = [
    { n: 'smoke_reset', t: 0.2, churn: 0, past: 0.01, cov: 1, bug: false },
    { n: 'alu_random_long', t: 2.5, churn: 0, past: 0.02, cov: 6, bug: false },
    { n: 'fifo_full_corner', t: 0.6, churn: 1, past: 0.20, cov: 4, bug: true },
    { n: 'uart_baud_sweep', t: 1.8, churn: 0, past: 0.03, cov: 5, bug: false },
    { n: 'axi_backpressure', t: 0.9, churn: 1, past: 0.15, cov: 7, bug: true },
    { n: 'regfile_collide', t: 0.4, churn: 0, past: 0.05, cov: 3, bug: false },
    { n: 'cache_evict_storm', t: 1.2, churn: 1, past: 0.25, cov: 6, bug: true },
    { n: 'irq_nested', t: 0.7, churn: 0, past: 0.04, cov: 2, bug: false },
    { n: 'dma_scatter', t: 2.0, churn: 0, past: 0.06, cov: 8, bug: false },
    { n: 'power_gating_seq', t: 1.5, churn: 1, past: 0.03, cov: 4, bug: false },
    { n: 'boot_rom_check', t: 0.3, churn: 0, past: 0.01, cov: 1, bug: false },
    { n: 'mmu_page_walk', t: 2.2, churn: 0, past: 0.08, cov: 7, bug: false }
  ];
  function mlScore(x) { return 1 / (1 + Math.exp(-(-3.2 + 2.1 * x.churn + 9 * x.past))); }   // trained logistic model (illustrative weights)
  function order(kind) {
    var a = TESTS.slice();
    if (kind === 'short') a.sort(function (p, q) { return p.t - q.t; });
    if (kind === 'ml') a.sort(function (p, q) { return mlScore(q) / q.t - mlScore(p) / p.t; });
    return a;
  }

  /* ---------- Widget: AI verification assistant ---------- */
  function vLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>AI verification assistant · nightly regression prioritisation</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var kind = 'file', budget = 4, tried = {}, done = false;
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Situation</span> 12 tests, 16.3 h in total, but only a few hours of compute before the morning review. Tonight 3 tests will expose new bugs (unknown to you). <span class="k">Goal</span> find all 3 bugs within 4 h.'));
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    L.select(row, 'Ordering strategy', [['file', 'File order (as listed)'], ['short', 'Shortest tests first'], ['ml', 'ML ranking: failure probability per hour']], kind, function (v) { kind = v; draw(); });
    L.slider(body, 'Compute budget', 1, 12, 0.5, budget, function (v) { return v + ' h'; }, function (v) { budget = v; draw(); });
    var tbl = L.h('div', 'l7-table-wrap'); body.appendChild(tbl);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      tried[kind] = 1;
      var o = order(kind), used = 0, found = 0, cov = 0, rows = '';
      o.forEach(function (x, i) {
        var run = used + x.t <= budget + 1e-9;
        if (run) { used += x.t; cov += x.cov; if (x.bug) found++; }
        rows += '<tr><td>' + (i + 1) + '</td><td class="l7-mono">' + x.n + '</td><td>' + x.t + ' h</td><td>' + (100 * mlScore(x)).toFixed(0) + ' %</td><td>' + (run ? (x.bug ? '🐞 FAIL – bug found' : '✓ pass') : '<span style="opacity:.5">not run</span>') + '</td></tr>';
      });
      tbl.innerHTML = '<table class="l7-cmp"><tr><th>#</th><th>Test</th><th>Runtime</th><th>ML fail prob.</th><th>Tonight</th></tr>' + rows + '</table>';
      var ok = found === 3 && budget <= 4;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : 'warn');
      verdict.innerHTML = 'Bugs found: <b>' + found + ' / 3</b> using ' + used.toFixed(1) + ' h · coverage points ' + cov + '<small>' + (ok ? '✅ The model – trained on which tests failed after past code changes – put the risky tests first. All bugs found in ' + used.toFixed(1) + ' h instead of a full night. The full regression still runs at the weekend.' : kind !== 'ml' ? 'Compare with the ML ranking.' : 'Keep the budget at 4 h or less.') + '</small>';
      if (ok && !done && Object.keys(tried).length >= 2) { done = true; api.done(); }
      else if (ok && !done) verdict.innerHTML += '<small>Try one other strategy too, to compare.</small>';
    }
    draw();
  }

  /* ---------- Widget: anomaly detection in regression logs ---------- */
  function anDrill(root, api) {
    L.drill(root, api, {
      bar: 'ML for verification · what is the model telling you?', label: 'Observation',
      items: [
        { q: 'An anomaly detector flags a test whose simulation time jumped from 12 min to 95 min, although it still passes.', o: ['Investigate – a hang-like slowdown or livelock may hide a bug', 'Ignore – it passed', 'Delete the test', 'Lower the coverage goal'], a: 0, w: 'Anomalies in logs often reveal bugs before failures do.' },
        { q: 'A coverage-prediction model says 3 constraint changes would hit 40 of the 52 remaining holes.', o: ['Try those constraints first, then confirm with real coverage', 'Sign off coverage now', 'Remove the holes', 'Ignore coverage'], a: 0, w: 'Predictions prioritise effort; real simulation confirms.' },
        { q: 'A bug-prediction model ranks a recently rewritten, complex RTL file as highest risk.', o: ['Add directed tests and review that file first', 'Skip verification of other files forever', 'Revert the file', 'Nothing'], a: 0, w: 'Risk ranking focuses limited verification effort.' },
        { q: 'An ML test generator proposes stimulus that reaches a never-hit FSM transition.', o: ['Add it to the regression and keep the coverage', 'Reject it because a model made it', 'Remove the transition', 'Lower the coverage target'], a: 0, w: 'Generated tests are judged by the coverage and checks they produce.' }
      ]
    });
  }

  L.module({
    n: 4,
    lead: 'Verification (Level 11) consumes most of a chip project\'s compute and engineering time. ML helps decide which tests to run first, predicts coverage and bug-prone code, generates stimulus for hard-to-reach scenarios and spots anomalies in regression results.',
    tags: ['test generation', 'coverage prediction', 'coverage closure', 'bug prediction', 'anomaly detection', 'regression prioritisation'],
    sections: [
      {
        id: 'c-uses', type: 'concept', title: 'ML across the verification loop', nav: 'Applications',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Task</th><th>What the model learns</th></tr><tr><td>Regression prioritisation</td><td>which tests tend to fail after which code changes</td></tr><tr><td>Coverage prediction / closure</td><td>which constraints or tests hit which coverage holes</td></tr><tr><td>Bug prediction</td><td>which RTL files are risky (churn, complexity, history)</td></tr><tr><td>Test generation</td><td>stimulus that drives the design into rare states</td></tr><tr><td>Anomaly detection</td><td>"normal" regression behaviour – and what deviates</td></tr></table></div><p>The verification environment (assertions, scoreboards, coverage – Level 11) stays the judge of correctness.</p>'
      },
      { id: 'w-ver', type: 'widget', title: 'AI verification assistant', nav: 'Verification assistant', intro: 'Choose an ordering strategy and budget. Find all three bugs within 4 hours, and compare at least two strategies.', build: vLab },
      { id: 'w-an', type: 'widget', title: 'What is the model telling you?', nav: 'ML signals drill', intro: 'Decide how to act on each ML signal.', build: anDrill },
      {
        id: 'rv-4', type: 'reveal', title: 'Click to reveal: verification ML insights', nav: 'Reveal',
        items: [
          { q: 'Why divide failure probability by runtime?', a: 'A cheap test with moderate risk can be more valuable per hour than an expensive one.' },
          { q: 'Does prioritisation replace the full regression?', a: 'No – the full suite still runs regularly; prioritisation gives fast feedback.' },
          { q: 'Where do the training labels come from?', a: 'From the history of past regressions: which tests failed after which commits.' },
          { q: 'Can an ML-generated test be wrong?', a: 'It can be useless, but not "wrong": checkers decide pass/fail, and coverage shows its value.' }
        ]
      },
      {
        id: 'dd-4', type: 'drag', title: 'Drag & drop: which ML application?', nav: 'Drag & drop',
        bins: ['Regression prioritisation', 'Coverage closure', 'Anomaly detection'],
        items: [['run risky tests first after a commit', 0], ['rank tests by failure probability per hour', 0], ['suggest constraints for remaining holes', 1], ['predict which bins a test will hit', 1], ['flag a sudden simulation slowdown', 2], ['flag an unusual log message pattern', 2]]
      },
      {
        id: 'mcq4', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Regression prioritisation aims to…', o: ['find failures earlier with limited compute', 'skip verification', 'remove tests', 'increase runtime'], a: 0, w: '' },
          { q: 'Bug prediction usually uses features such as…', o: ['code churn and complexity', 'layout density', 'mask count', 'pad count'], a: 0, w: '' },
          { q: 'Who decides whether a test passes?', o: ['the checkers and scoreboard', 'the ML model', 'the scheduler', 'nobody'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen4', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'After an ML scheduler was introduced, the team stopped running the full regression at all.', q: 'What is the risk?', o: [{ t: 'Bugs in tests the model ranks low may be missed – keep periodic full runs', ok: true, w: 'Models are imperfect.' }, { t: 'None – the model is always right', ok: false, w: 'No model is.' }, { t: 'Coverage will increase', ok: false, w: 'It will not.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'ML regression prioritisation decides…', o: ['the order of tests', 'the RTL', 'the floorplan', 'the masks'], a: 0, w: '' },
      { d: 'Easy', q: 'Anomaly detection looks for…', o: ['unusual behaviour in results/logs', 'cache misses', 'clock skew', 'pin counts'], a: 0, w: '' },
      { d: 'Easy', q: 'Coverage closure ML predicts…', o: ['which tests/constraints hit remaining holes', 'die yield', 'IR drop', 'routing'], a: 0, w: '' },
      { d: 'Medium', q: 'Labels for a failure-prediction model come from…', o: ['past regression results', 'layout files', 'test patterns', 'random numbers'], a: 0, w: '' },
      { d: 'Medium', q: 'A test with 30 % fail probability and 0.5 h runtime vs 40 % and 2 h – which first (per hour)?', o: ['the 0.5 h test', 'the 2 h test', 'either', 'neither'], a: 0, w: '0.6/h vs 0.2/h.' },
      { d: 'Medium', q: 'Code churn means…', o: ['how much code changed recently', 'coverage', 'simulation speed', 'number of tests'], a: 0, w: '' },
      { d: 'Medium', q: 'ML-generated stimulus is valuable if it…', o: ['reaches new coverage or finds bugs', 'is long', 'is random', 'is short'], a: 0, w: '' },
      { d: 'Hard', q: 'Why keep periodic full regressions with an ML scheduler?', o: ['the model can rank a failing test low', 'models are exact', 'it is free', 'coverage requires it by law'], a: 0, w: '' },
      { d: 'Hard', q: 'A passing test that becomes 8× slower is worth investigating because…', o: ['it may indicate livelock or a performance bug', 'slow tests are illegal', 'it lowers coverage', 'it is not'], a: 0, w: '' },
      { d: 'Hard', q: 'ML in verification complements…', o: ['assertions, scoreboards and coverage', 'tape-out', 'GDSII', 'packaging'], a: 0, w: '' }
    ]
  });
})();
