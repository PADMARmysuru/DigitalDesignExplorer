/* Level 14 · Module 10 – AI-Based Branch Prediction: Educational Project
   Educational only: generated traces and textbook-level models. It does not implement or reproduce any specific research work. */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path, esc = L.esc;
  function rng(seed) { var a = seed; return function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
  var TYPE = { 0x10: 'data-dependent', 0x20: 'loop', 0x24: 'biased', 0x30: 'correlated', 0x34: 'correlated', 0x40: 'loop exit' };
  function makeTrace(n, seed) {                     // generated educational program trace: [pc, taken]
    var r = rng(seed), t = [];
    for (var i = 0; i < n; i++) {
      var x = r() < 0.5, y = r() < 0.5;
      t.push([0x10, x]); for (var j = 0; j < 3; j++) t.push([0x20, j < 2]); t.push([0x24, r() < 0.9]);
      t.push([0x30, x]); t.push([0x34, x !== y]); t.push([0x10, y]); t.push([0x40, i % 8 === 7]);
    }
    return t;
  }
  var DATA = makeTrace(240, 31);

  function features(trace, i, h) { var f = []; for (var k = 1; k <= h; k++) f.push(i - k >= 0 ? (trace[i - k][1] ? 1 : -1) : -1); return f; }
  function trainPerc(trace, h, usePC, epochs) {
    var W = {}, th = Math.floor(1.93 * h + 14);
    for (var e = 0; e < epochs; e++) trace.forEach(function (b, i) {
      var key = usePC ? b[0] : 0, w = W[key] || (W[key] = new Array(h + 1).fill(0)), x = features(trace, i, h), y = w[0], t = b[1] ? 1 : -1;
      for (var k = 0; k < h; k++) y += w[k + 1] * x[k];
      if ((y >= 0) !== b[1] || Math.abs(y) <= th) { w[0] += t; for (k = 0; k < h; k++) w[k + 1] += t * x[k]; }
    });
    return { kind: 'perc', W: W, h: h, usePC: usePC };
  }
  function trainTable(trace, h, usePC) {
    var tab = {};
    trace.forEach(function (b, i) { var key = (usePC ? b[0] : 0) + ':' + features(trace, i, h).join(''), c = tab[key] || (tab[key] = [0, 0]); c[b[1] ? 1 : 0]++; });
    return { kind: 'table', tab: tab, h: h, usePC: usePC };
  }
  function predict(m, trace, i) {
    var b = trace[i], x = features(trace, i, m.h);
    if (m.kind === 'perc') { var w = m.W[m.usePC ? b[0] : 0]; if (!w) return true; var y = w[0]; for (var k = 0; k < m.h; k++) y += w[k + 1] * x[k]; return y >= 0; }
    var c = m.tab[(m.usePC ? b[0] : 0) + ':' + x.join('')]; return c ? c[1] >= c[0] : true;
  }
  function twoBit(trace, from) { var c = {}, out = []; trace.forEach(function (b, i) { var v = c[b[0]] === undefined ? 1 : c[b[0]]; if (i >= from) out.push(v >= 2); c[b[0]] = b[1] ? Math.min(3, v + 1) : Math.max(0, v - 1); }); return out; }

  var STEPS = ['Features', 'Select features', 'Dataset', 'Model', 'Train', 'Predict', 'Compare', 'Accuracy', 'Mispredictions', 'vs traditional', 'Report'];

  function projLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>🏆 AI-based branch prediction · educational project</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var st = { step: 0, max: 0, q1: false, h: 8, usePC: true, split: 70, model: 'perc', m: null, pred: null, q9: false };
    var bar = L.h('div', 'l7-row'), view = L.h('div', ''), nav = L.h('div', 'l7-row');
    body.appendChild(bar); body.appendChild(view); body.appendChild(nav);
    function cut() { return Math.floor(DATA.length * st.split / 100); }
    function testSet() { var c = cut(); return DATA.slice(c).map(function (b, k) { return { i: c + k, b: b }; }); }
    function results() {
      var ts = testSet(), p = ts.map(function (x) { return predict(st.m, DATA, x.i); }), tb = twoBit(DATA, cut());
      var per = {}; ts.forEach(function (x, k) { var t = TYPE[x.b[0]]; per[t] = per[t] || { n: 0, ml: 0, tb: 0 }; per[t].n++; if (p[k] !== x.b[1]) per[t].ml++; if (tb[k] !== x.b[1]) per[t].tb++; });
      var mlMiss = ts.filter(function (x, k) { return p[k] !== x.b[1]; }).length, tbMiss = ts.filter(function (x, k) { return tb[k] !== x.b[1]; }).length;
      return { ts: ts, p: p, tb: tb, per: per, n: ts.length, mlMiss: mlMiss, tbMiss: tbMiss, mlAcc: 100 * (1 - mlMiss / ts.length), tbAcc: 100 * (1 - tbMiss / ts.length) };
    }
    function can() { var s = st.step; return s === 0 ? st.q1 : s === 4 ? !!st.m : s === 5 ? !!st.pred : s === 8 ? st.q9 : s < 10; }
    function go(i) { st.step = i; st.max = Math.max(st.max, i); draw(); }
    function h(x, c) { var e = L.h('div', c || '', x); view.appendChild(e); return e; }
    function draw() {
      bar.innerHTML = ''; view.innerHTML = '';
      STEPS.forEach(function (s, i) { var b = L.btn((i < st.max ? '✓ ' : '') + (i + 1) + '. ' + s, i === st.step ? 'is-on' : '', function () { if (i <= st.max) go(i); }); b.style.fontSize = '.74rem'; if (i > st.max) b.disabled = true; bar.appendChild(b); });
      var s = st.step;
      h('<h3 style="margin:10px 0 6px">Step ' + (s + 1) + ' of 11 · ' + STEPS[s] + '</h3>');
      if (s === 0) {
        h('<p>A branch predictor guesses <b>taken / not taken</b> before the branch executes. An ML predictor treats this as <b>binary classification</b>. Its main features are the outcomes of recent branches (<b>global history</b>: +1 taken, −1 not taken) and the <b>branch address</b>, which selects the weights for that branch.</p><p><b>Check:</b> which of these is a branch-history feature?</p>');
        var ch = L.h('div', 'l7-choice'); view.appendChild(ch);
        [['outcome of the branch executed 3 branches ago', true], ['the chip\'s die area', false], ['the clock frequency', false]].forEach(function (o) { var b = L.h('button', st.q1 && o[1] ? 'is-right' : '', o[0]); b.type = 'button'; b.addEventListener('click', function () { if (o[1]) { st.q1 = true; draw(); } else b.classList.add('is-wrong'); }); ch.appendChild(b); });
      }
      if (s === 1) {
        var r1 = L.h('div', 'l7-row'); view.appendChild(r1);
        L.select(r1, 'Global history length', [['2', '2 outcomes'], ['4', '4 outcomes'], ['8', '8 outcomes'], ['12', '12 outcomes']], String(st.h), function (v) { st.h = +v; st.m = null; st.pred = null; });
        L.select(r1, 'Branch address', [['true', 'use it (per-branch model)'], ['false', 'ignore it (one model for all branches)']], String(st.usePC), function (v) { st.usePC = v === 'true'; st.m = null; st.pred = null; });
        h('<p class="l7-hint">Longer history can capture correlations further back; the address lets each branch learn its own behaviour. You can come back and change this later.</p>');
      }
      if (s === 2) {
        L.slider(view, 'Training share of the trace', 50, 90, 10, st.split, function (v) { return v + ' %'; }, function (v) { st.split = v; st.m = null; st.pred = null; draw(); });
        h('<div class="l7-readout"><span class="k">Educational generated trace</span> ' + DATA.length + ' branch executions from a small synthetic program (loops, biased checks, random data-dependent branches, and branches correlated with earlier ones).<br><span class="k">Training</span> first ' + cut() + ' executions · <span class="k">test</span> last ' + (DATA.length - cut()) + ' executions (never seen during training)</div>');
      }
      if (s === 3) {
        var r3 = L.h('div', 'l7-row'); view.appendChild(r3);
        L.select(r3, 'Model', [['perc', 'Perceptron (linear classifier, weighted sum of history)'], ['table', 'Lookup table (majority outcome for each history pattern)']], st.model, function (v) { st.model = v; st.m = null; st.pred = null; });
        h('<p class="l7-hint">Both are lightweight, explainable models. The perceptron generalises to unseen patterns but can only learn weighted-sum (linear) rules; the table can learn any rule, but only for patterns it has seen. Try both and compare.</p>');
      }
      if (s === 4) {
        view.appendChild(L.btn(st.m ? '✓ Trained – retrain' : '⚙ Train on the training set', 'pri', function () { var tr = DATA.slice(0, cut()); st.m = st.model === 'perc' ? trainPerc(tr, st.h, st.usePC, 3) : trainTable(tr, st.h, st.usePC); st.pred = null; draw(); }));
        if (st.m) {
          var trn = DATA.slice(0, cut()), ok = 0; trn.forEach(function (b, i) { if (predict(st.m, trn, i) === b[1]) ok++; });
          h('<div class="l7-readout"><span class="k">Training accuracy</span> ' + (100 * ok / trn.length).toFixed(1) + ' %' + (st.m.kind === 'table' ? ' · <span class="k">patterns learned</span> ' + Object.keys(st.m.tab).length : '') + '</div>');
          if (st.m.kind === 'perc' && st.m.W[st.usePC ? 0x30 : 0]) {
            var w = st.m.W[st.usePC ? 0x30 : 0], o = T(300, 14, 'learned weights for a correlated branch (bar = influence of each past outcome)', 't-dim t-sm');
            for (var i = 1; i < w.length; i++) { var v = w[i], x0 = 40 + (i - 1) * (500 / Math.max(1, w.length - 1)), hh = Math.min(60, Math.abs(v) * 1.2); o += '<rect x="' + x0 + '" y="' + (v >= 0 ? 90 - hh : 90) + '" width="18" height="' + hh + '" fill="' + (v >= 0 ? '#34c759' : '#ff3b30') + '"/>' + T(x0 + 9, 168, i, 't-dim t-sm'); }
            h('<div class="l7-svgbox">' + S(600, 176, o + P('M30 90H580', 'w-thin'), 'Weights') + '</div>');
          }
        }
      }
      if (s === 5) {
        if (!st.m) h('<p>Train the model first (step 5).</p>');
        else { view.appendChild(L.btn(st.pred ? '✓ Predictions made' : '▶ Predict the test branches', 'pri', function () { st.pred = results(); draw(); })); if (st.pred) h('<p>' + st.pred.n + ' unseen branch executions predicted.</p>'); }
      }
      var R2 = st.pred;
      if (s === 6 && R2) h('<div class="l7-table-wrap"><table class="l7-cmp"><tr><th>#</th><th>Branch type</th><th>Predicted</th><th>Actual</th><th></th></tr>' + R2.ts.slice(0, 16).map(function (x, k) { return '<tr><td>' + (k + 1) + '</td><td>' + TYPE[x.b[0]] + '</td><td>' + (R2.p[k] ? 'T' : 'N') + '</td><td>' + (x.b[1] ? 'T' : 'N') + '</td><td>' + (R2.p[k] === x.b[1] ? '✅' : '❌') + '</td></tr>'; }).join('') + '</table></div><p class="l7-hint">First 16 of ' + R2.n + ' test predictions.</p>');
      if (s === 7 && R2) h('<div class="l7-eq">accuracy = correct / total = ' + (R2.n - R2.mlMiss) + ' / ' + R2.n + ' = ' + R2.mlAcc.toFixed(1) + ' %      mispredictions = ' + R2.mlMiss + '</div>');
      if (s === 8 && R2) {
        h('<div class="l7-table-wrap"><table class="l7-cmp"><tr><th>Branch type</th><th>Test executions</th><th>Mispredictions</th><th>Accuracy</th></tr>' + Object.keys(R2.per).map(function (t) { var x = R2.per[t]; return '<tr><td>' + t + '</td><td>' + x.n + '</td><td>' + x.ml + '</td><td>' + (100 * (1 - x.ml / x.n)).toFixed(0) + ' %</td></tr>'; }).join('') + '</table></div><p><b>Why are most remaining mispredictions on data-dependent branches?</b></p>');
        var c8 = L.h('div', 'l7-choice'); view.appendChild(c8);
        [['Their outcome depends on random input data – there is no pattern in the history to learn', true], ['The model is too small for loops', false], ['The test set is too large', false]].forEach(function (o) { var b = L.h('button', st.q9 && o[1] ? 'is-right' : '', o[0]); b.type = 'button'; b.addEventListener('click', function () { if (o[1]) { st.q9 = true; draw(); } else b.classList.add('is-wrong'); }); c8.appendChild(b); });
      }
      if (s === 9 && R2) h('<div class="l7-table-wrap"><table class="l7-cmp"><tr><th>Predictor</th><th>Mispredictions</th><th>Accuracy</th></tr><tr><td>Traditional 2-bit counters</td><td>' + R2.tbMiss + '</td><td>' + R2.tbAcc.toFixed(1) + ' %</td></tr><tr><td>Your ML model (' + (st.model === 'perc' ? 'perceptron' : 'lookup table') + ', history ' + st.h + ')</td><td>' + R2.mlMiss + '</td><td class="' + (R2.mlAcc > R2.tbAcc ? 'better' : 'worse') + '">' + R2.mlAcc.toFixed(1) + ' %</td></tr></table></div><p>' + (R2.mlAcc > R2.tbAcc ? 'The ML model wins mainly on <b>correlated</b> branches, whose outcome depends on earlier branches.' : 'Your model does not beat the 2-bit counters – go back and try a longer history or the branch address.') + '</p>');
      if (s >= 6 && s <= 9 && !R2) h('<p>Make predictions first (step 6).</p>');
      if (s === 10) {
        if (!R2) h('<p>Complete the earlier steps to generate the report.</p>');
        else {
          h('<div class="l7-box" style="margin:8px 0"><h4>📄 Final report – AI-based branch prediction (educational project)</h4><p><b>Features:</b> global history of ' + st.h + ' outcomes' + (st.usePC ? ' + branch address' : '') + '.<br><b>Data:</b> generated educational trace, ' + cut() + ' training / ' + R2.n + ' test executions.<br><b>Model:</b> ' + (st.model === 'perc' ? 'perceptron (linear classifier), 3 training passes' : 'lookup table of history patterns') + '.<br><b>Result:</b> accuracy ' + R2.mlAcc.toFixed(1) + ' %, ' + R2.mlMiss + ' mispredictions, versus ' + R2.tbAcc.toFixed(1) + ' % (' + R2.tbMiss + ') for 2-bit counters.<br><b>Analysis:</b> correlated branches benefit from history; data-dependent random branches stay near 50 % for every predictor.<br><b>Limitations:</b> tiny synthetic program; offline training; real predictors learn online within a single cycle and strict area and power budgets.<br><b>Future work:</b> larger realistic traces, hybrid predictors, hardware cost estimates.</p></div>');
          h('<div class="l7-readout"><b>Research Connection:</b> This project introduces students to the concept of machine-learning-based branch prediction, a research area relevant to modern processor architecture.</div>');
          h('<div class="l7-verdict ok">🏆 Project complete<small>You defined features, prepared data, trained and evaluated a classifier, analysed its errors and compared it with a traditional predictor – the complete ML workflow applied to processor architecture.</small></div>');
          api.done();
        }
      }
      nav.innerHTML = '';
      if (s > 0) nav.appendChild(L.btn('← Back', 'ghost', function () { go(s - 1); }));
      if (s < 10) { var nb = L.btn('Next: ' + STEPS[s + 1] + ' →', 'pri', function () { go(s + 1); }); nb.disabled = !can(); nav.appendChild(nb); }
    }
    draw();
  }

  L.module({
    n: 10,
    lead: 'An educational project bringing Level 14 together: treat branch prediction as a machine-learning classification problem. Choose features, prepare data, train a lightweight model, predict unseen branches, analyse its mistakes and compare it with a traditional predictor.',
    tags: ['project', 'branch-history features', 'training/testing data', 'perceptron', 'classification', 'accuracy', 'misprediction analysis', 'comparison'],
    sections: [
      {
        id: 'c-intro', type: 'concept', title: 'About this project', nav: 'About',
        html: '<p>This project uses a small, generated educational trace and simple, well-known models (a perceptron-style linear classifier and a lookup table). Its focus is <b>prediction accuracy</b> and the machine-learning workflow.</p>' +
          '<div class="l7-readout"><b>Research Connection:</b> This project introduces students to the concept of machine-learning-based branch prediction, a research area relevant to modern processor architecture.</div>'
      },
      { id: 'w-proj', type: 'widget', title: '🏆 AI-based branch prediction project', nav: 'Project', intro: 'Work through all 11 steps and generate the final report.', build: projLab },
      {
        id: 'rv-10', type: 'reveal', title: 'Click to reveal: project lessons', nav: 'Lessons',
        items: [
          { q: 'Why keep a separate test set?', a: 'Accuracy on unseen branches shows whether the model learned patterns or just memorised the training trace.' },
          { q: 'Why did the lookup table struggle with long histories?', a: 'With many possible patterns, it meets combinations in the test set that it never saw during training.' },
          { q: 'Why is offline training different from a real predictor?', a: 'Real hardware learns continuously while the program runs, within one clock cycle and a small power budget.' },
          { q: 'What limits accuracy here?', a: 'The random data-dependent branches – no history pattern predicts them.' },
          { q: 'Why can the lookup table beat the perceptron on this trace?', a: 'One correlated branch is taken when exactly one of two earlier branches was taken (an XOR rule). A weighted sum cannot represent XOR; a table of history patterns can.' }
        ]
      },
      {
        id: 'dd-10', type: 'drag', title: 'Drag & drop: ML workflow stage', nav: 'Workflow',
        bins: ['Data & features', 'Model & training', 'Evaluation'],
        items: [['choose history length', 0], ['split train / test', 0], ['choose perceptron or table', 1], ['adjust weights on mistakes', 1], ['accuracy on unseen branches', 2], ['compare with 2-bit counters', 2]]
      },
      {
        id: 'mcq10', type: 'mcq', title: 'Integrated MCQs', nav: 'MCQ',
        items: [
          { q: 'In this project, branch prediction is treated as…', o: ['binary classification', 'regression', 'clustering', 'routing'], a: 0, w: '' },
          { q: 'The main input features are…', o: ['recent branch outcomes and the branch address', 'die area', 'clock period', 'cache size'], a: 0, w: '' },
          { q: 'Accuracy is measured on…', o: ['the test set', 'the training set', 'the RTL', 'the netlist'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen10', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Your model reaches 99 % on training branches but only 80 % on test branches.', q: 'What does this suggest and what would you try?', o: [{ t: 'Over-fitting – use a simpler model (e.g. perceptron instead of a huge table) or more training data', ok: true, w: 'Generalisation matters.' }, { t: 'The test set is wrong', ok: false, w: 'No.' }, { t: 'Report the training accuracy', ok: false, w: 'Misleading.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'A branch outcome is…', o: ['taken or not taken', 'a delay value', 'a cache line', 'a voltage'], a: 0, w: '' },
      { d: 'Easy', q: 'Global history records…', o: ['outcomes of recent branches', 'cache misses', 'clock edges', 'register values'], a: 0, w: '' },
      { d: 'Easy', q: 'A misprediction is…', o: ['a wrong taken/not-taken guess', 'a cache hit', 'a correct guess', 'a stall'], a: 0, w: '' },
      { d: 'Medium', q: '300 test branches, 24 wrong: accuracy =', o: ['92 %', '24 %', '76 %', '97 %'], a: 0, w: '' },
      { d: 'Medium', q: 'A lookup-table predictor predicts unseen patterns…', o: ['poorly – it has no entry for them', 'perfectly', 'by averaging weights', 'by asking the compiler'], a: 0, w: '' },
      { d: 'Medium', q: 'Using the branch address lets the model…', o: ['learn branch-specific behaviour', 'skip training', 'remove history', 'increase area only'], a: 0, w: '' },
      { d: 'Medium', q: 'Why compare with 2-bit counters?', o: ['to show what ML adds over a traditional predictor', 'they are always better', 'they need no data', 'it is required by law'], a: 0, w: '' },
      { d: 'Hard', q: 'Random data-dependent branches limit accuracy because…', o: ['their outcomes have no learnable pattern', 'models are too large', 'the trace is short', 'the PC is missing'], a: 0, w: '' },
      { d: 'Hard', q: 'Over-fitting in this project shows as…', o: ['high training but low test accuracy', 'equal accuracies', 'low training accuracy only', 'zero mispredictions'], a: 0, w: '' },
      { d: 'Hard', q: 'A key difference from real hardware predictors is…', o: ['real ones learn online within one cycle', 'real ones use no history', 'real ones are trained once per year', 'there is none'], a: 0, w: '' }
    ]
  });
})();
