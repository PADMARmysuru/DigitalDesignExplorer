/* Level 14 · Module 1 – Introduction to AI/ML for VLSI */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var TASKS = {
    cong: { n: 'Predict routing congestion (overflow %) of each placement tile before routing', label: 'reg',
      feats: { good: ['pin density per tile', 'cell density per tile', 'number of nets crossing the tile', 'distance to the nearest macro'], bad: ['designer\'s name', 'file creation date'] } },
    hot: { n: 'Classify layout clips as lithography hotspot / not hotspot', label: 'cls',
      feats: { good: ['polygon density in the clip', 'minimum line spacing', 'line-end count', 'corner count'], bad: ['tool licence number', 'layer colour in the viewer'] } }
  };
  var STEPS = ['Collect data from past designs', 'Extract features', 'Attach labels (ground truth)', 'Split train / test', 'Train the model', 'Evaluate on test data', 'Deploy inside the EDA flow'];

  /* ---------- Widget: VLSI ML pipeline builder ---------- */
  function pipeLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>VLSI ML pipeline · build a model for an EDA task</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var task = 'cong', pick = {}, model = '', metric = '', order = [], solved = {}, done = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    L.select(row, 'EDA task', Object.keys(TASKS).map(function (k) { return [k, TASKS[k].n]; }), task, function (v) { task = v; pick = {}; model = metric = ''; order = []; draw(); });
    var view = L.h('div', ''); body.appendChild(view);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      var t = TASKS[task]; view.innerHTML = '';
      view.appendChild(L.h('p', '', '<b>1 · Put the pipeline steps in order</b> (tap them in sequence)'));
      var seq = L.h('div', 'l7-readout', order.length ? order.map(function (i, k) { return (k ? ' → ' : '') + STEPS[i]; }).join('') : 'Tap the first step…'); view.appendChild(seq);
      var ch = L.h('div', 'l7-choice'); view.appendChild(ch);
      STEPS.map(function (s, i) { return i; }).filter(function (i) { return order.indexOf(i) < 0; }).sort(function (a, b) { return (a * 7 + 3) % 7 - (b * 7 + 3) % 7 || a - b; }).forEach(function (i) {
        var b = L.h('button', '', STEPS[i]); b.type = 'button';
        b.addEventListener('click', function () { if (i === order.length) { order.push(i); draw(); } else b.classList.add('is-wrong'); });
        ch.appendChild(b);
      });
      if (order.length) view.appendChild(L.btn('↺ restart order', 'ghost', function () { order = []; draw(); }));
      view.appendChild(L.h('p', '', '<b>2 · Choose input features</b> (tap to toggle)'));
      var fr = L.h('div', 'l7-choice'); view.appendChild(fr);
      t.feats.good.concat(t.feats.bad).sort().forEach(function (f) { var b = L.h('button', pick[f] ? 'is-pick' : '', (pick[f] ? '☑ ' : '☐ ') + f); b.type = 'button'; b.addEventListener('click', function () { pick[f] = !pick[f]; draw(); }); fr.appendChild(b); });
      var r2 = L.h('div', 'l7-row'); view.appendChild(r2);
      L.select(r2, '3 · Model type', [['', '– choose –'], ['reg', 'Regression (predicts a number)'], ['cls', 'Classification (predicts a class)']], model, function (v) { model = v; draw(); });
      L.select(r2, '4 · Evaluation metric', [['', '– choose –'], ['mae', 'Mean absolute error on test data'], ['acc', 'Accuracy / precision / recall on test data'], ['train', 'Accuracy on the training data']], metric, function (v) { metric = v; draw(); });
      var goodSel = t.feats.good.filter(function (f) { return pick[f]; }).length, badSel = t.feats.bad.filter(function (f) { return pick[f]; }).length;
      var probs = [];
      if (order.length < STEPS.length) probs.push('pipeline steps incomplete');
      if (badSel) probs.push('irrelevant features (they cannot explain the label – the model would learn noise)');
      if (goodSel < 3) probs.push('choose at least 3 physically meaningful features');
      if (model && model !== t.label) probs.push(t.label === 'reg' ? 'overflow % is a number → regression' : 'hotspot / not hotspot is a class → classification');
      if (!model) probs.push('choose a model type');
      if (metric === 'train') probs.push('training accuracy hides over-fitting – always evaluate on unseen test data');
      else if (metric && metric !== (t.label === 'reg' ? 'mae' : 'acc')) probs.push('metric does not suit the model type');
      if (!metric) probs.push('choose a metric');
      verdict.className = 'l7-verdict ' + (probs.length ? 'bad' : 'ok');
      if (!probs.length) { solved[task] = 1; }
      verdict.innerHTML = probs.length ? '❌ Pipeline not ready<small>' + probs.join(' · ') + '</small>' : '✅ Sound ML pipeline for this EDA task<small>Physically meaningful features, the right model type and an honest test-set metric. Pipelines built: ' + Object.keys(solved).length + ' / 2' + (Object.keys(solved).length < 2 ? ' – now build one for the other task.' : ' 🎉') + '</small>';
      if (Object.keys(solved).length === 2 && !done) { done = true; api.done(); }
    }
    draw();
  }

  function flowFrame(k) {
    var st = ['Design data', 'Features', 'Model', 'Prediction', 'EDA decision'], o = '';
    st.forEach(function (s, i) { var x = 10 + i * 118; o += R(x, 50, 106, 46, i <= k ? 'box-on' : 'box', 8) + T(x + 53, 78, s, 't-ink t-b t-sm'); if (i < 4) o += P('M' + (x + 106) + ' 73H' + (x + 118), 'w'); });
    o += T(300, 26, ['Thousands of past placements, timing reports, test logs…', 'Numbers that describe each sample (pin density, logic depth…)', 'Learns the mapping from features to labels', 'Fast estimate for a NEW design – in milliseconds', 'Used to guide placement, verification, test…'][k], 't-vio t-b t-sm');
    return S(600, 120, o, 'ML in EDA');
  }

  L.module({
    n: 1,
    lead: 'Chip design produces huge amounts of data: millions of placements, timing paths, test logs. Machine learning turns that data into fast predictions and better decisions inside the design flow. This level is about AI/ML for VLSI and EDA – not a general AI course.',
    tags: ['AI in VLSI', 'ML in EDA', 'features', 'labels', 'training/testing', 'classification', 'regression', 'evaluation'],
    sections: [
      {
        id: 'c-why', type: 'concept', title: 'Why ML in chip design?', nav: 'Why ML?',
        html: '<div class="l7-grid3"><div class="l7-box sig"><h4>Slow steps</h4><p>Routing, sign-off timing or regression runs take hours. A model can predict their outcome in seconds.</p></div><div class="l7-box cu"><h4>Huge search spaces</h4><p>Placement, synthesis settings and architecture parameters have astronomically many options.</p></div><div class="l7-box vio"><h4>Rich data</h4><p>Every past project leaves reports and logs – labelled examples for learning.</p></div></div>'
      },
      {
        id: 'st-flow', type: 'steps', title: 'Animation: ML inside the EDA flow', nav: 'ML in EDA',
        frames: [0, 1, 2, 3, 4].map(function (k) { return { t: ['Collect data from completed designs.', 'Turn it into <b>features</b>.', 'Train a model on examples whose answer (<b>label</b>) is known.', 'Predict for new designs instantly.', 'The prediction guides an EDA step – the engineer still decides.'][k], svg: flowFrame(k) }; })
      },
      {
        id: 'c-terms', type: 'concept', title: 'Core ML vocabulary with VLSI examples', nav: 'Vocabulary',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Term</th><th>VLSI example</th></tr><tr><td>Feature</td><td>pin density of a placement tile</td></tr><tr><td>Label</td><td>actual routing overflow of that tile after routing</td></tr><tr><td>Regression</td><td>predict path delay in ns</td></tr><tr><td>Classification</td><td>layout clip: hotspot / not hotspot</td></tr><tr><td>Training set</td><td>tiles from 40 past designs</td></tr><tr><td>Test set</td><td>tiles from 10 designs never seen in training</td></tr><tr><td>Optimisation</td><td>search placement / settings using a model as a guide</td></tr></table></div>'
      },
      { id: 'w-pipe', type: 'widget', title: 'VLSI ML pipeline builder', nav: 'Pipeline builder', intro: 'Build a correct ML pipeline for both EDA tasks.', build: pipeLab },
      {
        id: 'rv-1', type: 'reveal', title: 'Click to reveal: ML-for-VLSI insights', nav: 'Reveal',
        items: [
          { q: 'Why test on different designs, not just different tiles?', a: 'Tiles of one design are similar; a model must generalise to new chips.' },
          { q: 'Can ML replace sign-off tools?', a: 'No – predictions guide early decisions; final sign-off still uses exact analysis.' },
          { q: 'Why are features so important?', a: 'A model can only learn from what its features describe; physical insight from Levels 7–12 chooses good features.' },
          { q: 'What is over-fitting?', a: 'A model memorises training examples and fails on new data – detected by a poor test score.' }
        ]
      },
      {
        id: 'dd-1', type: 'drag', title: 'Drag & drop: regression or classification?', nav: 'Drag & drop',
        bins: ['Regression', 'Classification'],
        items: [['predict critical-path delay', 0], ['predict total power in mW', 0], ['predict congestion overflow %', 0], ['hotspot / not hotspot', 1], ['failing die: stuck-at / delay / bridge', 1], ['branch: taken / not taken', 1]]
      },
      {
        id: 'mcq1', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'A label is…', o: ['the known correct answer for a training example', 'an input feature', 'a model type', 'a test pattern'], a: 0, w: '' },
          { q: 'Models must be evaluated on…', o: ['unseen test data', 'training data only', 'one example', 'the RTL'], a: 0, w: '' },
          { q: 'Predicting delay in ns is…', o: ['regression', 'classification', 'clustering', 'routing'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen1', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A congestion model reaches 99 % accuracy on training tiles but 61 % on a new chip.', q: 'What happened?', o: [{ t: 'Over-fitting – it memorised the training designs', ok: true, w: 'Test on unseen designs reveals it.' }, { t: 'The new chip is broken', ok: false, w: 'The model is the problem.' }, { t: 'Nothing – 99 % is great', ok: false, w: 'Only test accuracy matters.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'A feature is…', o: ['a measurable input describing a sample', 'the correct answer', 'a design rule', 'a test'], a: 0, w: '' },
      { d: 'Easy', q: 'ML in EDA mainly provides…', o: ['fast predictions and guidance', 'masks', 'netlists', 'clock trees'], a: 0, w: '' },
      { d: 'Easy', q: 'Hotspot detection is a…', o: ['classification task', 'regression task', 'routing step', 'synthesis step'], a: 0, w: '' },
      { d: 'Medium', q: 'Which is a good feature for congestion prediction?', o: ['pin density per tile', 'designer\'s name', 'file date', 'tool licence'], a: 0, w: '' },
      { d: 'Medium', q: 'Training accuracy alone is misleading because of…', o: ['over-fitting', 'under-sampling', 'routing', 'IR drop'], a: 0, w: '' },
      { d: 'Medium', q: 'The test set should come from…', o: ['designs not used in training', 'the training designs', 'random noise', 'the labels'], a: 0, w: '' },
      { d: 'Medium', q: 'MAE is a metric for…', o: ['regression', 'classification only', 'routing', 'DRC'], a: 0, w: '' },
      { d: 'Hard', q: 'Why can a model never replace sign-off timing?', o: ['predictions have errors; sign-off needs exact analysis', 'models are slow', 'sign-off is optional', 'it can'], a: 0, w: '' },
      { d: 'Hard', q: 'Physical design knowledge helps ML by…', o: ['choosing meaningful features', 'removing labels', 'making data smaller', 'replacing models'], a: 0, w: '' },
      { d: 'Hard', q: 'Using ML to search placements is an example of…', o: ['optimisation', 'classification only', 'synthesis', 'tape-out'], a: 0, w: '' }
    ]
  });
})();
