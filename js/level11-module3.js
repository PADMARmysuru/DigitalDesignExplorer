/* Level 11 · Module 3 – Constrained-Random Verification */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- Widget: constraint challenge ---------- */
  function cLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Constraint challenge · edit the constraints, generate 200 packets</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var c = { lmin: 1, lmax: 8, wr: 50, ww: 50, we: 0, corner: false, noRes: false, align: false, seed: 1 }, done = false;
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Goals for one run of 200 packets</span><br>① about 10 % error packets (6–14 %) · ② at least 5 packets with the maximum length 64 · ③ no packets to reserved addresses 240–255'));
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    L.slider(c1, 'len minimum', 1, 64, 1, c.lmin, null, function (v) { c.lmin = Math.min(v, c.lmax); code(); });
    L.slider(c1, 'len maximum', 1, 64, 1, c.lmax, null, function (v) { c.lmax = Math.max(v, c.lmin); code(); });
    L.slider(c2, 'dist weight: READ', 0, 100, 5, c.wr, null, function (v) { c.wr = v; code(); });
    L.slider(c2, 'dist weight: WRITE', 0, 100, 5, c.ww, null, function (v) { c.ww = v; code(); });
    L.slider(c2, 'dist weight: ERROR', 0, 100, 1, c.we, null, function (v) { c.we = v; code(); });
    var tg = L.h('div', 'l7-row'); body.appendChild(tg);
    var tb = {};
    [['corner', 'Bias len corners (min/max) 20 %'], ['noRes', 'Exclude reserved addresses'], ['align', 'Word-aligned addresses']].forEach(function (t) { tb[t[0]] = L.btn(t[1], '', function () { c[t[0]] = !c[t[0]]; code(); }); tg.appendChild(tb[t[0]]); });
    var sr = L.h('div', 'l7-row'); body.appendChild(sr);
    var seedIn = document.createElement('input'); seedIn.className = 'l7-input'; seedIn.value = c.seed; seedIn.setAttribute('aria-label', 'Seed'); seedIn.style.width = '90px';
    sr.appendChild(L.h('span', 'l7-lab-label', 'Random seed')); sr.appendChild(seedIn);
    sr.appendChild(L.btn('▶ Generate 200 packets', 'pri', run));
    var codeBox = L.h('div', ''); body.appendChild(codeBox);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function code() {
      Object.keys(tb).forEach(function (k) { tb[k].classList.toggle('is-on', c[k]); });
      codeBox.innerHTML = L.code('class packet;\n  rand bit [6:0] len;  rand pkt_t kind;  rand bit [7:0] addr;\n  constraint c_len  { len inside {[' + c.lmin + ':' + c.lmax + ']}; }\n' +
        (c.corner ? '  constraint c_corner { len dist { ' + c.lmin + ' := 10, ' + c.lmax + ' := 10, [' + c.lmin + ':' + c.lmax + '] :/ 80 }; }\n' : '') +
        '  constraint c_kind { kind dist { READ := ' + c.wr + ', WRITE := ' + c.ww + ', ERROR := ' + c.we + ' }; }\n' +
        (c.noRes ? '  constraint c_res  { !(addr inside {[240:255]}); }\n' : '') + (c.align ? '  constraint c_algn { addr[1:0] == 2\'b00; }\n' : '') + 'endclass');
    }
    function run() {
      var seed = parseInt(seedIn.value, 10) || 1, r = rng(seed), tot = c.wr + c.ww + c.we, pk = [];
      if (!tot) { L.fb(verdict, 'bad', 'All weights are zero – the constraints have no solution (randomize() would fail).'); return; }
      for (var i = 0; i < 200; i++) {
        var len, u = r();
        if (c.corner && u < 0.2) len = u < 0.1 ? c.lmin : c.lmax; else len = c.lmin + Math.floor(r() * (c.lmax - c.lmin + 1));
        var k = r() * tot, kind = k < c.wr ? 0 : k < c.wr + c.ww ? 1 : 2;
        var addr; do { addr = Math.floor(r() * 256); if (c.align) addr &= 252; } while (c.noRes && addr >= 240);
        pk.push([len, kind, addr]);
      }
      var cnt = [0, 0, 0], maxLen = 0, res = 0, hist = [0, 0, 0, 0, 0, 0, 0, 0];
      pk.forEach(function (p) { cnt[p[1]]++; if (p[0] === 64) maxLen++; if (p[2] >= 240) res++; hist[Math.min(7, Math.floor((p[0] - 1) / 8))]++; });
      var o = '', bw = 54;
      ['READ', 'WRITE', 'ERROR'].forEach(function (n, i) { var h = cnt[i] * 0.9; o += '<rect x="' + (20 + i * 70) + '" y="' + (170 - h) + '" width="' + bw + '" height="' + h + '" rx="4" fill="' + ['#0071e3', '#34c759', '#ff3b30'][i] + '"/>' + T(47 + i * 70, 188, n, 't-dim t-sm') + T(47 + i * 70, 164 - h, cnt[i], 't-ink t-b t-sm'); });
      hist.forEach(function (v, i) { var h = v * 0.75; o += '<rect x="' + (250 + i * 40) + '" y="' + (170 - h) + '" width="32" height="' + h + '" rx="3" fill="#5856d6" opacity=".7"/>' + T(266 + i * 40, 188, (i * 8 + 1) + '–' + (i * 8 + 8), 't-dim t-sm'); });
      o += T(110, 18, 'packet kinds', 't-ink t-b t-sm') + T(400, 18, 'len histogram', 't-ink t-b t-sm');
      pic.innerHTML = S(580, 196, o, 'Generated stimulus');
      var g1 = cnt[2] >= 12 && cnt[2] <= 28, g2 = maxLen >= 5, g3 = res === 0;
      verdict.className = 'l7-verdict ' + (g1 && g2 && g3 ? 'ok' : 'bad');
      verdict.innerHTML = 'Seed ' + seed + ': ' + (g1 ? '✅' : '❌') + ' errors ' + (cnt[2] / 2).toFixed(1) + ' % · ' + (g2 ? '✅' : '❌') + ' len = 64 in ' + maxLen + ' packets · ' + (g3 ? '✅' : '❌') + ' reserved addresses hit ' + res + ' times' +
        '<small>' + (g1 && g2 && g3 ? 'All goals met. Try another seed: a good constraint set meets the goals for any seed.' : !g2 && c.lmax === 64 && !c.corner ? 'len = 64 is only 1 value in 64 – rare. Biasing the corners makes corner cases likely.' : 'Adjust the constraints and generate again. The same seed always reproduces the same packets – that is how failing random tests are debugged.') + '</small>';
      if (g1 && g2 && g3 && !done) { done = true; api.done(); }
    }
    code(); run();
  }

  function crvFrame(k) {
    var o = '';
    for (var i = 0; i < 60; i++) { var x = 40 + (i * 37) % 520, y = 30 + (i * 53) % 130, inC = k >= 1 && (x < 120 || y < 50), corner = k >= 2 && (x > 500 || x < 60); o += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="' + (k === 0 ? '#8e8e93' : inC ? '#ff3b30' : corner ? '#ff9500' : '#0071e3') + '" opacity="' + (k >= 1 && inC ? 0.25 : 0.8) + '"/>'; }
    if (k >= 1) o += '<rect x="30" y="20" width="90" height="150" fill="rgba(255,59,48,.08)" stroke="#ff3b30" stroke-dasharray="4 3"/>' + T(75, 186, 'illegal: excluded', 't-bad t-sm');
    if (k === 3) o += T(330, 186, 'seed 42 → same packets every run (reproducible)', 't-vio t-b t-sm');
    o += T(330, 14, ['Pure random: anything, including illegal inputs', 'Constraints remove illegal combinations', 'Weights (dist) push stimulus into corners', 'A seed makes every random run reproducible'][k], 't-vio t-b t-sm');
    return S(600, 196, o, 'Constrained random');
  }

  L.module({
    n: 3,
    lead: 'Constrained-random verification lets the computer write thousands of tests – but only if the constraints describe legal stimulus and steer it toward the corners where bugs hide. Learn to design, weight and debug constraints, and to use seeds and regressions.',
    tags: ['random stimulus', 'constraints', 'dist weights', 'seeds', 'corner cases', 'illegal cases', 'directed vs random', 'regressions'],
    sections: [
      {
        id: 'st-crv', type: 'steps', title: 'Animation: from random to constrained-random', nav: 'Random → constrained',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Unconstrained random values waste time on illegal inputs the DUT never receives.', 'Constraints define the <b>legal</b> input space.', 'Distribution weights make rare but important <b>corner cases</b> frequent.', 'Every run uses a <b>seed</b>; re-running a failing seed reproduces the bug exactly.'][k], svg: crvFrame(k) }; })
      },
      {
        id: 'c-design', type: 'concept', title: 'Designing good constraints', nav: 'Constraint design',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Legal space</h4><p>Encode the specification\'s rules (ranges, alignment, reserved values) as hard constraints.</p></div><div class="l7-box cu"><h4>Interesting space</h4><p>Use <code>dist</code> weights and soft constraints to bias toward boundaries, maximum sizes, back-to-back operations.</p></div><div class="l7-box vio"><h4>Illegal cases on purpose</h4><p>Error-injection tests disable a constraint (<code>constraint_mode(0)</code>) to check the DUT rejects bad input.</p></div><div class="l7-box"><h4>Test-specific control</h4><p>Tests extend or override constraints (inline <code>with {}</code>) without editing the class.</p></div></div>' +
          '<p style="margin-top:12px">(Constraint syntax itself: Level 6 Module 8.)</p>'
      },
      { id: 'w-con', type: 'widget', title: 'Constraint challenge', nav: 'Constraint lab', intro: 'Change the constraints until one run of 200 packets meets all three goals. Then try other seeds.', build: cLab },
      {
        id: 'c-reg', type: 'concept', title: 'Seeds, regressions and directed vs random', nav: 'Regressions',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th></th><th>Directed</th><th>Constrained-random</th></tr><tr><td>Effort per scenario</td><td>high</td><td>very low after setup</td></tr><tr><td>Unexpected bugs</td><td>rarely found</td><td>often found</td></tr><tr><td>Needs</td><td>expected results per test</td><td>self-checking scoreboard + coverage</td></tr><tr><td>Reproducibility</td><td>always</td><td>via the seed</td></tr></table></div>' +
          '<p>A <b>random regression</b> runs each test with many seeds every night. A failing seed is logged so it can be re-run for debugging and added to the regression.</p>'
      },
      {
        id: 'rv-3', type: 'reveal', title: 'Click to reveal: constrained-random insights', nav: 'Reveal',
        items: [
          { q: 'Why can random testing miss corner cases?', a: 'A value like len = 64 out of 1–64 occurs only 1.6 % of the time; combinations of rare values are even rarer. Weights and coverage feedback fix this.' },
          { q: 'What happens with contradictory constraints?', a: 'randomize() fails and returns 0 – testbenches must check its return value.' },
          { q: 'Why log the seed?', a: 'Without it a failing random test cannot be reproduced.' },
          { q: 'Should constraints be as tight as possible?', a: 'No – over-constraining hides bugs. Only exclude what the specification forbids.' }
        ]
      },
      {
        id: 'dd-3', type: 'drag', title: 'Drag & drop: what kind of constraint?', nav: 'Drag & drop',
        bins: ['Legal-space rule', 'Corner-case bias', 'Error injection'],
        items: [['addr not in reserved range', 0], ['len inside {[1:64]}', 0], ['len dist { 64 := 10 }', 1], ['back-to-back writes weighted high', 1], ['turn off the parity constraint', 2], ['allow a length of 0 in one test', 2]]
      },
      {
        id: 'calc3', type: 'calc', title: 'Stimulus calculations', nav: 'Calculate',
        items: [
          { q: 'len is uniform over 1–64. In 200 packets, how many are expected to have len = 64?', a: 3.125, tol: 0.01, h: '200 / 64.', s: '≈ <b>3.1</b>.' },
          { q: 'Weights READ 45, WRITE 45, ERROR 10. What percentage are errors?', a: 10, h: '10 / 100.', s: '<b>10 %</b>.' },
          { q: 'A nightly regression runs 40 tests × 25 seeds. How many simulations?', a: 1000, h: '40 × 25.', s: '<b>1000</b>.' }
        ]
      },
      {
        id: 'mcq3', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'A random seed makes a test…', o: ['reproducible', 'faster', 'directed', 'synthesizable'], a: 0, w: '' },
          { q: 'dist weights are used to…', o: ['bias the distribution of values', 'remove randomness', 'measure coverage', 'add delays'], a: 0, w: '' },
          { q: 'Over-constraining stimulus…', o: ['can hide bugs', 'always finds more bugs', 'is required', 'speeds up the DUT'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen3', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A random test failed last night, but re-running it today passes.', q: 'Most likely reason?', o: [{ t: 'It ran with a different seed – re-run with the logged failing seed', ok: true, w: 'Seeds make random tests reproducible.' }, { t: 'The bug fixed itself', ok: false, w: 'Bugs do not fix themselves.' }, { t: 'Random tests cannot be debugged', ok: false, w: 'They can, with the seed.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Constraints define…', o: ['the legal stimulus space', 'the RTL', 'the clock period', 'coverage'], a: 0, w: '' },
      { d: 'Easy', q: 'To reproduce a random failure you need the…', o: ['seed', 'netlist', 'layout', 'SDC'], a: 0, w: '' },
      { d: 'Easy', q: 'A corner case is…', o: ['a boundary or rare situation', 'any random value', 'a syntax error', 'a timing path'], a: 0, w: '' },
      { d: 'Medium', q: 'Weights 70/20/10: share of the third kind =', o: ['10 %', '20 %', '70 %', '33 %'], a: 0, w: '' },
      { d: 'Medium', q: 'Error-injection tests typically…', o: ['disable a legal-space constraint on purpose', 'remove the DUT', 'skip checking', 'use no randomisation'], a: 0, w: '' },
      { d: 'Medium', q: 'Contradictory constraints make randomize()…', o: ['fail and return 0', 'pick any value', 'ignore constraints', 'crash the DUT'], a: 0, w: '' },
      { d: 'Medium', q: 'Uniform 1–100: expected count of value 100 in 500 samples =', o: ['5', '50', '1', '100'], a: 0, w: '' },
      { d: 'Hard', q: 'Constrained-random testing needs…', o: ['a self-checking environment and coverage', 'only waveforms', 'only directed vectors', 'no reference model'], a: 0, w: '' },
      { d: 'Hard', q: 'An inline constraint (randomize() with {…}) lets…', o: ['a test add constraints without editing the class', 'the class be synthesised', 'seeds be removed', 'coverage be skipped'], a: 0, w: '' },
      { d: 'Hard', q: 'Why should regressions run many seeds per test?', o: ['each seed explores different random scenarios', 'seeds speed up simulation', 'it is required by SV', 'seeds add coverage bins'], a: 0, w: '' }
    ]
  });
})();
