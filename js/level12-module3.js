/* Level 12 · Module 3 – Advanced ATPG */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var PATS = [[1, 2, 3, 4], [3, 4, 5], [5, 6, 7, 8], [8, 9], [9, 10, 11], [11, 12, 1], [2, 6, 10], [4, 7, 12]];

  /* ---------- Widget: ATPG challenge (pattern compaction) ---------- */
  function atpgLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>ATPG challenge · 12 collapsed faults, 8 candidate patterns</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    body.appendChild(L.h('p', 'l7-hint', 'Fault simulation found which faults each pattern detects. Select patterns to reach 100 % fault coverage with as few patterns as possible – every pattern costs tester time.'));
    var on = {}, done = false;
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      var det = {}; Object.keys(on).forEach(function (p) { PATS[p].forEach(function (f) { det[f] = (det[f] || 0) + 1; }); });
      var o = T(80, 18, 'faults →', 't-dim t-sm', 'end');
      for (var f = 1; f <= 12; f++) o += R(84 + (f - 1) * 40, 6, 34, 20, det[f] ? 'box-ok' : 'box-bad', 4) + T(101 + (f - 1) * 40, 21, 'f' + f, 't-ink t-sm');
      PATS.forEach(function (ps, i) {
        var y = 36 + i * 30;
        o += '<g class="click" data-i="' + i + '" role="button" tabindex="0">' + R(4, y, 70, 24, on[i] ? 'box-on' : 'box', 6) + T(39, y + 17, (on[i] ? '☑ ' : '☐ ') + 'P' + (i + 1), 't-ink t-b t-sm') + '</g>';
        ps.forEach(function (f) { o += '<circle cx="' + (101 + (f - 1) * 40) + '" cy="' + (y + 12) + '" r="7" fill="' + (on[i] ? '#34c759' : '#c7c7cc') + '"/>'; });
      });
      pic.innerHTML = S(580, 280, o, 'Fault detection matrix');
      L.$$('g.click', pic).forEach(function (g) { g.addEventListener('click', function () { var i = g.getAttribute('data-i'); if (on[i]) delete on[i]; else on[i] = 1; draw(); }); });
      var n = Object.keys(det).length, np = Object.keys(on).length, cov = Math.round(100 * n / 12);
      out.innerHTML = '<span class="k">Fault coverage</span> <span class="' + (n === 12 ? 'v' : 'c') + '">' + cov + ' % (' + n + ' / 12)</span> · <span class="k">patterns</span> ' + np + ' · <span class="k">redundant detections</span> ' + Object.keys(det).reduce(function (s, f) { return s + det[f] - 1; }, 0);
      var ok = n === 12 && np <= 4;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : n === 12 ? 'warn' : 'bad');
      verdict.innerHTML = ok ? '✅ 100 % coverage with ' + np + ' patterns – fully compacted<small>The minimum is 4: no 3 patterns cover all 12 faults. ATPG tools do this with static compaction (merging compatible patterns) and dynamic compaction (filling don\'t-cares to detect extra faults).</small>' : n === 12 ? '⚠️ 100 % coverage, but ' + np + ' patterns<small>Some patterns only detect faults that others already catch. Can you do it with 4?</small>' : 'Coverage ' + cov + ' %<small>Red faults are still undetected.</small>';
      if (ok && !done) { done = true; api.done(); }
    }
    draw();
  }

  /* ---------- Widget: coverage improvement drill ---------- */
  function covDrill(root, api) {
    L.drill(root, api, {
      bar: 'Coverage improvement · ATPG report says…', label: 'Report',
      items: [
        { q: '2.1 % of faults are "untestable – tied": logic driven by constants.', o: ['Exclude them from the coverage denominator (test coverage) or remove the redundant logic', 'Add more random patterns', 'Increase the shift speed', 'Add MBIST'], a: 0, w: 'Untestable faults cannot be detected by any pattern; report test coverage separately.' },
        { q: '1.4 % of faults are "ATPG untestable" behind a non-scan flip-flop.', o: ['Make the flip-flop scannable (or add a test point)', 'Run ATPG longer only', 'Lower compression', 'Ignore them'], a: 0, w: 'Controllability/observability fixes in the design unlock them.' },
        { q: '0.8 % "aborted" faults – the ATPG gave up after its backtrack limit.', o: ['Rerun those faults with a higher abort limit / different algorithm', 'Delete the faults', 'Add scan chains', 'Use LBIST only'], a: 0, w: 'Hard faults may still be testable with more effort.' },
        { q: 'Random-resistant faults in a 32-input AND cone are rarely detected.', o: ['Insert an observation/control test point', 'Increase the clock frequency', 'Remove compression', 'Add redundancy'], a: 0, w: 'Test points raise detection probability (important for LBIST too).' }
      ]
    });
  }

  function flowFrame(k) {
    var st = ['Fault list', 'Collapse', 'Generate test', 'Fault simulate', 'Drop detected', 'Compact'], o = '';
    st.forEach(function (s, i) { var x = 8 + i * 98; o += R(x, 50, 90, 46, i === k ? 'box-on' : i < k ? 'box-ok' : 'box', 8) + T(x + 45, 78, s, 't-ink t-b t-sm'); if (i < 5) o += P('M' + (x + 90) + ' 73H' + (x + 98), 'w'); });
    if (k >= 4) o += '<path d="M' + (8 + 4 * 98 + 45) + ' 96V122H' + (8 + 2 * 98 + 45) + 'V96" class="w-cu" fill="none"/>' + T(8 + 3.5 * 98, 138, 'loop until all faults detected / proven untestable', 't-cu t-sm');
    o += T(300, 26, ['Millions of faults for a real design', 'Equivalent faults merged (Level 5) – often 50 % fewer', 'Target one undetected fault (D-algorithm/PODEM ideas)', 'Simulate the pattern against ALL remaining faults', 'Every detected fault is removed from the list', 'Merge compatible patterns to cut pattern count'][k], 't-vio t-b t-sm');
    return S(600, 150, o, 'ATPG flow');
  }

  L.module({
    n: 3,
    lead: 'Level 5 showed how the D-algorithm and PODEM find a test for one fault. Industrial ATPG must handle millions of faults: it collapses them, generates and fault-simulates patterns in a loop, compacts the result and attacks the hard remaining faults.',
    tags: ['ATPG architecture', 'fault simulation', 'fault collapsing', 'pattern generation', 'compaction', 'optimisation', 'coverage improvement', 'efficiency'],
    sections: [
      {
        id: 'st-flow', type: 'steps', title: 'Animation: the industrial ATPG loop', nav: 'ATPG loop',
        frames: [0, 1, 2, 3, 4, 5].map(function (k) { return { t: ['Every net has stuck-at (and other) faults.', 'Fault collapsing removes equivalent faults.', 'A deterministic algorithm creates a pattern for one target fault.', 'Fault simulation checks which other faults the pattern also detects.', 'Detected faults are dropped – most patterns detect hundreds.', 'Compaction merges compatible patterns.'][k], svg: flowFrame(k) }; })
      },
      {
        id: 'c-metrics', type: 'concept', title: 'Coverage metrics and fault classes', nav: 'Metrics',
        html: '<div class="l7-eq">fault coverage = detected / all faults      test coverage = detected / testable faults      ATPG efficiency = (detected + proven untestable) / all faults</div>' +
          '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Fault class</th><th>Meaning</th></tr><tr><td>Detected (DT)</td><td>a pattern detects it</td></tr><tr><td>Untestable (UT)</td><td>redundant/tied logic – no pattern can detect it</td></tr><tr><td>ATPG-untestable (AU)</td><td>blocked by test constraints (e.g. non-scan cell)</td></tr><tr><td>Aborted (AB)</td><td>ATPG gave up – may be testable with more effort</td></tr></table></div>'
      },
      { id: 'w-atpg', type: 'widget', title: 'ATPG challenge', nav: 'ATPG challenge', intro: 'Choose the smallest set of patterns that detects all 12 faults.', build: atpgLab },
      {
        id: 'c-compact', type: 'concept', title: 'Pattern compaction and optimisation', nav: 'Compaction',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Dynamic compaction</h4><p>While generating a pattern, fill its don\'t-care bits to detect additional faults.</p></div><div class="l7-box cu"><h4>Static compaction</h4><p>After generation, merge compatible patterns and drop patterns that detect nothing new (reverse-order simulation).</p></div></div>'
      },
      { id: 'w-cov', type: 'widget', title: 'Coverage improvement', nav: 'Coverage drill', intro: 'Decide how to handle each category of undetected faults.', build: covDrill },
      {
        id: 'rv-3', type: 'reveal', title: 'Click to reveal: ATPG insights', nav: 'Reveal',
        items: [
          { q: 'Why fault-simulate every new pattern?', a: 'A pattern targeted at one fault usually detects many others; dropping them avoids generating unnecessary patterns.' },
          { q: 'Why report test coverage as well as fault coverage?', a: 'Untestable faults can never be detected; test coverage shows how well the testable part is covered.' },
          { q: 'Why do pattern counts matter?', a: 'Test time and tester memory grow with pattern count – multiplied by millions of chips.' },
          { q: 'Which fault models does modern ATPG target?', a: 'Stuck-at, transition, path-delay, bridging and cell-aware faults (Module 4).' }
        ]
      },
      {
        id: 'dd-3', type: 'drag', title: 'Drag & drop: classify the fault', nav: 'Drag & drop',
        bins: ['Detected', 'Untestable', 'ATPG-untestable', 'Aborted'],
        items: [['Found by pattern 412', 0], ['On logic tied to constant 0', 1], ['Behind a non-scan flip-flop', 2], ['Backtrack limit exceeded', 3]]
      },
      {
        id: 'calc3', type: 'calc', title: 'ATPG calculations', nav: 'Calculate',
        items: [
          { q: '1,000,000 faults; 970,000 detected; 20,000 untestable. Fault coverage (%)?', a: 97, h: '970k / 1M.', s: '<b>97 %</b>.' },
          { q: 'Same numbers: test coverage (%) (one decimal)?', a: 99, tol: 0.01, h: '970k / 980k.', s: '<b>99.0 %</b>.' },
          { q: '2,000 patterns, each 300 shift cycles, at 50 MHz: test time (ms)?', a: 12, h: '600,000 / 50 MHz.', s: '<b>12 ms</b>.' }
        ]
      },
      {
        id: 'mcq3', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Fault dropping means…', o: ['removing detected faults from the list', 'deleting hard faults', 'ignoring coverage', 'adding faults'], a: 0, w: '' },
          { q: 'Static compaction…', o: ['merges compatible patterns after generation', 'adds patterns', 'collapses faults', 'creates scan chains'], a: 0, w: '' },
          { q: 'An aborted fault…', o: ['may be testable with more ATPG effort', 'is always untestable', 'is detected', 'is a bridge'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen3', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Coverage is stuck at 96 %; most undetected faults sit behind 40 non-scan flip-flops in an IP block.', q: 'Most effective action?', o: [{ t: 'Make those flip-flops scannable (or add test points), then rerun ATPG', ok: true, w: 'Fix controllability/observability.' }, { t: 'Run ATPG 10× longer', ok: false, w: 'The faults are ATPG-untestable.' }, { t: 'Accept 96 %', ok: false, w: 'Fixable.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'ATPG generates…', o: ['test patterns', 'RTL', 'layouts', 'clocks'], a: 0, w: '' },
      { d: 'Easy', q: 'Fault collapsing…', o: ['merges equivalent faults', 'adds faults', 'simulates RTL', 'repairs memory'], a: 0, w: '' },
      { d: 'Easy', q: 'Fault simulation tells…', o: ['which faults a pattern detects', 'timing', 'power', 'area'], a: 0, w: '' },
      { d: 'Medium', q: 'Dynamic compaction fills…', o: ['don\'t-care bits to detect more faults', 'scan chains', 'memories', 'pads'], a: 0, w: '' },
      { d: 'Medium', q: '900 detected of 1000 faults, 50 untestable: test coverage ≈', o: ['94.7 %', '90 %', '95 %', '85 %'], a: 0, w: '900 / 950.' },
      { d: 'Medium', q: 'Untestable faults are typically on…', o: ['redundant or tied logic', 'scan chains', 'clock trees', 'pads'], a: 0, w: '' },
      { d: 'Medium', q: 'A test point improves…', o: ['controllability or observability', 'power', 'area', 'routing'], a: 0, w: '' },
      { d: 'Hard', q: 'Why is fault coverage lower than test coverage?', o: ['untestable faults are in the denominator', 'test coverage counts patterns', 'they are equal', 'aborted faults count twice'], a: 0, w: '' },
      { d: 'Hard', q: 'Minimum patterns to cover faults {1-4},{5-8},{9-11},{12} if no pattern spans groups…', o: ['4', '3', '2', '12'], a: 0, w: '' },
      { d: 'Hard', q: 'ATPG efficiency counts…', o: ['detected + proven untestable faults', 'only detected faults', 'patterns per second', 'aborted faults'], a: 0, w: '' }
    ]
  });
})();
