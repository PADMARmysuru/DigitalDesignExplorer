/* Level 14 · Module 9 – AI-Assisted VLSI Design */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  function rng(seed) { var a = seed; return function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
  var CFG = (function () {
    var r = rng(17), out = [];
    [16, 32, 64].forEach(function (l1) { [1, 2, 4].forEach(function (w) { [5, 8, 12].forEach(function (d) {
      var ipc = (0.55 + 0.32 * Math.log2(w) * 0.9) * (1 + 0.08 * Math.log2(l1 / 16)) * (1 - 0.025 * (d - 5));
      var f = 1.0 + 0.11 * (d - 5), perf = ipc * f;
      var power = 0.35 * w * f * (1 + 0.15 * Math.log2(l1 / 16)) + 0.1 * d / 5;
      var area = 0.6 + 0.45 * w + 0.012 * l1 + 0.03 * d;
      var noise = function () { return 1 + (r() - 0.5) * 0.16; };
      out.push({ l1: l1, w: w, d: d, perf: perf, power: power, area: area, pp: perf * noise(), pw: power * noise(), pa: area * noise() });
    }); }); });
    return out;
  })();
  var PMAX = 1.6, AMAX = 2.6, BUDGET = 6;
  var BEST = CFG.filter(function (c) { return c.power <= PMAX && c.area <= AMAX; }).sort(function (a, b) { return b.perf - a.perf; })[0];

  /* ---------- Widget: AI design space explorer ---------- */
  function dseLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>AI design space explorer · surrogate model + a few real evaluations</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var ev = {}, sel = null, done = false;
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">27 processor configurations</span> (L1 16/32/64 KB × issue width 1/2/4 × pipeline depth 5/8/12). A real evaluation (synthesis + place-and-route + simulation) takes a day; the surrogate model predicts in milliseconds but has ±8 % error. <span class="k">Goal</span> within ' + BUDGET + ' real evaluations, find the highest-performance design with power ≤ ' + PMAX + ' W and area ≤ ' + AMAX + ' mm².'));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var info = L.h('div', 'l7-readout'); body.appendChild(info);
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function lbl(c) { return 'L1 ' + c.l1 + ' KB · ' + c.w + '-wide · ' + c.d + ' stages'; }
    function draw() {
      var o = '', X0 = 60, Y0 = 230, sx = 230, sy = 75;
      o += P('M' + X0 + ' ' + Y0 + 'H580M' + X0 + ' ' + Y0 + 'V20', 'w') + T(320, 254, 'predicted power (W)', 't-dim t-sm') + T(20, 120, 'perf', 't-dim t-sm');
      o += '<line x1="' + (X0 + PMAX * sx) + '" x2="' + (X0 + PMAX * sx) + '" y1="20" y2="' + Y0 + '" stroke="#ff3b30" stroke-dasharray="5 4"/>' + T(X0 + PMAX * sx + 4, 30, 'power limit', 't-bad t-sm', 'start');
      CFG.forEach(function (c, i) {
        var e = ev[i], px = e ? c.power : c.pw, py = e ? c.perf : c.pp, X = X0 + Math.min(2.2, px) * sx, Y = Y0 - py * sy, fe = c.power <= PMAX && c.area <= AMAX;
        o += '<circle class="dse-pt" data-i="' + i + '" cx="' + X + '" cy="' + Y + '" r="' + (i === sel ? 10 : 7) + '" fill="' + (e ? (fe ? '#34c759' : '#ff3b30') : (c.pa <= AMAX ? '#0071e3' : '#8e8e93')) + '" opacity="' + (e ? 1 : 0.55) + '" stroke="' + (i === sel ? '#1d1d1f' : 'none') + '" stroke-width="2" style="cursor:pointer"/>';
      });
      o += T(420, 210, '○ blue = predicted within area · grey = predicted too big', 't-dim t-sm') + T(420, 224, '● green/red = really evaluated: feasible / infeasible', 't-dim t-sm');
      pic.innerHTML = S(600, 262, o, 'Design space');
      L.$$('circle.dse-pt', pic).forEach(function (c) { c.addEventListener('click', function () { sel = +c.getAttribute('data-i'); draw(); }); });
      var n = Object.keys(ev).length, c = sel !== null ? CFG[sel] : null;
      info.innerHTML = c ? '<b>' + lbl(c) + '</b><br><span class="k">surrogate</span> perf ' + c.pp.toFixed(2) + ' · power ' + c.pw.toFixed(2) + ' W · area ' + c.pa.toFixed(2) + ' mm²' + (ev[sel] ? '<br><span class="k">real</span> perf ' + c.perf.toFixed(2) + ' · power ' + c.power.toFixed(2) + ' W · area ' + c.area.toFixed(2) + ' mm²' : '') : 'Tap a design point to inspect its prediction.';
      row.innerHTML = '';
      if (c && !ev[sel]) { var b = L.btn('🔬 Run real evaluation (' + (BUDGET - n) + ' left)', 'pri', function () { ev[sel] = 1; draw(); }); b.disabled = n >= BUDGET; row.appendChild(b); }
      row.appendChild(L.btn('↺ Start over', 'ghost', function () { ev = {}; sel = null; draw(); }));
      var feas = Object.keys(ev).map(Number).filter(function (i) { return CFG[i].power <= PMAX && CFG[i].area <= AMAX; }).sort(function (a, b) { return CFG[b].perf - CFG[a].perf; });
      var bestFound = feas.length ? CFG[feas[0]] : null, ok = bestFound && bestFound.perf >= BEST.perf * 0.97;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : n >= BUDGET ? 'bad' : 'warn');
      verdict.innerHTML = 'Real evaluations used: ' + n + ' / ' + BUDGET + (bestFound ? ' · best feasible so far: <b>' + lbl(bestFound) + '</b>, perf ' + bestFound.perf.toFixed(2) : '') + '<small>' +
        (ok ? '✅ Found an optimal (or within 3 %) design with only ' + n + ' real runs instead of 27. The surrogate narrowed the search; real evaluations confirmed it – the essence of AI-assisted design-space exploration.' : n >= BUDGET ? 'Budget used up without the best design. Start over and evaluate only the most promising points near the limits.' : 'Use the surrogate to pick promising points: high predicted performance, predicted power just under the limit, predicted area acceptable. Its ±8 % error means points close to the limits need checking.') + '</small>';
      if (ok && !done) { done = true; api.done(); }
    }
    draw();
  }

  function haFrame(k) {
    var o = R(40, 40, 200, 90, 'box-on', 10) + T(140, 80, 'Engineer', 't-ink t-b') + T(140, 100, 'goals, judgement, sign-off', 't-dim t-sm') + R(360, 40, 200, 90, 'box-vio', 10) + T(460, 80, 'AI assistant', 't-ink t-b') + T(460, 100, 'predict, search, suggest', 't-dim t-sm');
    if (k >= 1) o += P('M240 70H360', 'w-on') + T(300, 62, 'constraints & intent', 't-sig t-sm');
    if (k >= 2) o += P('M360 105H240', 'w-cu') + T(300, 124, 'ranked options + reasons', 't-cu t-sm');
    o += T(300, 162, ['Two partners with different strengths', 'The engineer sets goals and constraints', 'The AI explores and proposes; the engineer verifies and decides'][k], 't-vio t-b t-sm');
    return S(600, 176, o, 'Human + AI engineering');
  }

  L.module({
    n: 9,
    lead: 'AI does not design chips alone – it helps engineers explore more options, predict results faster and debug and verify more efficiently. Learn surrogate models, design-space exploration and multi-objective PPA optimisation, and the right division of work between human and AI.',
    tags: ['AI-assisted EDA', 'surrogate models', 'design-space exploration', 'multi-objective optimisation', 'PPA', 'AI-assisted debugging', 'AI-assisted verification', 'human + AI'],
    sections: [
      {
        id: 'c-sur', type: 'concept', title: 'Surrogate models and multi-objective PPA', nav: 'Surrogates & PPA',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Surrogate model</h4><p>A fast ML model trained on past evaluations that predicts power, performance and area (PPA) for new settings – replacing a day-long flow run with a millisecond estimate.</p></div><div class="l7-box cu"><h4>Multi-objective optimisation</h4><p>PPA goals conflict: the best designs form a <b>Pareto front</b> where no metric can improve without another getting worse. Constraints (power, area limits) select the useful part of it.</p></div></div>'
      },
      { id: 'w-dse', type: 'widget', title: 'AI design space explorer', nav: 'DSE lab', intro: 'Use the surrogate predictions to choose which designs to evaluate for real. Find the best feasible design within 6 evaluations.', build: dseLab },
      {
        id: 'st-ha', type: 'steps', title: 'Animation: human + AI engineering', nav: 'Human + AI',
        frames: [0, 1, 2].map(function (k) { return { t: ['The engineer brings goals, experience and responsibility; AI brings speed and breadth.', 'The engineer states intent and constraints.', 'AI proposes ranked options with predictions; the engineer checks with real tools and decides.'][k], svg: haFrame(k) }; })
      },
      {
        id: 'c-assist', type: 'concept', title: 'AI assistance across the flow', nav: 'AI assistance',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Area</th><th>Example of assistance</th><th>Human role</th></tr><tr><td>RTL & debugging</td><td>suggest likely root causes from failing logs and waveforms</td><td>confirm the bug, write the fix</td></tr><tr><td>Verification</td><td>prioritise tests, propose constraints (Module 4)</td><td>own the plan and sign-off</td></tr><tr><td>Synthesis / P&R</td><td>tune tool settings with surrogates</td><td>set targets, review results</td></tr><tr><td>Architecture</td><td>explore configurations (this lab)</td><td>choose the trade-off</td></tr></table></div><p>Any AI suggestion – including code from generative AI – must pass the same verification and sign-off as human work.</p>'
      },
      {
        id: 'rv-9', type: 'reveal', title: 'Click to reveal: AI-assisted design insights', nav: 'Reveal',
        items: [
          { q: 'Why not trust the surrogate\'s best point directly?', a: 'Its ±8 % error can hide a design just over the power limit – real evaluation is needed near constraints.' },
          { q: 'What is a Pareto-optimal design?', a: 'One where no metric can be improved without worsening another.' },
          { q: 'How does the surrogate improve over time?', a: 'Every real evaluation becomes new training data, so predictions near interesting regions get better.' },
          { q: 'Who is responsible for an AI-suggested design decision?', a: 'The engineering team – AI is a tool, not the signatory.' }
        ]
      },
      {
        id: 'dd-9', type: 'drag', title: 'Drag & drop: AI task or human task?', nav: 'Drag & drop',
        bins: ['AI assistant', 'Engineer'],
        items: [['predict PPA for 10,000 settings', 0], ['rank failing tests by likely root cause', 0], ['propose candidate constraints', 0], ['decide the final trade-off', 1], ['approve tape-out', 1], ['verify AI-generated RTL', 1]]
      },
      {
        id: 'mcq9', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'A surrogate model…', o: ['predicts results of slow tools quickly', 'replaces sign-off', 'writes masks', 'is a test pattern'], a: 0, w: '' },
          { q: 'The Pareto front contains designs where…', o: ['no metric improves without another worsening', 'all metrics are best', 'power is zero', 'area is maximal'], a: 0, w: '' },
          { q: 'AI-generated RTL must…', o: ['be verified like any other RTL', 'skip verification', 'be synthesised only', 'be ignored'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen9', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A surrogate predicts a configuration at 1.58 W against a 1.60 W limit with the best performance.', q: 'What do you do?', o: [{ t: 'Run a real evaluation before committing – it is within the model\'s error of the limit', ok: true, w: 'Verify near constraints.' }, { t: 'Choose it without checking', ok: false, w: 'It may violate the limit.' }, { t: 'Discard it', ok: false, w: 'It may be the best design.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Design-space exploration searches…', o: ['many configurations for the best trade-off', 'one configuration', 'test patterns only', 'masks'], a: 0, w: '' },
      { d: 'Easy', q: 'PPA stands for…', o: ['power, performance, area', 'pins, pads, area', 'placement, partition, assembly', 'process, power, analysis'], a: 0, w: '' },
      { d: 'Easy', q: 'The final design decision is taken by…', o: ['the engineers', 'the surrogate', 'the simulator', 'nobody'], a: 0, w: '' },
      { d: 'Medium', q: 'A surrogate with ±8 % error is most risky for points…', o: ['near the constraint limits', 'far from limits', 'with low performance', 'never'], a: 0, w: '' },
      { d: 'Medium', q: 'Multi-objective optimisation deals with…', o: ['conflicting goals', 'one goal', 'no constraints', 'only area'], a: 0, w: '' },
      { d: 'Medium', q: 'Every real evaluation can…', o: ['become new training data for the surrogate', 'remove the need for the model', 'lower power', 'add pins'], a: 0, w: '' },
      { d: 'Medium', q: '27 configurations, 6 real runs: fraction evaluated ≈', o: ['22 %', '6 %', '50 %', '100 %'], a: 0, w: '' },
      { d: 'Hard', q: 'Why combine surrogates with real evaluations?', o: ['speed of prediction + accuracy of confirmation', 'surrogates are exact', 'real tools are fast', 'it is required by law'], a: 0, w: '' },
      { d: 'Hard', q: 'AI-assisted debugging mainly provides…', o: ['ranked likely causes, not guaranteed answers', 'certain bug fixes', 'masks', 'GDSII'], a: 0, w: '' },
      { d: 'Hard', q: 'A Pareto-optimal design can still be rejected because…', o: ['it violates a hard constraint', 'it is optimal', 'it has low area', 'it is on the front'], a: 0, w: '' }
    ]
  });
})();
