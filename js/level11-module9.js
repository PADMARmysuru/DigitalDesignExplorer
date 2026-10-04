/* Level 11 · Module 9 – Verification Closure */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var HOLES = ['write when FIFO full', 'push + pop together at full', 'read when empty', 'reset during a transfer', 'parity error frame', 'maximum burst length', 'back-to-back transfers', 'ready stalled ≥ 8 cycles'];
  var TESTS = [
    { n: 'Directed: fill to full, then write and push/pop', h: [0, 1], c: 1 },
    { n: 'Directed: drain to empty, then read', h: [2], c: 1 },
    { n: 'Directed: assert reset in the middle of a burst', h: [3], c: 1 },
    { n: 'Error injection: corrupt the parity bit', h: [4], c: 1 },
    { n: 'Huge random regression: 1000 more seeds', h: [5, 6], c: 6 },
    { n: 'Random test with long-stall + back-to-back constraints', h: [6, 7], c: 2 },
    { n: 'Constrained test: burst length = maximum', h: [5], c: 1 },
    { n: 'Repeat the existing smoke test', h: [], c: 1 }
  ];
  var BUDGET = 7;

  /* ---------- Widget: verification closure challenge ---------- */
  function closeLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Verification closure challenge · 8 coverage holes, ' + BUDGET + ' simulation hours left before sign-off</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var on = {}, done = false;
    var holes = L.h('div', 'l7-svgbox'); body.appendChild(holes);
    var ch = L.h('div', 'l7-choice'); ch.style.gridTemplateColumns = '1fr'; body.appendChild(ch);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      var hit = {}, cost = 0;
      Object.keys(on).forEach(function (i) { TESTS[i].h.forEach(function (h) { hit[h] = 1; }); cost += TESTS[i].c; });
      var o = '';
      HOLES.forEach(function (h, i) { var x = 8 + (i % 4) * 148, y = 10 + Math.floor(i / 4) * 52; o += R(x, y, 140, 44, hit[i] ? 'box-ok' : 'box-bad', 8) + T(x + 70, y + 27, (hit[i] ? '✓ ' : '') + h, 't-ink t-sm'); });
      holes.innerHTML = S(600, 116, o, 'Coverage holes');
      ch.innerHTML = '';
      TESTS.forEach(function (t, i) { var b = L.h('button', on[i] ? 'is-pick' : '', (on[i] ? '☑ ' : '☐ ') + t.n + ' · <b>' + t.c + ' h</b>'); b.type = 'button'; b.addEventListener('click', function () { if (on[i]) delete on[i]; else on[i] = 1; draw(); }); ch.appendChild(b); });
      var n = Object.keys(hit).length, ok = n === HOLES.length && cost <= BUDGET;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : cost > BUDGET ? 'bad' : 'warn');
      verdict.innerHTML = (ok ? '✅ Coverage closed: 8 / 8 holes in ' + cost + ' h' : n + ' / 8 holes closed · ' + cost + ' / ' + BUDGET + ' h used') + '<small>' + (ok ? 'Targeted directed and constrained tests close holes far more cheaply than "just run more random seeds". The duplicate smoke test adds nothing.' : cost > BUDGET ? 'Over budget – which test is expensive for what it adds?' : 'Choose tests that hit the remaining red holes.') + '</small>';
      if (ok && !done) { done = true; api.done(); }
    }
    draw();
  }

  /* ---------- Widget: regression triage ---------- */
  function triage(root, api) {
    L.drill(root, api, {
      bar: 'Regression triage · what do you do with this result?', label: 'Result',
      items: [
        { q: 'Last night: 2,000 tests, 37 failures – all with the same error message from the scoreboard.', o: ['Debug one failure: probably a single bug causing all 37', 'File 37 separate bugs', 'Disable the scoreboard', 'Ignore – 98 % pass'], a: 0, w: 'Cluster failures by signature before filing bugs.' },
        { q: 'A test fails only with seed 9182.', o: ['Re-run with seed 9182, debug, and add it to the regression after the fix', 'Delete the seed', 'Change the constraints so it never happens', 'Mark as flaky'], a: 0, w: 'The seed reproduces the scenario exactly.' },
        { q: 'The full regression takes 30 hours but must run every night.', o: ['Prioritise: fast sanity set on every check-in, full set weekly, rank tests by coverage contribution', 'Run fewer seeds of everything at random', 'Stop running regressions', 'Buy no compute; skip tests'], a: 0, w: 'Test prioritisation keeps feedback fast without losing coverage.' },
        { q: 'A bug was fixed in the RTL yesterday.', o: ['Add a test that reproduces it, so the regression guards against its return', 'Nothing more is needed', 'Delete the old test', 'Disable related assertions'], a: 0, w: 'Every fixed bug becomes a regression test.' }
      ]
    });
  }

  function bugFrame(k) {
    var o = '', found = [3, 8, 14, 18, 15, 10, 6, 3, 1, 0], cum = 0;
    o += P('M50 160H570M50 160V20', 'w');
    found.forEach(function (f, i) { if (i > k * 3 + 2) return; cum += f; var x = 60 + i * 50; o += '<rect x="' + x + '" y="' + (160 - f * 7) + '" width="34" height="' + f * 7 + '" rx="4" fill="#ff3b30" opacity=".7"/>' + T(x + 17, 174, 'w' + (i + 1), 't-dim t-sm'); });
    o += T(310, 14, ['Early: few bugs – tests are still being written', 'Peak: environment complete, bugs found quickly', 'Decline: design matures', 'Near zero for weeks + coverage goals met → closure'][k], 't-vio t-b t-sm');
    return S(600, 186, o, 'Bug discovery rate');
  }

  L.module({
    n: 9,
    lead: 'Verification is never "finished" – it is closed, based on evidence. Learn how teams find and close coverage holes, organise regressions, track bugs and decide, with metrics, that a design is ready for sign-off.',
    tags: ['coverage holes', 'regression testing', 'test prioritisation', 'coverage analysis', 'bug tracking', 'metrics', 'coverage closure', 'sign-off'],
    sections: [
      {
        id: 'st-bug', type: 'steps', title: 'Animation: the bug discovery curve', nav: 'Bug curve',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Week 1–3: the environment is being built.', 'Weeks 4–6: most bugs are found.', 'Weeks 7–9: the design matures; bugs become rare and subtle.', 'Weeks with zero new bugs + all coverage goals met = evidence for sign-off.'][k], svg: bugFrame(k) }; })
      },
      {
        id: 'c-holes', type: 'concept', title: 'Analysing and closing coverage holes', nav: 'Coverage holes',
        html: '<div class="l7-grid3"><div class="l7-box sig"><h4>Reachable but rare</h4><p>bias constraints or write a directed test</p></div><div class="l7-box cu"><h4>Blocked by constraints</h4><p>constraints are too tight – relax them</p></div><div class="l7-box vio"><h4>Unreachable</h4><p>remove from the model or exclude with a documented reason</p></div></div>'
      },
      { id: 'w-close', type: 'widget', title: 'Verification closure challenge', nav: 'Closure challenge', intro: 'Choose tests that close all 8 holes within 7 simulation hours.', build: closeLab },
      {
        id: 'c-reg', type: 'concept', title: 'Regressions, prioritisation and bug tracking', nav: 'Regressions & bugs',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Regression levels</h4><ul><li>sanity set on every check-in (minutes)</li><li>nightly random regression (hours)</li><li>weekly full regression with code coverage</li></ul></div><div class="l7-box"><h4>Bug tracking</h4><ul><li>every bug: ID, severity, failing test + seed, owner, status</li><li>fixed bugs get a regression test</li><li>metrics: open bugs by severity, find/fix rates</li></ul></div></div>'
      },
      { id: 'w-tri', type: 'widget', title: 'Regression triage', nav: 'Triage drill', intro: 'Decide the right action for each regression result.', build: triage },
      {
        id: 'c-signoff', type: 'concept', title: 'Sign-off criteria', nav: 'Sign-off',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Criterion</th><th>Typical target</th></tr><tr><td>Functional coverage</td><td>100 % (or reviewed exclusions)</td></tr><tr><td>Code coverage</td><td>≥ 95–100 % with reviewed exclusions</td></tr><tr><td>Assertions</td><td>all enabled, none failing, all covered</td></tr><tr><td>Regression</td><td>100 % pass for several consecutive runs</td></tr><tr><td>Bugs</td><td>no open critical/major bugs; rate near zero</td></tr></table></div>'
      },
      {
        id: 'rv-9', type: 'reveal', title: 'Click to reveal: closure insights', nav: 'Reveal',
        items: [
          { q: 'Why not simply run more random seeds to close every hole?', a: 'Rare scenarios need exponentially more seeds; targeted tests are far cheaper.' },
          { q: 'What is a flaky test?', a: 'One that passes or fails unpredictably – usually a testbench race or uncontrolled randomness. It must be fixed, not ignored.' },
          { q: 'Why rank tests by coverage contribution?', a: 'A small set of tests often provides most coverage; run those first for fast feedback.' },
          { q: 'Who signs off verification?', a: 'The verification lead with design and project leads, against the exit criteria in the plan.' }
        ]
      },
      {
        id: 'dd-9', type: 'drag', title: 'Drag & drop: how to close the hole?', nav: 'Drag & drop',
        bins: ['Write a targeted test', 'Relax constraints', 'Exclude (unreachable)'],
        items: [['FIFO full + write never hit', 0], ['reset during burst never hit', 0], ['length 64 impossible because max was set to 32', 1], ['ERROR packets excluded by a too-strict constraint', 1], ['default branch of a fully decoded case', 2], ['bin for a feature removed from the spec', 2]]
      },
      {
        id: 'mcq9', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Coverage closure means…', o: ['all coverage goals in the plan are met', 'tests stopped failing', 'the deadline arrived', 'RTL compiles'], a: 0, w: '' },
          { q: 'A fixed bug should…', o: ['get a regression test', 'be forgotten', 'disable its test', 'remove coverage'], a: 0, w: '' },
          { q: 'Many failures with one signature usually mean…', o: ['one underlying bug', 'many unrelated bugs', 'a broken simulator', 'nothing'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen9', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Coverage is 100 %, regressions are green, but 4 major bugs are still open.', q: 'Can verification sign off?', o: [{ t: 'No – open major bugs violate the exit criteria', ok: true, w: 'All criteria must be met.' }, { t: 'Yes – coverage is 100 %', ok: false, w: 'Coverage is only one criterion.' }, { t: 'Yes, if line coverage is 100 %', ok: false, w: 'No.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'A coverage hole is…', o: ['a coverage bin never hit', 'a failing test', 'a bug report', 'a timing path'], a: 0, w: '' },
      { d: 'Easy', q: 'Regression testing re-runs…', o: ['the test suite after changes', 'synthesis', 'place and route', 'ATPG'], a: 0, w: '' },
      { d: 'Easy', q: 'Each fixed bug should get…', o: ['a regression test', 'no test', 'a waiver', 'a new DUT'], a: 0, w: '' },
      { d: 'Medium', q: 'A hole caused by over-tight constraints is closed by…', o: ['relaxing the constraint', 'excluding it', 'more seeds', 'ignoring it'], a: 0, w: '' },
      { d: 'Medium', q: 'A sanity regression is…', o: ['a fast subset run on every check-in', 'the full weekly run', 'a coverage report', 'a bug list'], a: 0, w: '' },
      { d: 'Medium', q: 'Which is a sign-off criterion?', o: ['no open critical bugs', 'most tests pass', 'RTL compiles', 'layout is DRC clean'], a: 0, w: '' },
      { d: 'Medium', q: 'Unreachable coverage is handled by…', o: ['documented exclusion', 'running forever', 'deleting the DUT', 'more constraints'], a: 0, w: '' },
      { d: 'Hard', q: 'A falling bug rate with 100 % coverage over several weeks indicates…', o: ['readiness for sign-off', 'missing tests', 'a broken testbench', 'nothing'], a: 0, w: '' },
      { d: 'Hard', q: 'Why prioritise tests by coverage contribution?', o: ['fast feedback with most coverage first', 'it removes bugs', 'it is required by UVM', 'it shortens the RTL'], a: 0, w: '' },
      { d: 'Hard', q: 'A flaky test should be…', o: ['fixed – its randomness or race removed', 'ignored', 'run more often', 'deleted silently'], a: 0, w: '' }
    ]
  });
})();
