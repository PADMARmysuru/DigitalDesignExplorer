/* Level 14 · Module 5 – AI for DFT & Testing */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  function rng(seed) { var a = seed; return function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
  var CLS = ['stuck-at', 'delay', 'bridge'];
  var FEATS = [['speed', 'fails only at-speed (0/1)'], ['pat', 'failure is pattern-dependent (0/1)'], ['cnt', 'number of failing patterns'], ['rad', 'distance from wafer centre']];
  var DATA = (function () {
    var r = rng(5), out = [];
    for (var i = 0; i < 36; i++) {
      var c = i % 3, f = {};
      f.speed = c === 1 ? (r() < 0.92 ? 1 : 0) : (r() < 0.06 ? 1 : 0);
      f.pat = c === 2 ? (r() < 0.9 ? 1 : 0) : (r() < 0.08 ? 1 : 0);
      f.cnt = Math.round(3 + r() * 12 + (c === 0 ? 2 : 0));
      f.rad = Math.round(r() * 100) / 100;
      out.push({ f: f, c: c });
    }
    return out;
  })();
  function scale(k, v) { return k === 'cnt' ? v / 17 : v; }
  function loo(feats, k) {                        // leave-one-out k-NN accuracy + confusion matrix
    var conf = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], ok = 0;
    DATA.forEach(function (s, i) {
      var d = DATA.map(function (o, j) { if (i === j) return null; var dist = 0; feats.forEach(function (f) { var x = scale(f, s.f[f]) - scale(f, o.f[f]); dist += x * x; }); return [dist + j * 1e-9, o.c]; }).filter(Boolean).sort(function (a, b) { return a[0] - b[0]; }).slice(0, k);
      var votes = [0, 0, 0]; d.forEach(function (x) { votes[x[1]]++; });
      var p = votes.indexOf(Math.max.apply(null, votes)); conf[s.c][p]++; if (p === s.c) ok++;
    });
    return { acc: 100 * ok / DATA.length, conf: conf };
  }

  /* ---------- Widget: AI fault classifier ---------- */
  function fcLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>AI fault classifier · k-nearest-neighbours on 36 diagnosed failing dies</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var on = { cnt: true, rad: true }, k = 3, done = false;
    body.appendChild(L.h('p', 'l7-hint', 'Each failing die was diagnosed by failure analysis (the label). Choose which tester features the classifier may use and the number of neighbours k. Accuracy is measured honestly: each die is classified by a model that never saw it (leave-one-out).'));
    var fr = L.h('div', 'l7-choice'); body.appendChild(fr);
    L.slider(body, 'k (neighbours that vote)', 1, 9, 2, k, null, function (v) { k = v; draw(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      fr.innerHTML = '';
      FEATS.forEach(function (f) { var b = L.h('button', on[f[0]] ? 'is-pick' : '', (on[f[0]] ? '☑ ' : '☐ ') + f[1]); b.type = 'button'; b.addEventListener('click', function () { on[f[0]] = !on[f[0]]; draw(); }); fr.appendChild(b); });
      var feats = FEATS.map(function (f) { return f[0]; }).filter(function (f) { return on[f]; });
      if (!feats.length) { pic.innerHTML = ''; verdict.className = 'l7-verdict bad'; verdict.innerHTML = 'Select at least one feature.'; return; }
      var r = loo(feats, k), o = T(150, 16, 'confusion matrix (rows = true class, columns = predicted)', 't-dim t-sm', 'start');
      CLS.forEach(function (c, i) {
        o += T(140, 58 + i * 40, c, 't-ink t-b t-sm', 'end') + T(190 + i * 100, 36, c, 't-ink t-b t-sm');
        CLS.forEach(function (cc, j) { var v = r.conf[i][j]; o += R(150 + j * 100, 40 + i * 40, 90, 34, i === j ? (v ? 'box-ok' : 'box') : (v ? 'box-bad' : 'box'), 6) + T(195 + j * 100, 62 + i * 40, v, 't-ink t-b'); });
      });
      pic.innerHTML = S(600, 170, o, 'Confusion matrix');
      var ok = r.acc >= 90;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : 'bad');
      verdict.innerHTML = 'Leave-one-out accuracy: <b>' + r.acc.toFixed(1) + ' %</b><small>' + (ok ? '✅ The classifier learned what Level 12 taught: delay defects fail only at speed, bridges are pattern-dependent. Good features come from physical understanding – here they beat any amount of irrelevant data.' : on.rad || on.cnt ? 'Some features carry little information about the defect type (where on the wafer a die sits does not tell you how it fails). Which tester observations really distinguish the three defect types?' : 'Try other features or another k.') + '</small>';
      if (ok && !done) { done = true; api.done(); }
    }
    draw();
  }

  function aiFrame(k) {
    var st = ['Tester logs', 'Features', 'Classifier', 'Defect type', 'Action'], o = '';
    st.forEach(function (s, i) { var x = 10 + i * 118; o += R(x, 50, 106, 46, i <= k ? 'box-on' : 'box', 8) + T(x + 53, 78, s, 't-ink t-b t-sm'); if (i < 4) o += P('M' + (x + 106) + ' 73H' + (x + 118), 'w'); });
    o += T(300, 26, ['Millions of failing-pattern records from production test', 'Fail signatures: at-speed only? pattern-dependent? where?', 'Trained on dies already diagnosed by failure analysis', 'Instant classification of new failing dies', 'Choose failure analysis, adjust tests, feed yield learning'][k], 't-vio t-b t-sm');
    return S(600, 120, o, 'AI for silicon test');
  }

  L.module({
    n: 5,
    lead: 'Production test (Level 12) produces enormous data: failing patterns, wafer maps, parametric measurements. AI turns it into faster diagnosis, smarter test programs and earlier yield insight.',
    tags: ['fault prediction', 'test-pattern optimisation', 'fault diagnosis', 'test-time optimisation', 'yield prediction', 'silicon-test analytics'],
    sections: [
      {
        id: 'st-ai', type: 'steps', title: 'Animation: AI in silicon test', nav: 'AI in test',
        frames: [0, 1, 2, 3, 4].map(function (k) { return { t: ['Tester logs from every failing die.', 'Extract fail-signature features.', 'A classifier trained on already-diagnosed dies.', 'New failing dies are classified in milliseconds.', 'Engineers act: physical failure analysis, test changes, yield learning.'][k], svg: aiFrame(k) }; })
      },
      {
        id: 'c-uses', type: 'concept', title: 'AI applications in DFT and test', nav: 'Applications',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Application</th><th>Idea</th></tr><tr><td>Fault / defect classification</td><td>fail signatures → defect type and likely location</td></tr><tr><td>Test-pattern optimisation</td><td>predict which patterns rarely catch defects and can be dropped or reordered</td></tr><tr><td>Test-time optimisation (adaptive test)</td><td>skip tests for dies predicted to be good from early measurements</td></tr><tr><td>Yield prediction</td><td>wafer-map and inline data → expected yield, early warnings</td></tr><tr><td>Silicon-test analytics</td><td>clustering of wafer maps to find systematic problems</td></tr></table></div>'
      },
      { id: 'w-fc', type: 'widget', title: 'AI fault classifier', nav: 'Fault classifier', intro: 'Choose features and k until the classifier reaches at least 90 % leave-one-out accuracy.', build: fcLab },
      {
        id: 'rv-5', type: 'reveal', title: 'Click to reveal: AI-for-test insights', nav: 'Reveal',
        items: [
          { q: 'Why is leave-one-out used here?', a: 'With only 36 labelled dies, each one is tested once by a model trained on the other 35 – an honest estimate with little data.' },
          { q: 'Why did wafer position not help?', a: 'It tells where a die was, not how it fails – irrelevant features add noise to the distance calculation.' },
          { q: 'Can adaptive test skip tests safely?', a: 'Only with conservative thresholds and monitoring; escapes raise DPPM, which customers punish.' },
          { q: 'Where do labels come from?', a: 'From physical failure analysis of a sample of failing dies – expensive, so labelled data is precious.' }
        ]
      },
      {
        id: 'dd-5', type: 'drag', title: 'Drag & drop: which AI-for-test application?', nav: 'Drag & drop',
        bins: ['Defect classification', 'Test-time optimisation', 'Yield prediction'],
        items: [['label a failing die as delay or bridge', 0], ['suggest a location for failure analysis', 0], ['skip slow tests for dies predicted good', 1], ['reorder patterns to fail bad dies earlier', 1], ['predict wafer yield from inline data', 2], ['cluster wafer maps by failure pattern', 2]]
      },
      {
        id: 'mcq5', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'k-NN classifies a sample by…', o: ['the majority class of its nearest labelled neighbours', 'a decision tree', 'the largest feature', 'random choice'], a: 0, w: '' },
          { q: 'The most informative feature for delay defects is…', o: ['fails only at-speed', 'wafer position', 'lot number', 'die colour'], a: 0, w: '' },
          { q: 'A confusion matrix shows…', o: ['true vs predicted classes', 'timing paths', 'test time', 'scan chains'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen5', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'An adaptive-test model proposes skipping the at-speed test for 40 % of dies, which would save 30 % test time.', q: 'What must be checked first?', o: [{ t: 'How many delay defects would escape (DPPM impact) on held-out data', ok: true, w: 'Time savings must not raise escapes.' }, { t: 'Nothing – time is money', ok: false, w: 'Escapes cost more.' }, { t: 'Only the training accuracy', ok: false, w: 'Use unseen data.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'AI fault classification predicts…', o: ['the defect type from fail signatures', 'RTL bugs', 'clock skew', 'routing'], a: 0, w: '' },
      { d: 'Easy', q: 'Labels for defect classifiers come from…', o: ['failure analysis of real dies', 'synthesis', 'placement', 'RTL'], a: 0, w: '' },
      { d: 'Easy', q: 'Adaptive test aims to reduce…', o: ['test time', 'yield', 'area', 'coverage'], a: 0, w: '' },
      { d: 'Medium', q: 'Pattern-dependent failures suggest…', o: ['bridging defects', 'stuck-at defects', 'no defect', 'memory repair'], a: 0, w: '' },
      { d: 'Medium', q: '34 of 36 dies classified correctly =', o: ['94.4 %', '34 %', '90 %', '100 %'], a: 0, w: '' },
      { d: 'Medium', q: 'Irrelevant features in k-NN…', o: ['add noise to distances and lower accuracy', 'always help', 'have no effect', 'raise k'], a: 0, w: '' },
      { d: 'Medium', q: 'Leave-one-out evaluation is useful when…', o: ['labelled data is scarce', 'data is huge', 'labels are missing', 'never'], a: 0, w: '' },
      { d: 'Hard', q: 'The main risk of skipping tests with ML is…', o: ['higher DPPM (escapes)', 'longer test time', 'more area', 'lower yield'], a: 0, w: '' },
      { d: 'Hard', q: 'Clustering wafer maps helps find…', o: ['systematic failure patterns', 'RTL bugs', 'timing paths', 'pin assignments'], a: 0, w: '' },
      { d: 'Hard', q: 'Good features for test ML come from…', o: ['physical understanding of defects', 'file names', 'random selection', 'the tester brand'], a: 0, w: '' }
    ]
  });
})();
