/* Level 12 · Module 4 – Advanced Fault Models */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var CASES = [
    { title: 'Die #1 – fails the same patterns at slow and at-speed test', obs: { slow: [3, 7, 12], fast: [3, 7, 12] },
      cands: [['n7 stuck-at-0', { slow: [3, 7, 12], fast: [3, 7, 12] }], ['n7 stuck-at-1', { slow: [1, 4], fast: [1, 4] }], ['n9 slow-to-rise (transition)', { slow: [], fast: [3, 7, 12] }], ['bridge n7–n8 (n8 dominant)', { slow: [3, 12], fast: [3, 12] }]], a: 0,
      why: 'A permanent wrong value fails at any speed: a static (stuck-at-like) defect such as an open via forcing n7 low.' },
    { title: 'Die #2 – passes slow scan test, fails only at-speed patterns', obs: { slow: [], fast: [5, 9] },
      cands: [['n12 stuck-at-0', { slow: [5, 9], fast: [5, 9] }], ['n12 slow-to-rise (transition)', { slow: [], fast: [5, 9] }], ['n3 small-delay defect (+80 ps, short path)', { slow: [], fast: [] }], ['bridge n12–n13', { slow: [5], fast: [5, 9] }]], a: 1,
      why: 'Correct logic, wrong timing: only the at-speed launch/capture interval reveals the slow transition (Module 8). A small extra delay on a path with lots of slack would pass both.' },
    { title: 'Die #3 – fails patterns 2 and 6 only (pattern 10 passes), at both speeds', obs: { slow: [2, 6], fast: [2, 6] },
      cands: [['n20 stuck-at-1', { slow: [2, 6, 10], fast: [2, 6, 10] }], ['bridge n20–n21 (n21 dominant when n20 = 0, n21 = 1)', { slow: [2, 6], fast: [2, 6] }], ['n20 slow-to-fall', { slow: [], fast: [2, 6] }], ['cell-internal open in U44', { slow: [6], fast: [6] }]], a: 1,
      why: 'Pattern 10 sets n20 = 0 but n21 = 0, so the bridge stays invisible – a pattern-dependent failure typical of bridging faults. A stuck-at fault would also fail pattern 10.' }
  ];
  function same(a, b) { return a.length === b.length && a.every(function (x, i) { return x === b[i]; }); }

  /* ---------- Widget: fault diagnosis lab ---------- */
  function diagLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Fault diagnosis lab · match tester failures to a fault model</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = 0, solved = {};
    var tabs = L.h('div', 'l7-row'); body.appendChild(tabs);
    var view = L.h('div', ''); body.appendChild(view);
    function fmt(a) { return a.length ? a.map(function (p) { return 'P' + p; }).join(', ') : 'none'; }
    function draw() {
      tabs.innerHTML = '';
      CASES.forEach(function (c, i) { tabs.appendChild(L.btn((solved[i] ? '✓ ' : '') + 'Die #' + (i + 1), i === cur ? 'is-on' : '', function () { cur = i; draw(); })); });
      var c = CASES[cur]; view.innerHTML = '';
      view.appendChild(L.h('h4', '', c.title));
      view.appendChild(L.h('div', 'l7-readout', '<span class="k">Tester log</span><br>slow (stuck-at) scan patterns failing: <b>' + fmt(c.obs.slow) + '</b><br>at-speed (transition) patterns failing: <b>' + fmt(c.obs.fast) + '</b>'));
      view.appendChild(L.h('p', '', '<b>Which candidate fault explains the log exactly?</b> (predictions come from fault simulation)'));
      var ch = L.h('div', 'l7-choice'); ch.style.gridTemplateColumns = '1fr'; view.appendChild(ch);
      var fb = L.h('div', 'l7-fb'); view.appendChild(fb);
      c.cands.forEach(function (cd, k) {
        var b = L.h('button', solved[cur] && k === c.a ? 'is-right' : '', '<b>' + cd[0] + '</b><br><span style="font-weight:500;font-size:.85em">predicts slow: ' + fmt(cd[1].slow) + ' · at-speed: ' + fmt(cd[1].fast) + '</span>'); b.type = 'button';
        b.addEventListener('click', function () {
          var match = same(cd[1].slow, c.obs.slow) && same(cd[1].fast, c.obs.fast);
          L.$$('button', ch).forEach(function (x) { x.classList.remove('is-right', 'is-wrong'); });
          b.classList.add(match ? 'is-right' : 'is-wrong');
          if (match) { solved[cur] = 1; L.fb(fb, 'ok', '✓ Exact match. ' + c.why); if (Object.keys(solved).length === 3) { api.done(); fb.innerHTML += '<br>🎉 All three dies diagnosed: a static defect, a delay defect and a bridge.'; } tabs.innerHTML = ''; CASES.forEach(function (cc, i) { tabs.appendChild(L.btn((solved[i] ? '✓ ' : '') + 'Die #' + (i + 1), i === cur ? 'is-on' : '', function () { cur = i; draw(); })); }); }
          else L.fb(fb, 'bad', '✗ The prediction does not match the log – compare the failing patterns at both speeds.');
        });
        ch.appendChild(b);
      });
      if (solved[cur]) L.fb(fb, 'ok', '✓ ' + c.why);
    }
    draw();
  }

  function caFrame(k) {
    var o = R(40, 30, 220, 130, 'box', 10) + T(150, 50, 'NAND2 cell (inside)', 't-dim t-b t-sm');
    o += R(80, 70, 50, 26, 'box-on', 4) + T(105, 88, 'pMOS', 't-ink t-sm') + R(170, 70, 50, 26, 'box-on', 4) + T(195, 88, 'pMOS', 't-ink t-sm') + R(125, 120, 50, 26, 'box-cu', 4) + T(150, 138, 'nMOS ×2', 't-ink t-sm');
    if (k >= 1) o += '<circle cx="195" cy="83" r="16" fill="none" stroke="#ff3b30" stroke-width="3"/>' + T(195, 115, 'open', 't-bad t-b t-sm');
    o += T(420, 60, ['Classic models work at cell pins only', 'A defect inside the cell (e.g. one open pMOS)', 'behaves like no pin-level fault', 'Cell-aware ATPG uses per-cell defect libraries'][k], 't-vio t-b t-sm');
    o += T(420, 84, ['stuck-at, transition on inputs/outputs', 'output rises only for some input combinations', 'and may escape stuck-at tests', 'from transistor-level simulation of each cell'][k], 't-dim t-sm');
    return S(600, 180, o, 'Cell-aware fault');
  }

  L.module({
    n: 4,
    lead: 'Level 5 introduced stuck-at, bridging, open, transition and path-delay faults. Modern processes produce defects that stuck-at tests miss. Go deeper: two-pattern delay tests, pattern-dependent bridges, cell-internal defects and small delays – and use them to diagnose failing silicon.',
    tags: ['transition faults', 'path-delay faults', 'bridging faults', 'opens', 'cell-aware faults', 'small-delay defects', 'defect modelling', 'diagnosis'],
    sections: [
      {
        id: 'c-delay', type: 'concept', title: 'Delay fault models in depth', nav: 'Delay faults',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Transition fault</h4><p>A node is slow to rise or fall. Needs a <b>two-pattern test</b>: V1 initialises the node, V2 launches the transition, and it is captured one functional clock later. Location-based: easy to count, like stuck-at.</p></div><div class="l7-box cu"><h4>Path-delay fault</h4><p>The cumulative delay of a whole path is too large. Robust tests guarantee detection regardless of other delays; non-robust tests may be masked. Only critical paths are targeted – there are too many paths.</p></div></div>'
      },
      {
        id: 'c-adv', type: 'concept', title: 'Bridges, opens, cell-aware and small-delay defects', nav: 'Advanced models',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Model</th><th>Behaviour</th><th>Test requirement</th></tr>' +
          '<tr><td>Bridging fault</td><td>two nets shorted; dominant, wired-AND/OR behaviour</td><td>drive the two nets to opposite values and observe the victim</td></tr>' +
          '<tr><td>Open fault</td><td>broken wire/via: floating or delayed node</td><td>often behaves like stuck-at or transition; resistive opens need delay tests</td></tr>' +
          '<tr><td>Cell-aware fault</td><td>defect inside a standard cell (transistor open/short)</td><td>specific input combinations from a per-cell defect library</td></tr>' +
          '<tr><td>Small-delay defect</td><td>a little extra delay (tens of ps)</td><td>test through the <b>longest</b> paths (timing-aware ATPG) so the slack is small</td></tr></table></div>'
      },
      {
        id: 'st-ca', type: 'steps', title: 'Animation: a defect inside a cell', nav: 'Cell-aware',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Classic fault models only look at cell pins.', 'Real defects often sit inside cells.', 'An internal open may fail only for one input combination – a stuck-at test set may never apply it.', 'Cell-aware ATPG targets these defects explicitly, cutting escapes (DPPM).'][k], svg: caFrame(k) }; })
      },
      { id: 'w-diag', type: 'widget', title: 'Fault diagnosis lab', nav: 'Diagnosis lab', intro: 'For each failing die, pick the candidate whose predicted failures match the tester log exactly.', build: diagLab },
      {
        id: 'rv-4', type: 'reveal', title: 'Click to reveal: fault model insights', nav: 'Reveal',
        items: [
          { q: 'Why test small-delay defects on long paths?', a: 'On a short path with lots of slack, a 50 ps extra delay still arrives in time and passes; on a near-critical path it fails.' },
          { q: 'Why are bridges pattern-dependent?', a: 'They only show when the two shorted nets are driven to opposite values – and the victim is observed.' },
          { q: 'Why not target every path-delay fault?', a: 'The number of paths grows exponentially; only critical paths are tested.' },
          { q: 'What does diagnosis enable?', a: 'Physical failure analysis targets the right spot on the die, and yield learning (Module 9) finds systematic defects.' }
        ]
      },
      {
        id: 'dd-4', type: 'drag', title: 'Drag & drop: which fault model?', nav: 'Drag & drop',
        bins: ['Transition / delay', 'Bridging', 'Cell-aware'],
        items: [['fails only at-speed', 0], ['needs a two-pattern test', 0], ['two nets shorted by a metal particle', 1], ['fails only when neighbours differ', 1], ['open transistor inside a NAND', 2], ['defect library from transistor simulation', 2]]
      },
      {
        id: 'mcq4', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'A transition fault test needs…', o: ['two patterns (initialise + launch)', 'one pattern', 'no clock', 'MBIST'], a: 0, w: '' },
          { q: 'Small-delay defects are best detected through…', o: ['long, near-critical paths', 'short paths', 'stuck-at tests', 'boundary scan'], a: 0, w: '' },
          { q: 'Cell-aware faults model defects…', o: ['inside standard cells', 'in the package', 'in the RTL', 'in the clock tree only'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen4', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'With 99 % stuck-at coverage, customers still return 400 DPPM; failure analysis finds internal cell defects and resistive vias.', q: 'What should the test team add?', o: [{ t: 'Cell-aware and transition (timing-aware) patterns', ok: true, w: 'Those defects escape stuck-at tests.' }, { t: 'More stuck-at patterns', ok: false, w: 'Coverage is already high for that model.' }, { t: 'Nothing', ok: false, w: 'DPPM is too high.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'A transition fault is…', o: ['a node too slow to switch', 'a node stuck at 0', 'a short between nets', 'a memory fault'], a: 0, w: '' },
      { d: 'Easy', q: 'A bridging fault is…', o: ['an unintended connection between nets', 'a slow path', 'a missing cell', 'a clock fault'], a: 0, w: '' },
      { d: 'Easy', q: 'Delay faults are detected by…', o: ['at-speed tests', 'slow scan only', 'visual inspection', 'LVS'], a: 0, w: '' },
      { d: 'Medium', q: 'A die failing only at-speed suggests…', o: ['a delay defect', 'a stuck-at fault', 'no defect', 'a memory fault'], a: 0, w: '' },
      { d: 'Medium', q: 'Robust path-delay tests…', o: ['detect the fault regardless of other delays', 'may be masked', 'need no launch', 'are stuck-at tests'], a: 0, w: '' },
      { d: 'Medium', q: 'Timing-aware ATPG chooses…', o: ['the longest paths through a fault site', 'the shortest paths', 'random paths', 'no paths'], a: 0, w: '' },
      { d: 'Medium', q: 'A pattern-dependent failure at both speeds suggests…', o: ['a bridge', 'a stuck-at', 'a transition fault', 'clock skew'], a: 0, w: '' },
      { d: 'Hard', q: 'Why can a cell-internal open escape stuck-at tests?', o: ['it fails only for specific input combinations', 'it is always invisible', 'it changes the clock', 'it affects only memories'], a: 0, w: '' },
      { d: 'Hard', q: 'Diagnosis compares…', o: ['observed tester failures with fault-simulation predictions', 'RTL with netlist', 'layout with schematic', 'coverage with plan'], a: 0, w: '' },
      { d: 'Hard', q: 'Why target only critical paths for path-delay faults?', o: ['the number of paths is exponential', 'other paths have no delay', 'tools cannot count', 'it improves area'], a: 0, w: '' }
    ]
  });
})();
