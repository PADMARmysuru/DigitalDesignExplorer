/* Level 14 · Module 7 – Deep Learning for VLSI */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  function rng(seed) { var a = seed; return function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
  /* tile features: x1, x2 = tile position on the die (0..1). Label: the tile lies in the routing hotspot that forms
     around a macro channel near (0.6, 0.55) – a round region that no straight line can separate */
  var DATA = (function () { var r = rng(21), out = []; for (var i = 0; i < 400; i++) { var a = r(), b = r(); out.push({ x: [a, b], y: (a - 0.6) * (a - 0.6) + (b - 0.55) * (b - 0.55) < 0.07 ? 1 : 0, test: i % 4 === 0 }); } return out; })();

  function Net(h, seed) {
    var r = rng(seed || 3), k, j;
    this.h = h; this.W1 = []; this.b1 = []; this.W2 = []; this.b2 = 0;
    for (k = 0; k < h; k++) { this.W1.push([(r() - 0.5) * 2, (r() - 0.5) * 2]); this.b1.push((r() - 0.5)); this.W2.push((r() - 0.5) * 2); }
    if (!h) this.w0 = [0, 0];
  }
  Net.prototype.fwd = function (x) {
    if (!this.h) { var z0 = this.w0[0] * x[0] + this.w0[1] * x[1] + this.b2; return { o: 1 / (1 + Math.exp(-z0)), a: [] }; }
    var a = [], z = this.b2;
    for (var k = 0; k < this.h; k++) { var v = Math.tanh(this.W1[k][0] * x[0] + this.W1[k][1] * x[1] + this.b1[k]); a.push(v); z += this.W2[k] * v; }
    return { o: 1 / (1 + Math.exp(-z)), a: a };
  };
  Net.prototype.train = function (set, epochs, lr) {
    var loss = 0;
    for (var e = 0; e < epochs; e++) {
      loss = 0;
      for (var i = 0; i < set.length; i++) {
        var s = set[i], f = this.fwd(s.x), d = f.o - s.y;
        loss += -(s.y * Math.log(f.o + 1e-9) + (1 - s.y) * Math.log(1 - f.o + 1e-9));
        if (!this.h) { this.w0[0] -= lr * d * s.x[0]; this.w0[1] -= lr * d * s.x[1]; this.b2 -= lr * d; continue; }
        for (var k = 0; k < this.h; k++) { var g = d * this.W2[k] * (1 - f.a[k] * f.a[k]); this.W2[k] -= lr * d * f.a[k]; this.W1[k][0] -= lr * g * s.x[0]; this.W1[k][1] -= lr * g * s.x[1]; this.b1[k] -= lr * g; }
        this.b2 -= lr * d;
      }
    }
    return loss / set.length;
  };
  function acc(net, set) { var ok = 0; set.forEach(function (s) { if ((net.fwd(s.x).o >= 0.5 ? 1 : 0) === s.y) ok++; }); return 100 * ok / set.length; }

  /* ---------- Widget: neural network explorer ---------- */
  function nnLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Neural network explorer · predict which tiles fall in a congestion hotspot</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var train = DATA.filter(function (s) { return !s.test; }), test = DATA.filter(function (s) { return s.test; });
    var H = 0, net = new Net(0), epochs = 0, losses = [], done = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    L.slider(body, 'Hidden neurons (0 = no hidden layer: a single neuron)', 0, 6, 1, H, null, function (v) { H = v; net = new Net(H); epochs = 0; losses = []; draw(); });
    row.appendChild(L.btn('▶ Train 100 epochs', 'pri', function () { losses.push(net.train(train, 100, 0.3)); epochs += 100; draw(); }));
    row.appendChild(L.btn('↺ Re-initialise', 'ghost', function () { net = new Net(H, Math.floor(Math.random() * 1000) + 1); epochs = 0; losses = []; draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      var o = '', X0 = 20, Y0 = 20, SZ = 220, G = 22;
      for (var i = 0; i < G; i++) for (var j = 0; j < G; j++) { var p = net.fwd([(i + 0.5) / G, 1 - (j + 0.5) / G]).o; o += '<rect x="' + (X0 + i * SZ / G) + '" y="' + (Y0 + j * SZ / G) + '" width="' + (SZ / G + 0.5) + '" height="' + (SZ / G + 0.5) + '" fill="' + (p >= 0.5 ? 'rgba(255,59,48,' + (0.1 + 0.3 * p) + ')' : 'rgba(52,199,89,' + (0.1 + 0.3 * (1 - p)) + ')') + '"/>'; }
      DATA.forEach(function (s) { o += '<circle cx="' + (X0 + s.x[0] * SZ) + '" cy="' + (Y0 + (1 - s.x[1]) * SZ) + '" r="' + (s.test ? 4.5 : 3.5) + '" fill="' + (s.y ? '#ff3b30' : '#34c759') + '" stroke="' + (s.test ? '#1d1d1f' : 'none') + '" stroke-width="1.2"/>'; });
      o += T(X0 + SZ / 2, Y0 + SZ + 16, 'tile x position on the die →', 't-dim t-sm') + T(X0 + SZ / 2, 12, 'background = model prediction · ringed dots = test tiles', 't-dim t-sm');
      var nx = 300, nodes = Math.max(H, 1);
      [0, 1].forEach(function (k) { o += '<circle cx="' + nx + '" cy="' + (80 + k * 70) + '" r="14" fill="#0071e3"/>' + T(nx - 22, 84 + k * 70, k ? 'x₂' : 'x₁', 't-ink t-sm', 'end'); });
      for (var h = 0; h < H; h++) { var hy = 40 + h * (180 / nodes); o += '<circle cx="' + (nx + 110) + '" cy="' + hy + '" r="12" fill="#5856d6"/>'; [0, 1].forEach(function (k) { o += '<line x1="' + (nx + 14) + '" y1="' + (80 + k * 70) + '" x2="' + (nx + 98) + '" y2="' + hy + '" stroke="#8e8e93" stroke-width="' + (0.5 + Math.min(3, Math.abs(net.W1[h][k]))) + '"/>'; }); o += '<line x1="' + (nx + 122) + '" y1="' + hy + '" x2="' + (nx + 206) + '" y2="115" stroke="#8e8e93" stroke-width="' + (0.5 + Math.min(3, Math.abs(net.W2[h]))) + '"/>'; }
      if (!H) [0, 1].forEach(function (k) { o += '<line x1="' + (nx + 14) + '" y1="' + (80 + k * 70) + '" x2="' + (nx + 206) + '" y2="115" stroke="#8e8e93" stroke-width="1.5"/>'; });
      o += '<circle cx="' + (nx + 220) + '" cy="115" r="14" fill="#ff9500"/>' + T(nx + 220, 150, 'P(congested)', 't-ink t-sm') + T(nx + 110, 250, H ? 'input → ' + H + ' hidden (tanh) → output (sigmoid)' : 'input → output (one neuron: a straight-line boundary)', 't-dim t-sm');
      pic.innerHTML = S(600, 262, o, 'Neural network');
      var tr = acc(net, train), te = acc(net, test), ok = te >= 95 && epochs > 0;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : epochs ? 'warn' : 'bad');
      verdict.innerHTML = 'Epochs ' + epochs + (losses.length ? ' · loss ' + losses[losses.length - 1].toFixed(3) : '') + ' · training accuracy ' + tr.toFixed(0) + ' % · <b>test accuracy ' + te.toFixed(0) + ' %</b> (goal ≥ 95 %)<small>' +
        (ok ? '✅ Hidden neurons each draw one line; together they enclose the round hotspot. CNNs apply the same idea to whole congestion and layout images.' : !H && epochs ? 'One neuron can only draw a straight line – but the hotspot is a round region. Add hidden neurons.' : epochs ? 'Keep training (or re-initialise if it gets stuck).' : 'Train the network.') + '</small>';
      if (ok && !done) { done = true; api.done(); }
    }
    draw();
  }

  function cnnFrame(k) {
    var o = '';
    for (var i = 0; i < 6; i++) for (var j = 0; j < 6; j++) o += '<rect x="' + (30 + i * 22) + '" y="' + (30 + j * 22) + '" width="20" height="20" fill="' + ((i + j) % 3 ? '#9ec5ff' : '#3a62c7') + '" opacity="' + (k >= 1 && i < 3 && j < 3 ? 1 : 0.6) + '"/>';
    if (k >= 1) o += '<rect x="28" y="28" width="68" height="68" fill="none" stroke="#ff9500" stroke-width="3"/>' + T(100, 176, 'filter slides over the layout', 't-cu t-sm');
    if (k >= 2) { o += P('M180 95H230', 'w-on'); for (var a = 0; a < 4; a++) for (var b = 0; b < 4; b++) o += '<rect x="' + (240 + a * 20) + '" y="' + (55 + b * 20) + '" width="18" height="18" fill="#af52de" opacity="' + (0.3 + ((a * b) % 3) * 0.25) + '"/>'; o += T(280, 160, 'feature map', 't-vio t-sm'); }
    if (k >= 3) o += P('M330 95H380', 'w-on') + R(390, 70, 160, 50, 'box-on', 8) + T(470, 100, 'hotspot: 92 %', 't-ink t-b');
    o += T(300, 200, ['A layout clip is an image (pixels = metal density)', 'A small filter looks at one patch at a time', 'It produces feature maps: edges, line ends, narrow gaps', 'Final layers combine them into a prediction'][k], 't-vio t-b t-sm');
    return S(600, 212, o, 'CNN on a layout');
  }

  L.module({
    n: 7,
    lead: 'Deep learning stacks many simple neurons to learn complex patterns – curved decision boundaries, shapes in layout images, sequences in timing paths. Learn the building blocks and see why they suit layout analysis, defect detection and timing, congestion and power prediction.',
    tags: ['neural networks', 'input/hidden/output layers', 'training', 'inference', 'CNN concept', 'sequence models', 'feature extraction'],
    sections: [
      {
        id: 'c-nn', type: 'concept', title: 'Neurons, layers, training and inference', nav: 'Neural networks',
        html: '<div class="l7-grid3"><div class="l7-box sig"><h4>Neuron</h4><p>weighted sum of inputs + bias, then a non-linear activation (tanh, ReLU, sigmoid).</p></div><div class="l7-box cu"><h4>Layers</h4><p>input layer (features) → hidden layers (learned intermediate features) → output layer (prediction).</p></div><div class="l7-box vio"><h4>Training vs inference</h4><p>Training adjusts weights to reduce a loss on labelled data (hours); inference uses the trained network on new data (milliseconds).</p></div></div>'
      },
      { id: 'w-nn', type: 'widget', title: 'Neural network explorer', nav: 'NN explorer', intro: 'Start with a single neuron, then add hidden neurons and train until test accuracy reaches 95 %.', build: nnLab },
      {
        id: 'st-cnn', type: 'steps', title: 'Animation: a CNN looking at a layout clip', nav: 'CNN concept',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Layouts, congestion maps and wafer maps are images.', 'A convolutional filter scans small patches.', 'Filters learn useful local features automatically (feature extraction).', 'Deeper layers combine them into a decision: hotspot, defect, congestion level.'][k], svg: cnnFrame(k) }; })
      },
      {
        id: 'c-apps', type: 'concept', title: 'Deep learning applications in VLSI', nav: 'Applications',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Application</th><th>Data</th><th>Network type</th></tr><tr><td>Lithography hotspot / layout analysis</td><td>layout clips</td><td>CNN</td></tr><tr><td>Defect detection</td><td>SEM / wafer images</td><td>CNN</td></tr><tr><td>Congestion prediction</td><td>placement density maps</td><td>CNN (image-to-image)</td></tr><tr><td>Timing prediction</td><td>sequences of cells along a path, netlist graphs</td><td>sequence / graph models</td></tr><tr><td>Power prediction</td><td>activity traces over time</td><td>sequence models</td></tr></table></div>'
      },
      {
        id: 'rv-7', type: 'reveal', title: 'Click to reveal: deep learning insights', nav: 'Reveal',
        items: [
          { q: 'Why could one neuron not solve the congestion task?', a: 'A single neuron draws a straight line; the hotspot is a round region around the macro channel, so any straight line misclassifies many tiles.' },
          { q: 'What does a hidden neuron learn?', a: 'An intermediate feature – here, roughly "this side of a line"; combining several approximates the curve.' },
          { q: 'Why are CNNs good for layouts?', a: 'The same local pattern (e.g. a narrow gap) matters wherever it appears; convolution reuses one filter everywhere.' },
          { q: 'What is the risk of very large networks with little VLSI data?', a: 'Over-fitting – labelled chip data is expensive, so models and data must be balanced.' }
        ]
      },
      {
        id: 'dd-7', type: 'drag', title: 'Drag & drop: which network type fits?', nav: 'Drag & drop',
        bins: ['CNN (images)', 'Sequence / graph model'],
        items: [['lithography hotspot clips', 0], ['wafer-map defect patterns', 0], ['placement density maps', 0], ['cells along a timing path', 1], ['switching activity over time', 1], ['netlist connectivity', 1]]
      },
      {
        id: 'mcq7', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Hidden layers allow a network to learn…', o: ['non-linear decision boundaries', 'only straight lines', 'nothing', 'masks'], a: 0, w: '' },
          { q: 'Inference means…', o: ['using a trained model on new data', 'adjusting weights', 'collecting labels', 'routing'], a: 0, w: '' },
          { q: 'A CNN is suited to…', o: ['image-like data such as layouts', 'text files only', 'SDC constraints', 'RTL syntax'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen7', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A huge CNN reaches 100 % training accuracy on 200 hotspot clips but 70 % on new clips.', q: 'What should be done?', o: [{ t: 'Reduce model size / regularise and collect more labelled clips', ok: true, w: 'Over-fitting on scarce data.' }, { t: 'Make the network even larger', ok: false, w: 'Worse over-fitting.' }, { t: 'Evaluate on training data', ok: false, w: 'Misleading.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'The input layer receives…', o: ['the features', 'the predictions', 'the labels', 'the weights'], a: 0, w: '' },
      { d: 'Easy', q: 'Training a network adjusts…', o: ['weights and biases', 'the data', 'the labels', 'the clock'], a: 0, w: '' },
      { d: 'Easy', q: 'A CNN is typical for…', o: ['layout and wafer images', 'SDC files', 'netlist text', 'test vectors'], a: 0, w: '' },
      { d: 'Medium', q: 'Without hidden layers, a classifier can only draw…', o: ['a straight-line (linear) boundary', 'any curve', 'circles', 'nothing'], a: 0, w: '' },
      { d: 'Medium', q: 'Feature extraction in CNNs is…', o: ['learned by the filters automatically', 'done by hand only', 'not needed', 'done by STA'], a: 0, w: '' },
      { d: 'Medium', q: 'Timing paths are naturally modelled as…', o: ['sequences or graphs', 'images only', 'single numbers', 'masks'], a: 0, w: '' },
      { d: 'Medium', q: 'Loss measures…', o: ['how wrong the predictions are on training data', 'chip area', 'test time', 'power'], a: 0, w: '' },
      { d: 'Hard', q: 'Why is labelled data a bottleneck for deep learning in VLSI?', o: ['labels need expensive tool runs or failure analysis', 'chips have no data', 'networks need no labels', 'it is not'], a: 0, w: '' },
      { d: 'Hard', q: 'Inference is fast because…', o: ['it is only a forward pass through fixed weights', 'it skips the inputs', 'it uses no maths', 'it trains again'], a: 0, w: '' },
      { d: 'Hard', q: 'Large networks on small datasets tend to…', o: ['over-fit', 'under-fit always', 'be exact', 'need no test data'], a: 0, w: '' }
    ]
  });
})();
