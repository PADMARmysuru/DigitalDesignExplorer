/* Level 8 · Module 1 – Digital Circuit Timing Fundamentals */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* ---------- Widget: interactive timing diagram (inverter) ---------- */
  function timingDiagram(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Timing diagram lab · measure delays and transition times</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { phl: 60, plh: 90, tf: 50, tr: 80 }, n = 0;
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    L.slider(c1, 't_pHL (output falling delay)', 20, 160, 5, p.phl, function (v) { return v + ' ps'; }, function (v) { p.phl = v; upd(1); });
    L.slider(c1, 't_pLH (output rising delay)', 20, 160, 5, p.plh, function (v) { return v + ' ps'; }, function (v) { p.plh = v; upd(1); });
    L.slider(c2, 'Fall time t_f (90%→10%)', 20, 160, 5, p.tf, function (v) { return v + ' ps'; }, function (v) { p.tf = v; upd(1); });
    L.slider(c2, 'Rise time t_r (10%→90%)', 20, 160, 5, p.tr, function (v) { return v + ' ps'; }, function (v) { p.tr = v; upd(1); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var X = function (t) { return 70 + t * 0.56; };
    function ramp(t50, dur, yLo, yHi, rising) { var full = dur / 0.8, a = t50 - full / 2, b = t50 + full / 2; return { a: a, b: b, y0: rising ? yLo : yHi, y1: rising ? yHi : yLo }; }
    function upd(ch) {
      if (ch) n++; if (n >= 3) api.done();
      var o = '', inR = 100, inF = 550;
      for (var t = 0; t <= 1000; t += 100) o += P('M' + X(t) + ' 20V250', 'grid') + T(X(t), 266, t, 't-dim t-sm');
      o += T(X(1000), 282, 'time (ps)', 't-dim t-sm', 'end');
      // input A (fast edges, 20 ps)
      var aHi = 40, aLo = 90;
      o += T(20, 70, 'A', 't-ink t-b');
      o += P('M' + X(0) + ' ' + aLo + 'H' + X(inR - 12) + 'L' + X(inR + 12) + ' ' + aHi + 'H' + X(inF - 12) + 'L' + X(inF + 12) + ' ' + aLo + 'H' + X(1000), 'wv');
      // output Y
      var yHi = 150, yLo = 210, yMid = (yHi + yLo) / 2;
      var f = ramp(inR + p.phl, p.tf, yLo, yHi, false), r = ramp(inF + p.plh, p.tr, yLo, yHi, true);
      o += T(20, 185, 'Y', 't-ink t-b');
      o += P('M' + X(0) + ' ' + yHi + 'H' + X(f.a) + 'L' + X(f.b) + ' ' + yLo + 'H' + X(r.a) + 'L' + X(r.b) + ' ' + yHi + 'H' + X(1000), 'w-on');
      // 50 % markers
      o += P('M' + X(inR) + ' 65V' + yMid, 'w-dash') + P('M' + X(inR + p.phl) + ' 65V' + yMid, 'w-dash');
      o += P('M' + X(inR) + ' 120H' + X(inR + p.phl), 'w-cu') + T(X(inR + p.phl / 2), 114, 't_pHL ' + p.phl, 't-cu t-b t-sm');
      o += P('M' + X(inF) + ' 65V' + yMid, 'w-dash') + P('M' + X(inF + p.plh) + ' 65V' + yMid, 'w-dash');
      o += P('M' + X(inF) + ' 120H' + X(inF + p.plh), 'w-cu') + T(X(inF + p.plh / 2), 114, 't_pLH ' + p.plh, 't-cu t-b t-sm');
      // 10–90 % markers
      var y10 = yLo - 0.1 * (yLo - yHi), y90 = yLo - 0.9 * (yLo - yHi);
      var fa = inR + p.phl - p.tf / 2, fb = inR + p.phl + p.tf / 2, ra = inF + p.plh - p.tr / 2, rb = inF + p.plh + p.tr / 2;
      o += P('M' + X(fa) + ' ' + y90 + 'V236M' + X(fb) + ' ' + y10 + 'V236', 'w-vio') + P('M' + X(fa) + ' 236H' + X(fb), 'w-vio') + T(X((fa + fb) / 2), 250, 't_f ' + p.tf, 't-vio t-b t-sm');
      o += P('M' + X(ra) + ' ' + y10 + 'V236M' + X(rb) + ' ' + y90 + 'V236', 'w-vio') + P('M' + X(ra) + ' 236H' + X(rb), 'w-vio') + T(X((ra + rb) / 2), 250, 't_r ' + p.tr, 't-vio t-b t-sm');
      pic.innerHTML = S(650, 290, o, 'Inverter timing diagram');
      out.innerHTML = '<span class="k">Propagation delay</span> t_pd = (t_pHL + t_pLH)/2 = <span class="v">' + ((p.phl + p.plh) / 2).toFixed(1) + ' ps</span>' +
        '<br><span class="k">Worst-case delay</span> max(t_pHL, t_pLH) = <span class="c">' + Math.max(p.phl, p.plh) + ' ps</span>' +
        '<br><span class="k">Delays</span> measured between 50 % points · <span class="k">transition times</span> between 10 % and 90 %';
    }
    upd(0);
  }

  /* ---------- Widget: critical path finder ---------- */
  var NODES = {
    A: { x: 40, y: 40, d: 0, in: 1 }, B: { x: 40, y: 100, d: 0, in: 1 }, C: { x: 40, y: 160, d: 0, in: 1 }, D: { x: 40, y: 220, d: 0, in: 1 }, E: { x: 40, y: 280, d: 0, in: 1 },
    G1: { x: 180, y: 70, d: 30, n: 'NAND' }, G2: { x: 180, y: 150, d: 45, n: 'NOR' }, G3: { x: 180, y: 230, d: 15, n: 'INV' },
    G4: { x: 330, y: 110, d: 60, n: 'AOI' }, G5: { x: 330, y: 240, d: 35, n: 'NAND3' }, G6: { x: 480, y: 175, d: 70, n: 'XOR' }
  };
  var EDGES = [['A', 'G1'], ['B', 'G1'], ['B', 'G2'], ['C', 'G2'], ['D', 'G3'], ['G1', 'G4'], ['G2', 'G4'], ['G2', 'G5'], ['G3', 'G5'], ['E', 'G5'], ['G4', 'G6'], ['G5', 'G6']];
  function allPaths() {
    var res = [];
    function walk(nd, acc, d) { if (nd === 'G6') { res.push([acc, d]); return; } EDGES.forEach(function (e) { if (e[0] === nd) walk(e[1], acc.concat(e[1]), d + NODES[e[1]].d); }); }
    'ABCDE'.split('').forEach(function (i) { walk(i, [i], 0); });
    return res;
  }
  function pathFinder(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Critical path finder · tap an input, then gates, to trace a path to Y</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var mode = 'max', path = [], found = {};
    var PATHS = allPaths(), MAX = Math.max.apply(null, PATHS.map(function (x) { return x[1]; })), MIN = Math.min.apply(null, PATHS.map(function (x) { return x[1]; }));
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var b1 = L.btn('Task 1: find the critical (longest) path', 'is-on', function () { mode = 'max'; b1.classList.add('is-on'); b2.classList.remove('is-on'); path = []; draw(); });
    var b2 = L.btn('Task 2: find the shortest path (t_cd)', '', function () { mode = 'min'; b2.classList.add('is-on'); b1.classList.remove('is-on'); path = []; draw(); });
    row.appendChild(b1); row.appendChild(b2); row.appendChild(L.btn('Clear path', 'ghost', function () { path = []; draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function onPath(a, b) { for (var i = 0; i < path.length - 1; i++) if (path[i] === a && path[i + 1] === b) return true; return false; }
    function draw() {
      var o = '';
      EDGES.forEach(function (e) { var a = NODES[e[0]], b = NODES[e[1]]; o += P('M' + (a.x + 24) + ' ' + a.y + 'C' + (a.x + 80) + ' ' + a.y + ' ' + (b.x - 70) + ' ' + b.y + ' ' + (b.x - 30) + ' ' + b.y, onPath(e[0], e[1]) ? 'w-on' : 'w-thin'); });
      o += P('M' + (NODES.G6.x + 30) + ' ' + NODES.G6.y + 'H580', path[path.length - 1] === 'G6' ? 'w-on' : 'w') + T(592, NODES.G6.y + 5, 'Y', 't-ink t-b', 'start');
      Object.keys(NODES).forEach(function (k) {
        var nd = NODES[k], sel = path.indexOf(k) >= 0;
        o += '<g class="click" data-k="' + k + '" role="button" tabindex="0" aria-label="' + k + '">';
        if (nd.in) o += '<circle cx="' + nd.x + '" cy="' + nd.y + '" r="17" class="' + (sel ? 'box-on' : 'box') + '"/>' + T(nd.x, nd.y + 5, k, 't-ink t-b');
        else o += R(nd.x - 30, nd.y - 22, 60, 44, sel ? 'box-on' : 'box', 10) + T(nd.x, nd.y - 3, k + ' ' + nd.n, 't-ink t-b t-sm') + T(nd.x, nd.y + 14, nd.d + ' ps', 't-cu t-sm');
        o += '</g>';
      });
      pic.innerHTML = S(620, 312, o, 'Logic network with gate delays');
      L.$$('g.click', pic).forEach(function (el) { el.addEventListener('click', function () { tap(el.getAttribute('data-k')); }); });
      var d = path.reduce(function (a, k) { return a + NODES[k].d; }, 0);
      if (!path.length) L.fb(fb, 'info', mode === 'max' ? 'Trace the path with the <b>largest</b> total delay from any input to Y. It sets the propagation delay of the whole circuit.' : 'Trace the path with the <b>smallest</b> total delay from any input to Y. It sets the contamination delay of the circuit.');
      else if (path[path.length - 1] !== 'G6') L.fb(fb, 'info', 'Path so far: ' + path.join(' → ') + ' · delay ' + d + ' ps. Keep going to G6.');
    }
    function tap(k) {
      if (!path.length) { if (!NODES[k].in) { L.fb(fb, 'bad', 'Start at a primary input (A–E).'); return; } path = [k]; draw(); return; }
      var last = path[path.length - 1];
      if (last === 'G6') { path = NODES[k].in ? [k] : []; draw(); return; }
      if (!EDGES.some(function (e) { return e[0] === last && e[1] === k; })) { L.fb(fb, 'bad', k + ' is not driven by ' + last + '. Follow the wires.'); return; }
      path.push(k); draw();
      if (k === 'G6') {
        var d = path.reduce(function (a, x) { return a + NODES[x].d; }, 0), target = mode === 'max' ? MAX : MIN;
        if (d === target) {
          found[mode] = 1;
          L.fb(fb, 'ok', '✓ ' + path.join(' → ') + ' = <b>' + d + ' ps</b>. ' + (mode === 'max' ? 'This is the critical path: the circuit\'s propagation delay t_pd = ' + MAX + ' ps. Speeding up any other path will not make the circuit faster.' : 'This is the shortest path: the contamination delay t_cd = ' + MIN + ' ps – the earliest time Y can start to change.') + (found.max && found.min ? ' Both tasks complete!' : ' Now try the other task.'));
          if (found.max && found.min) api.done();
        } else L.fb(fb, 'bad', 'This path takes ' + d + ' ps. ' + (mode === 'max' ? 'There is a slower path – look for the gates with the biggest delays.' : 'There is a faster path – look for the route through the fewest, quickest gates.'));
      }
    }
    draw();
  }

  function propFrame(k) {
    var gates = [['A', 0], ['G1 NAND', 30], ['G4 AOI', 60], ['G6 XOR', 70]], o = '', acc = 0;
    gates.forEach(function (g, i) {
      var x = 50 + i * 150; acc += g[1];
      var on = i <= k;
      o += R(x - 45, 60, 90, 50, on ? 'box-on' : 'box', 10) + T(x, 82, g[0], 't-ink t-b t-sm') + T(x, 100, i ? g[1] + ' ps' : 'input', 't-cu t-sm');
      if (i < 3) o += P('M' + (x + 45) + ' 85H' + (x + 105), i < k ? 'w-on flow' : 'w');
      o += T(x, 140, on ? 'arrives at ' + acc + ' ps' : '…', on ? 't-sig t-b t-sm' : 't-dim t-sm');
    });
    o += T(300, 30, k < 3 ? 'The transition ripples through the path' : 'Path delay = 0 + 30 + 60 + 70 = 160 ps', 't-vio t-b');
    return S(620, 160, o, 'Delay accumulating along a path');
  }

  L.module({
    n: 1,
    lead: 'Every digital design has to answer one question: how fast can it go? Learn the language of timing – propagation and contamination delay, rise and fall times – and find the critical path that limits the speed of a circuit.',
    tags: ['propagation delay', 'contamination delay', 'rise / fall time', 'path delay', 'critical path', 'delay estimation'],
    sections: [
      {
        id: 'c-terms', type: 'concept', title: 'Timing terminology', nav: 'Terminology',
        html: '<p>A logic gate never responds instantly. When an input changes, the output changes a little later, and it takes time to swing from one logic level to the other. Timing analysis puts numbers on these effects.</p>' +
          '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Term</th><th>Symbol</th><th>Meaning</th><th>Measured</th></tr>' +
          '<tr><td>Propagation delay</td><td>t_pd</td><td>maximum time from an input change until the output is stable at its new value</td><td>50 % in → 50 % out</td></tr>' +
          '<tr><td>Contamination delay</td><td>t_cd</td><td>minimum time from an input change until the output starts to change</td><td>50 % in → first output change</td></tr>' +
          '<tr><td>High-to-low delay</td><td>t_pHL</td><td>delay when the output falls</td><td>50 % → 50 %</td></tr>' +
          '<tr><td>Low-to-high delay</td><td>t_pLH</td><td>delay when the output rises</td><td>50 % → 50 %</td></tr>' +
          '<tr><td>Rise time</td><td>t_r</td><td>time for the output to rise</td><td>10 % → 90 %</td></tr>' +
          '<tr><td>Fall time</td><td>t_f</td><td>time for the output to fall</td><td>90 % → 10 %</td></tr></table></div>' +
          '<div class="l7-eq">t_pd ≈ (t_pHL + t_pLH) / 2   (average)      worst case = max(t_pHL, t_pLH)</div>' +
          '<p>Rise and fall times are also called <b>transition times</b> or <b>slew</b>. A slow input transition makes the next gate slower too, so delay and slew are always analysed together.</p>'
      },
      { id: 'w-diag', type: 'widget', title: 'Interactive timing diagram', nav: 'Timing diagram', intro: 'Change the delays and transition times of this inverter (at least three changes) and watch where each quantity is measured.', build: timingDiagram },
      {
        id: 'c-tcd', type: 'concept', title: 'Propagation vs contamination delay', nav: 't_pd vs t_cd',
        html: '<p>For a single gate, the output may start to move early (t_cd) and settle late (t_pd). Between those times it is <b>uncertain</b>. For a whole circuit:</p>' +
          '<div class="l7-grid2"><div class="l7-box cu"><h4>Propagation delay (max)</h4><p>The <b>longest</b> path from any input to the output. The output is guaranteed valid only after t_pd. Sets the <b>maximum speed</b>.</p></div>' +
          '<div class="l7-box vio"><h4>Contamination delay (min)</h4><p>The <b>shortest</b> path from any input to the output. The old output value is guaranteed only until t_cd. Matters for <b>hold</b> timing (Module 3).</p></div></div>' +
          '<p style="margin-top:12px">Both come from the same circuit: one by adding the largest delays along the slowest route, the other by adding the smallest delays along the fastest route.</p>'
      },
      {
        id: 'st-path', type: 'steps', title: 'Animation: delay through a logic path', nav: 'Path animation',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['An input A changes at t = 0.', 'G1 (30 ps) responds: its output changes at 30 ps.', 'G4 (60 ps) responds: its output changes at 30 + 60 = 90 ps.', 'G6 (70 ps) responds at 160 ps. <b>Path delay = sum of gate delays along the path.</b> (Wire delay and loading also add – Module 2.)'][k], svg: propFrame(k) }; })
      },
      {
        id: 'c-crit', type: 'concept', title: 'Critical paths and timing bottlenecks', nav: 'Critical path',
        html: '<p>A circuit has many paths from its inputs to its outputs. The path with the largest delay is the <b>critical path</b>. It is the timing bottleneck: the whole circuit can only be as fast as this one path.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Critical path</h4><p>Largest delay. Any improvement here speeds up the circuit (until another path becomes critical).</p></div><div class="l7-box"><h4>Near-critical paths</h4><p>Slightly faster paths. Optimising only the critical path soon makes one of these the new bottleneck.</p></div><div class="l7-box cu"><h4>Non-critical paths</h4><p>Plenty of spare time (slack). They can use smaller, slower, lower-power gates.</p></div></div>'
      },
      { id: 'w-path', type: 'widget', title: 'Identify the critical path', nav: 'Path finder', intro: 'Complete both tasks: trace the critical path, then the shortest path.', build: pathFinder },
      {
        id: 'c-est', type: 'concept', title: 'Delay estimation', nav: 'Estimation',
        html: '<p>Early in a design, delay is estimated before any detailed analysis is possible:</p>' +
          '<div class="l7-grid3"><div class="l7-box"><h4>Unit-delay model</h4><p>Every gate counts as 1 delay unit. Fast to compare architectures; ignores loading.</p></div><div class="l7-box"><h4>Gate-delay tables</h4><p>Each gate type has a typical delay (from a library datasheet). Path delay = sum along the path.</p></div><div class="l7-box"><h4>Load-dependent model</h4><p>Delay depends on the capacitance a gate drives: d = d₀ + k·C<sub>load</sub>. Developed in Module 2.</p></div></div>' +
          '<div class="l7-eq">Path delay = Σ gate delays (+ wire delays)      f_max of a combinational block ≈ 1 / t_pd</div>'
      },
      {
        id: 'rv-t', type: 'reveal', title: 'Click to reveal: timing questions', nav: 'Reveal',
        items: [
          { q: 'Why are delays measured at the 50 % point?', a: 'The 50 % level is close to the switching threshold of the next gate, so it marks when the next stage "sees" the change. It also makes delays independent of the exact slew.' },
          { q: 'Why can t_pHL and t_pLH differ?', a: 'Pull-down and pull-up networks have different strengths (nMOS vs pMOS, series stacks), so falling and rising outputs take different times.' },
          { q: 'Can a circuit be slower than its critical path?', a: 'Not in normal operation – by definition the critical path is the slowest. But the critical path changes with process, voltage, temperature and input slews, so several paths are checked.' },
          { q: 'Why does a slow input slew slow the next gate?', a: 'While the input passes slowly through the switching region, the gate drives its output only weakly, so its own delay and output slew increase.' },
          { q: 'What is a false path?', a: 'A path that exists structurally but can never be activated by any input pattern. Analysis tools can be told to ignore it.' },
          { q: 'Why care about the shortest path at all?', a: 'If data races through a very short path it can change a flip-flop input too soon after a clock edge – a hold violation (Module 3).' }
        ]
      },
      {
        id: 'dd-t', type: 'drag', title: 'Drag & drop: match the description to the term', nav: 'Drag & drop',
        bins: ['Propagation delay', 'Contamination delay', 'Rise / fall time', 'Critical path'],
        items: [['Output guaranteed stable after this time', 0], ['Longest input-to-output delay', 0], ['Earliest time the output may change', 1], ['Shortest input-to-output delay', 1], ['Measured between 10 % and 90 %', 2], ['Also called slew or transition time', 2], ['Limits the maximum operating speed', 3], ['The path worth optimising first', 3]]
      },
      {
        id: 'calc1', type: 'calc', title: 'Timing challenge: calculations', nav: 'Calculate',
        items: [
          { q: 'A gate has t_pHL = 40 ps and t_pLH = 60 ps. What is its average propagation delay (ps)?', a: 50, u: 'ps', h: '(t_pHL + t_pLH)/2.', s: '(40 + 60)/2 = <b>50 ps</b>.' },
          { q: 'A path contains gates with delays 25, 40, 35 and 50 ps. What is the path delay (ps)?', a: 150, u: 'ps', h: 'Add the delays.', s: '25 + 40 + 35 + 50 = <b>150 ps</b>.' },
          { q: 'An output reaches 10 % of VDD at 120 ps and 90 % of VDD at 175 ps. What is the rise time (ps)?', a: 55, u: 'ps', h: 'Rise time is measured 10 % → 90 %.', s: '175 − 120 = <b>55 ps</b>.' },
          { q: 'Using the path finder circuit, what is the contamination delay of the circuit (ps)?', a: 105, u: 'ps', h: 'The shortest path is E → G5 → G6.', s: '35 + 70 = <b>105 ps</b>.' },
          { q: 'A combinational block has a critical path of 2.5 ns. Roughly what is the highest rate (MHz) at which new inputs can be applied and results read?', a: 400, u: 'MHz', h: 'f ≈ 1/t_pd.', s: '1 / 2.5 ns = <b>400 MHz</b> (ignoring register overheads, Module 3).' }
        ]
      },
      {
        id: 'mcq1', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Propagation delay is normally measured between…', o: ['10 % and 90 % points', 'the 50 % point of the input and of the output', 'the start of the input and end of the output', 'peak values'], a: 1, w: '50 % in to 50 % out.' },
          { q: 'The critical path of a circuit is the path with…', o: ['the most gates', 'the largest total delay', 'the smallest delay', 'the most fan-out'], a: 1, w: 'Largest delay, not necessarily the most gates.' },
          { q: 'Contamination delay is important mainly for…', o: ['maximum frequency', 'hold timing', 'power', 'area'], a: 1, w: 'It tells how soon a signal may change.' },
          { q: 'Rise time is measured between…', o: ['0 % and 100 %', '10 % and 90 %', '50 % and 50 %', 'input and output edges'], a: 1, w: '10 % → 90 %.' }
        ]
      },
      {
        id: 'short1', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain the difference between propagation delay and contamination delay of a combinational circuit.', k: ['longest|maximum|max', 'shortest|minimum|min', 'stable|valid|settle', 'start|begin|earliest'], m: 'Propagation delay is the maximum delay – along the longest path – after which the output is guaranteed stable at its new value. Contamination delay is the minimum delay – along the shortest path – after which the output may begin to change. Between t_cd and t_pd the output is uncertain.' },
          { q: 'Why is it pointless to speed up a non-critical path if the goal is a faster circuit?', k: ['critical|longest', 'limit|bottleneck|set', 'slack|spare', 'power|area|smaller'], m: 'The circuit delay is set by the critical (longest) path. Making a non-critical path faster does not change the longest delay, so the circuit is no faster; it only costs area and power. Non-critical paths have slack and can even use smaller, lower-power gates.' }
        ]
      },
      {
        id: 'scen1', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Your circuit\'s critical path is 900 ps and the next-slowest path is 880 ps. You speed up the critical path by 100 ps.', q: 'How much faster is the circuit now?', o: [{ t: '100 ps faster (800 ps)', ok: false, w: 'Another path now limits the circuit.' }, { t: 'Only 20 ps faster: the 880 ps path becomes critical', ok: true, w: 'Correct – near-critical paths must be optimised too.' }, { t: 'Not faster at all', ok: false, w: 'It improves until the 880 ps path takes over.' }] },
          { s: 'A designer measures a gate\'s delay from the start of the input transition to the end of the output transition.', q: 'What is wrong with this measurement?', o: [{ t: 'It mixes delay with rise/fall times; delay should be measured 50 % to 50 %', ok: true, w: 'Transition times are measured separately (10–90 %).' }, { t: 'Nothing – this is the standard definition', ok: false, w: 'The standard uses 50 % points.' }, { t: 'Delay should be measured at 90 %', ok: false, w: '90 % is used only for transition time.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Propagation delay t_pd is the…', o: ['minimum time until the output may change', 'maximum time until the output is stable', 'rise time', 'clock period'], a: 1, w: 'Max delay to a stable output.' },
      { d: 'Easy', q: 'Fall time is measured between…', o: ['90 % and 10 %', '50 % and 50 %', '0 % and 100 %', '100 % and 50 %'], a: 0, w: 'Transition time from 90 % to 10 %.' },
      { d: 'Easy', q: 'The critical path determines…', o: ['the power', 'the maximum operating speed', 'the number of inputs', 'the area'], a: 1, w: 'It is the slowest path.' },
      { d: 'Medium', q: 't_pHL = 70 ps, t_pLH = 50 ps. The average propagation delay is…', o: ['50 ps', '60 ps', '70 ps', '120 ps'], a: 1, w: '(70 + 50)/2.' },
      { d: 'Medium', q: 'Gates of 20, 30 and 45 ps lie on a path. Its delay is…', o: ['45 ps', '65 ps', '95 ps', '30 ps'], a: 2, w: 'Sum of delays.' },
      { d: 'Medium', q: 'In a timing diagram, the output starts to change 30 ps after the input and settles 80 ps after it. Then…', o: ['t_cd = 30 ps, t_pd = 80 ps', 't_cd = 80 ps, t_pd = 30 ps', 't_pd = 50 ps', 't_cd = t_pd = 55 ps'], a: 0, w: 'Earliest change = t_cd, settled = t_pd.' },
      { d: 'Medium', q: 'Contamination delay of a circuit is found from…', o: ['the longest path', 'the shortest path', 'the clock', 'the power report'], a: 1, w: 'Minimum path delay.' },
      { d: 'Hard', q: 'A circuit has paths of 300, 420 and 410 ps. You speed up the 420 ps path by 50 ps. The new circuit delay is…', o: ['370 ps', '410 ps', '300 ps', '420 ps'], a: 1, w: 'The 410 ps path becomes critical.' },
      { d: 'Hard', q: 'Why does a slow input transition increase a gate\'s delay?', o: ['it changes the logic function', 'the gate spends longer in its weak-drive switching region', 'it adds capacitance', 'it lowers VDD'], a: 1, w: 'Weak drive while the input crosses the threshold region.' },
      { d: 'Hard', q: 'A combinational block with t_pd = 4 ns can accept new inputs at most about every…', o: ['1 ns', '2 ns', '4 ns', '8 ns'], a: 2, w: 'Its output is only valid t_pd after the inputs change.' }
    ]
  });
})();
