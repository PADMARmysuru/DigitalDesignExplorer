/* Level 14 · Module 8 – AI for Processor Architecture */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  function rng(seed) { var a = seed; return function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
  /* educational branch trace: per loop iteration – a data-dependent branch X (random), 5 loop/biased branches,
     then Y1 = X and Y2 = !X (correlated with an outcome 6–7 branches back) */
  var KIND = { 0x10: 'data-dependent (random)', 0x20: 'loop / biased', 0x24: 'loop / biased', 0x28: 'loop / biased', 0x2c: 'loop / biased', 0x30: 'loop / biased', 0x40: 'correlated (= X)', 0x44: 'correlated (= not X)' };
  var TRACE = (function () { var r = rng(9), t = []; for (var i = 0; i < 300; i++) { var x = r() < 0.5; t.push([0x10, x]); [0x20, 0x24, 0x28, 0x2c].forEach(function (pc) { t.push([pc, true]); }); t.push([0x30, i % 10 !== 9]); t.push([0x40, x]); t.push([0x44, !x]); } return t; })();

  function twoBit(trace) { var c = {}, miss = 0, per = {}; trace.forEach(function (b) { var v = c[b[0]] === undefined ? 1 : c[b[0]], p = v >= 2; if (p !== b[1]) { miss++; per[b[0]] = (per[b[0]] || 0) + 1; } c[b[0]] = b[1] ? Math.min(3, v + 1) : Math.max(0, v - 1); }); return { miss: miss, per: per }; }
  function perceptron(trace, h) {
    var W = {}, hist = [], miss = 0, per = {}, th = Math.floor(1.93 * h + 14);
    for (var k = 0; k < h; k++) hist.push(-1);
    trace.forEach(function (b) {
      var w = W[b[0]] || (W[b[0]] = new Array(h + 1).fill(0)), y = w[0];
      for (var i = 0; i < h; i++) y += w[i + 1] * hist[i];
      var p = y >= 0, t = b[1] ? 1 : -1;
      if (p !== b[1]) { miss++; per[b[0]] = (per[b[0]] || 0) + 1; }
      if (p !== b[1] || Math.abs(y) <= th) { w[0] = Math.max(-127, Math.min(127, w[0] + t)); for (i = 0; i < h; i++) w[i + 1] = Math.max(-127, Math.min(127, w[i + 1] + t * hist[i])); }
      hist.unshift(t); hist.pop();
    });
    return { miss: miss, per: per, W: W };
  }

  /* ---------- Widget: AI branch prediction demonstrator ---------- */
  function bpLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>AI branch prediction demonstrator · 2-bit counters vs a simplified perceptron predictor</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var h = 4, seen = {}, done = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    L.select(row, 'Perceptron global-history length', [['4', '4 branches'], ['8', '8 branches'], ['16', '16 branches']], '4', function (v) { h = +v; draw(); });
    var tbl = L.h('div', 'l7-table-wrap'); body.appendChild(tbl);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      seen[h] = 1;
      var a = twoBit(TRACE), b = perceptron(TRACE, h), n = TRACE.length, accA = 100 * (1 - a.miss / n), accB = 100 * (1 - b.miss / n);
      var cnt = {}; TRACE.forEach(function (t) { cnt[t[0]] = (cnt[t[0]] || 0) + 1; });
      var groups = {}; Object.keys(KIND).forEach(function (pc) { var g = KIND[pc]; groups[g] = groups[g] || { n: 0, a: 0, b: 0 }; groups[g].n += cnt[pc]; groups[g].a += a.per[pc] || 0; groups[g].b += b.per[pc] || 0; });
      tbl.innerHTML = '<table class="l7-cmp"><tr><th>Branch type</th><th>Count</th><th>2-bit mispredictions</th><th>Perceptron (h = ' + h + ') mispredictions</th></tr>' +
        Object.keys(groups).map(function (g) { var x = groups[g]; return '<tr><td>' + g + '</td><td>' + x.n + '</td><td>' + x.a + '</td><td class="' + (x.b < x.a ? 'better' : x.b > x.a ? 'worse' : '') + '">' + x.b + '</td></tr>'; }).join('') +
        '<tr><td><b>All branches</b></td><td>' + n + '</td><td><b>' + a.miss + ' (' + accA.toFixed(1) + ' % accuracy)</b></td><td><b>' + b.miss + ' (' + accB.toFixed(1) + ' %)</b></td></tr></table>';
      var w = b.W[0x40] || [], o = T(300, 16, 'learned weights of the perceptron for branch Y1 (bar height = influence of each past outcome)', 't-dim t-sm');
      for (var i = 1; i < w.length; i++) { var v = w[i], x = 40 + (i - 1) * (520 / Math.max(1, w.length - 1)), hh = Math.min(70, Math.abs(v) * 0.6); o += '<rect x="' + x + '" y="' + (v >= 0 ? 100 - hh : 100) + '" width="' + Math.max(8, 400 / w.length) + '" height="' + hh + '" fill="' + (v >= 0 ? '#34c759' : '#ff3b30') + '"/>' + T(x + 6, 186, i, 't-dim t-sm'); }
      o += P('M30 100H580', 'w-thin') + T(300, 200, 'history position (1 = most recent branch)', 't-dim t-sm');
      pic.innerHTML = S(600, 206, o, 'Perceptron weights');
      var gain = accB - accA, ok = gain >= 10 && seen[4] && (seen[8] || seen[16]);
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : 'warn');
      verdict.innerHTML = 'Perceptron − 2-bit = <b>' + (gain >= 0 ? '+' : '') + gain.toFixed(1) + ' points</b><small>' +
        (ok ? '✅ With a long enough history the perceptron learns that Y1 and Y2 depend on X, 6–7 branches earlier – the tall weight bar. A 2-bit counter only sees its own branch\'s past, so it is stuck at chance for them. No predictor can foresee the random branch X.' : h === 4 ? 'With only 4 branches of history, the outcome of X is out of sight when Y1 and Y2 execute. Increase the history length.' : 'Also try history length 4 to see the difference.') + '</small>';
      if (ok && !done) { done = true; api.done(); }
    }
    draw();
  }

  function adFrame(k) {
    var o = '', items = [['Branch prediction', 'learned correlations in history'], ['Cache replacement / prefetching', 'predict which data is needed next'], ['Resource scheduling', 'adapt issue/power to the workload'], ['Performance prediction', 'estimate IPC of a design before building it']];
    items.forEach(function (it, i) { o += R(20, 14 + i * 40, 560, 34, i === k ? 'box-on' : 'box', 8) + T(32, 36 + i * 40, it[0] + ' – ' + it[1], i === k ? 't-ink t-b t-sm' : 't-dim t-sm', 'start'); });
    return S(600, 180, o, 'ML in processors');
  }

  L.module({
    n: 8,
    lead: 'Processors (Level 13) already make predictions billions of times per second: branch direction, which data to keep in the cache, what to prefetch. Learning-based structures, from perceptron branch predictors to adaptive prefetchers, improve those guesses within strict hardware budgets.',
    tags: ['ML branch prediction', 'cache prediction', 'prefetching', 'adaptive architecture', 'resource scheduling', 'performance prediction', 'runtime adaptation'],
    sections: [
      {
        id: 'st-ad', type: 'steps', title: 'Animation: where processors use learning', nav: 'Applications',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Perceptron and neural-inspired predictors learn correlations across long branch histories.', 'Learned replacement and prefetch policies predict future memory accesses.', 'Run-time adaptation tunes resources (issue width, power states) to the current workload.', 'Offline ML models predict the performance of architecture choices before RTL exists.'][k], svg: adFrame(k) }; })
      },
      {
        id: 'c-perc', type: 'concept', title: 'The perceptron branch predictor (simplified)', nav: 'Perceptron predictor',
        html: '<div class="l7-eq">y = w₀ + Σ wᵢ · xᵢ      xᵢ = +1 (taken) / −1 (not taken) for the last h branches      predict taken if y ≥ 0</div>' +
          '<p>Each branch has a small vector of weights. After the outcome is known, the weights move toward the correct answer (only when wrong or unsure). History length grows only linearly in hardware, so long correlations can be captured – something table-based counters cannot do cheaply. This published idea (2001) inspired predictors used in commercial processors. Real designs must fit in a single clock cycle and a tight area and power budget.</p>'
      },
      { id: 'w-bp', type: 'widget', title: 'AI branch prediction demonstrator', nav: 'Predictor demo', intro: 'Compare the predictors with history length 4, then with 8 or 16. The perceptron must beat the 2-bit counters by at least 10 points.', build: bpLab },
      {
        id: 'c-hw', type: 'concept', title: 'Hardware constraints on "AI in the processor"', nav: 'Hardware limits',
        html: '<div class="l7-grid3"><div class="l7-box sig"><h4>Latency</h4><p>a prediction must be ready in about one cycle</p></div><div class="l7-box cu"><h4>Area & power</h4><p>weight tables and adders cost silicon and energy on every fetch</p></div><div class="l7-box vio"><h4>Online learning</h4><p>training happens in hardware, continuously, with simple update rules</p></div></div>'
      },
      {
        id: 'rv-8', type: 'reveal', title: 'Click to reveal: architecture ML insights', nav: 'Reveal',
        items: [
          { q: 'Why can no predictor guess branch X?', a: 'Its outcome is random data – there is no pattern to learn. Accuracy has an upper limit set by the program itself.' },
          { q: 'Why do the weights show which history bit matters?', a: 'A large weight means that past outcome strongly influences the prediction – the model is interpretable.' },
          { q: 'Why not use a deep neural network in the fetch stage?', a: 'It would be far too slow and power-hungry for one prediction per cycle.' },
          { q: 'What is adaptive architecture?', a: 'Hardware that changes its behaviour at run time (prefetch aggressiveness, power modes) based on learned workload behaviour.' }
        ]
      },
      {
        id: 'dd-8', type: 'drag', title: 'Drag & drop: which predictor handles it?', nav: 'Drag & drop',
        bins: ['2-bit counter is enough', 'Needs long history (e.g. perceptron)', 'Unpredictable'],
        items: [['loop branch taken 99 times, then not taken', 0], ['always-taken error check', 0], ['branch equal to a branch 10 branches earlier', 1], ['branch depending on two earlier branches', 1], ['branch on random input data', 2]]
      },
      {
        id: 'mcq8', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'A perceptron predictor predicts taken when…', o: ['the weighted sum y ≥ 0', 'y < 0 always', 'the PC is even', 'history is empty'], a: 0, w: '' },
          { q: 'Longer history helps when…', o: ['a branch correlates with outcomes far back', 'branches are random', 'there are no branches', 'caches miss'], a: 0, w: '' },
          { q: 'Learned prefetchers predict…', o: ['future memory accesses', 'branch direction only', 'clock skew', 'routing'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen8', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A team proposes a large neural network predictor with 3-cycle latency to gain 0.5 % accuracy.', q: 'What is the main concern?', o: [{ t: 'The extra latency and power can cost more performance than the accuracy gain', ok: true, w: 'Hardware constraints dominate.' }, { t: 'Accuracy should always be maximised', ok: false, w: 'Not at any cost.' }, { t: 'Neural networks cannot predict branches', ok: false, w: 'They can – the issue is cost.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Branch predictors predict…', o: ['whether a branch will be taken', 'cache size', 'clock speed', 'register count'], a: 0, w: '' },
      { d: 'Easy', q: 'Perceptron weights are trained…', o: ['online, in hardware, as branches resolve', 'once at the factory only', 'by the compiler only', 'never'], a: 0, w: '' },
      { d: 'Easy', q: 'Prefetching aims to…', o: ['bring data into the cache before it is needed', 'predict branches', 'lower voltage', 'route nets'], a: 0, w: '' },
      { d: 'Medium', q: 'Why does a 2-bit counter fail on correlated branches?', o: ['it only sees its own branch\'s history', 'it is too large', 'it uses global history', 'it is always 50 %'], a: 0, w: '' },
      { d: 'Medium', q: 'Perceptron hardware grows with history length…', o: ['linearly', 'exponentially', 'not at all', 'quadratically always'], a: 0, w: '' },
      { d: 'Medium', q: '2400 branches, 120 mispredictions → accuracy =', o: ['95 %', '88 %', '5 %', '98 %'], a: 0, w: '' },
      { d: 'Medium', q: 'A random data-dependent branch is best predicted at about…', o: ['50 %', '100 %', '0 %', '90 %'], a: 0, w: '' },
      { d: 'Hard', q: 'The main hardware limit for ML predictors is…', o: ['prediction latency, area and power', 'accuracy only', 'pin count', 'mask cost'], a: 0, w: '' },
      { d: 'Hard', q: 'A large perceptron weight for history position 6 means…', o: ['the outcome 6 branches ago strongly influences the prediction', 'position 6 is ignored', 'the branch is random', 'the PC is 6'], a: 0, w: '' },
      { d: 'Hard', q: 'Run-time adaptation means hardware…', o: ['changes behaviour based on observed workload', 'is redesigned', 'stops learning', 'skips branches'], a: 0, w: '' }
    ]
  });
})();
