/* Level 14 · Module 2 – ML for VLSI Prediction */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  function rng(seed) { var a = seed; return function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
  var DATA = (function () {                        // 40 synthetic "designs": logic depth, average fan-out → critical-path delay (ns)
    var r = rng(11), out = [];
    for (var i = 0; i < 40; i++) { var d = 6 + Math.floor(r() * 24), f = 1 + r() * 4, y = 0.11 * d + 0.32 * f + 0.25 + (r() - 0.5) * 0.24; out.push({ d: d, f: f, y: y, test: i % 4 === 3 }); }
    return out;
  })();
  function mae(w, set) { var s = 0; set.forEach(function (p) { s += Math.abs(w.a * p.d + w.b * p.f + w.c - p.y); }); return s / set.length; }
  function fit(set) {                              // least squares for y = a·d + b·f + c (normal equations, 3×3)
    var X = set.map(function (p) { return [p.d, p.f, 1]; }), y = set.map(function (p) { return p.y; }), A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], v = [0, 0, 0];
    X.forEach(function (x, k) { for (var i = 0; i < 3; i++) { v[i] += x[i] * y[k]; for (var j = 0; j < 3; j++) A[i][j] += x[i] * x[j]; } });
    for (var i = 0; i < 3; i++) { var piv = A[i][i]; for (var j = i; j < 3; j++) A[i][j] /= piv; v[i] /= piv; for (var r = 0; r < 3; r++) if (r !== i) { var f = A[r][i]; for (var c = i; c < 3; c++) A[r][c] -= f * A[i][c]; v[r] -= f * v[i]; } }
    return { a: v[0], b: v[1], c: v[2] };
  }

  /* ---------- Widget: VLSI prediction lab ---------- */
  function predLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>VLSI prediction lab · predict critical-path delay before synthesis</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var train = DATA.filter(function (p) { return !p.test; }), test = DATA.filter(function (p) { return p.test; });
    var w = { a: 0.05, b: 0.1, c: 0.5 }, done = false;
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Model</span> delay ≈ a × logic depth + b × average fan-out + c · <span class="k">data</span> 30 training designs, 10 unseen test designs · <span class="k">goal</span> test MAE ≤ 0.10 ns'));
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    var sa = L.slider(c1, 'a (ns per logic level)', 0, 0.2, 0.005, w.a, function (v) { return v.toFixed(3); }, function (v) { w.a = v; draw(); });
    var sb = L.slider(c1, 'b (ns per unit fan-out)', 0, 0.6, 0.01, w.b, function (v) { return v.toFixed(2); }, function (v) { w.b = v; draw(); });
    var sc = L.slider(c2, 'c (fixed delay, ns)', 0, 1, 0.01, w.c, function (v) { return v.toFixed(2); }, function (v) { w.c = v; draw(); });
    c2.appendChild(L.btn('⚙ Train: least-squares fit on the training set', 'pri', function () { w = fit(train); setS(); draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function setS() { [[sa, w.a], [sb, w.b], [sc, w.c]].forEach(function (x) { x[0].value = x[1]; x[0].dispatchEvent(new Event('input')); }); }   // L.slider returns the range input
    function draw() {
      var o = '', X0 = 50, Y0 = 210, sc2 = 50;
      o += P('M' + X0 + ' ' + Y0 + 'H560M' + X0 + ' ' + Y0 + 'V20', 'w') + P('M' + X0 + ' ' + Y0 + 'L' + (X0 + 4.2 * sc2 * 2.3) + ' ' + (Y0 - 4.2 * sc2 * 0.9), 'w-thin');
      o += T(300, 238, 'actual delay (ns)', 't-dim t-sm') + T(20, 110, 'predicted', 't-dim t-sm');
      DATA.forEach(function (p) { var pr = w.a * p.d + w.b * p.f + w.c; o += '<circle cx="' + (X0 + p.y * sc2 * 2.3) + '" cy="' + (Y0 - Math.max(0, pr) * sc2 * 0.9) + '" r="5" fill="' + (p.test ? '#ff9500' : '#0071e3') + '" opacity=".8"/>'; });
      o += T(470, 40, '● training', 't-sig t-sm', 'start') + T(470, 58, '● test', 't-cu t-sm', 'start');
      pic.innerHTML = S(600, 246, o, 'Predicted vs actual delay');
      var mtr = mae(w, train), mte = mae(w, test), ok = mte <= 0.10;
      out.innerHTML = '<span class="k">Training MAE</span> ' + mtr.toFixed(3) + ' ns · <span class="k">test MAE</span> <span class="' + (ok ? 'v' : 'c') + '">' + mte.toFixed(3) + ' ns</span> · points on the diagonal = perfect predictions';
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : 'warn');
      verdict.innerHTML = ok ? '✅ Model generalises: test MAE ' + mte.toFixed(3) + ' ns<small>Learned: ' + w.a.toFixed(3) + ' ns per logic level, ' + w.b.toFixed(2) + ' ns per unit fan-out. Physical intuition (Level 8: more stages and more load → more delay) is confirmed by the data – and the model now predicts new designs in microseconds.</small>' : '📉 Test error ' + mte.toFixed(3) + ' ns<small>Adjust a, b, c until predictions lie on the diagonal – or train the model automatically.</small>';
      if (ok && !done) { done = true; api.done(); }
    }
    draw();
  }

  L.module({
    n: 2,
    lead: 'Many VLSI quantities are expensive to measure exactly but easy to predict roughly: timing, power, area, congestion, yield and reliability. Learn how regression and classification models estimate them early, and how to judge whether a prediction can be trusted.',
    tags: ['timing prediction', 'power prediction', 'area', 'congestion', 'yield', 'reliability', 'regression', 'error metrics'],
    sections: [
      {
        id: 'c-apps', type: 'concept', title: 'What can be predicted – and why', nav: 'Applications',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Quantity</th><th>Features (examples)</th><th>Instead of…</th></tr><tr><td>Timing</td><td>logic depth, fan-out, cell types, wire estimates</td><td>synthesis + STA</td></tr><tr><td>Power</td><td>toggle rates, gate count, clock-tree size</td><td>gate-level power simulation</td></tr><tr><td>Area</td><td>RTL operators, bit widths, memories</td><td>full synthesis</td></tr><tr><td>Congestion</td><td>pin and cell density, net crossings</td><td>global routing</td></tr><tr><td>Yield</td><td>die area, layout pattern statistics, process data</td><td>waiting for wafers</td></tr><tr><td>Reliability</td><td>current density, temperature, activity</td><td>long EM/aging simulations</td></tr></table></div>'
      },
      { id: 'w-pred', type: 'widget', title: 'VLSI prediction lab', nav: 'Prediction lab', intro: 'Fit the timing model by hand or by training, and reach a test error of 0.10 ns or less.', build: predLab },
      {
        id: 'c-metrics', type: 'concept', title: 'Judging a prediction model', nav: 'Metrics',
        html: '<div class="l7-eq">MAE = mean |predicted − actual|      R² = 1 − (squared error / variance)      accuracy, precision, recall for classes</div><p>For sign-off-critical quantities a model is used for <b>early estimates and ranking</b>; the exact tool still decides. A model that is right "on average" may still be badly wrong for the one critical path that matters.</p>'
      },
      {
        id: 'rv-2', type: 'reveal', title: 'Click to reveal: prediction insights', nav: 'Reveal',
        items: [
          { q: 'Why is the training error usually lower than the test error?', a: 'The model was fitted to the training points; unseen designs reveal how well it generalises.' },
          { q: 'Why do the learned weights make physical sense?', a: 'More logic levels and higher fan-out (load) both increase delay – the Level 8 picture.' },
          { q: 'When should you NOT trust a predictor?', a: 'For designs very different from its training data (new technology, new architecture).' },
          { q: 'Why predict yield?', a: 'To estimate cost and choose design rules or redundancy before manufacturing.' }
        ]
      },
      {
        id: 'dd-2', type: 'drag', title: 'Drag & drop: which quantity does the feature help predict?', nav: 'Drag & drop',
        bins: ['Timing', 'Power', 'Congestion'],
        items: [['logic depth', 0], ['fan-out of critical nets', 0], ['switching activity', 1], ['clock-tree size', 1], ['pin density per tile', 2], ['nets crossing a tile', 2]]
      },
      {
        id: 'calc2', type: 'calc', title: 'Prediction calculations', nav: 'Calculate',
        items: [
          { q: 'Model: delay = 0.11·depth + 0.32·fanout + 0.25. Predict for depth 20, fan-out 2 (ns, two decimals).', a: 3.09, tol: 0.01, h: '2.2 + 0.64 + 0.25.', s: '<b>3.09 ns</b>.' },
          { q: 'Predictions 2.0, 3.1, 1.5 vs actual 2.2, 3.0, 1.5. MAE (ns, two decimals)?', a: 0.1, tol: 0.01, h: '(0.2 + 0.1 + 0) / 3.', s: '<b>0.10 ns</b>.' },
          { q: 'A classifier marks 50 clips as hotspots; 40 really are. Precision (%)?', a: 80, h: '40 / 50.', s: '<b>80 %</b>.' }
        ]
      },
      {
        id: 'mcq2', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Predicting total power in mW is…', o: ['regression', 'classification', 'routing', 'clustering only'], a: 0, w: '' },
          { q: 'MAE measures…', o: ['average absolute prediction error', 'accuracy of classes', 'training time', 'area'], a: 0, w: '' },
          { q: 'A timing model is most useful…', o: ['early, before full synthesis and STA', 'after tape-out', 'instead of sign-off', 'never'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen2', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A power model trained on 28 nm designs is used unchanged on a 5 nm design and predicts 40 % too low.', q: 'Why?', o: [{ t: 'The new technology is outside the training data – the model must be retrained', ok: true, w: 'Distribution shift.' }, { t: 'The 5 nm chip is faulty', ok: false, w: 'No.' }, { t: 'MAE is the wrong metric', ok: false, w: 'The model is the issue.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Congestion prediction replaces…', o: ['an expensive global-routing run in early stages', 'RTL', 'DFT', 'the package'], a: 0, w: '' },
      { d: 'Easy', q: 'Training data contains…', o: ['features and known labels', 'only labels', 'only RTL', 'only test patterns'], a: 0, w: '' },
      { d: 'Easy', q: 'Lower test MAE means…', o: ['better predictions on new designs', 'worse predictions', 'more over-fitting', 'nothing'], a: 0, w: '' },
      { d: 'Medium', q: 'delay = 0.1·depth + 0.5 for depth 15 =', o: ['2.0 ns', '1.5 ns', '15.5 ns', '0.65 ns'], a: 0, w: '' },
      { d: 'Medium', q: 'Which feature best predicts dynamic power?', o: ['switching activity', 'die name', 'number of pins on the package only', 'file size'], a: 0, w: '' },
      { d: 'Medium', q: 'Least-squares fitting minimises…', o: ['sum of squared errors', 'number of features', 'test size', 'area'], a: 0, w: '' },
      { d: 'Medium', q: 'Precision = 45 true hotspots out of 60 predicted =', o: ['75 %', '45 %', '60 %', '133 %'], a: 0, w: '' },
      { d: 'Hard', q: 'Distribution shift means…', o: ['new data differs from training data', 'labels are wrong', 'the model is linear', 'MAE is zero'], a: 0, w: '' },
      { d: 'Hard', q: 'Why use ML predictions for ranking rather than final values?', o: ['relative order is often reliable even when absolute error remains', 'ranking is exact', 'values are always wrong', 'it is required'], a: 0, w: '' },
      { d: 'Hard', q: 'A model that is accurate on average may still…', o: ['miss the one critical path that matters', 'replace STA', 'need no data', 'be perfect'], a: 0, w: '' }
    ]
  });
})();
