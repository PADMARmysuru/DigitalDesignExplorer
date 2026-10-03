/* Level 8 · Module 4 – Clock Timing */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* ---------- Widget: clock network and skew ---------- */
  function skewLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Clock network lab · two clock paths, two registers</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { la: 300, lb: 300, T: 1000, logic: 780, lmin: 120, unc: 0 }, cq = 70, su = 60, th = 40, seen = {};
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    L.slider(c1, 'Clock path A delay (to Register A, launch)', 100, 600, 10, p.la, function (v) { return v + ' ps'; }, function (v) { p.la = v; upd(); });
    L.slider(c1, 'Clock path B delay (to Register B, capture)', 100, 600, 10, p.lb, function (v) { return v + ' ps'; }, function (v) { p.lb = v; upd(); });
    L.slider(c1, 'Clock uncertainty (jitter margin)', 0, 100, 5, p.unc, function (v) { return v + ' ps'; }, function (v) { p.unc = v; upd(); });
    L.slider(c2, 'Clock period T', 700, 1300, 10, p.T, function (v) { return v + ' ps'; }, function (v) { p.T = v; upd(); });
    L.slider(c2, 'Data path delay, longest', 300, 1200, 10, p.logic, function (v) { return v + ' ps'; }, function (v) { p.logic = v; upd(); });
    L.slider(c2, 'Data path delay, shortest', 0, 400, 10, p.lmin, function (v) { return v + ' ps'; }, function (v) { p.lmin = v; upd(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var wave = L.h('div', 'l7-svgbox'); body.appendChild(wave);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function bufs(y, d, n) { var o = '', x0 = 110, w = 300 / n; for (var i = 0; i < n; i++) o += '<path d="M' + (x0 + i * w + 8) + ' ' + (y - 12) + 'l22 12l-22 12z" class="box-vio"/>'; return o + P('M80 ' + y + 'H420', 'wv-clk') + T(265, y - 18, d + ' ps', 't-vio t-b t-sm'); }
    function upd() {
      var skew = p.lb - p.la, ss = p.T + skew - (cq + p.logic + su) - p.unc, hs = cq + p.lmin - th - skew - p.unc;
      seen[skew > 0 ? 'pos' : skew < 0 ? 'neg' : 'zero'] = 1; if (seen.pos && seen.neg) api.done();
      var o = '';
      o += R(10, 92, 66, 46, 'box-cu', 10) + T(43, 113, 'Clock', 't-ink t-b t-sm') + T(43, 128, 'source', 't-ink t-sm');
      o += P('M76 115H80V50M80 115V180', 'wv-clk');
      o += bufs(50, p.la, Math.max(1, Math.round(p.la / 150))) + bufs(180, p.lb, Math.max(1, Math.round(p.lb / 150)));
      o += R(420, 26, 80, 48, 'box-on', 8) + T(460, 55, 'Reg A', 't-ink t-b');
      o += R(420, 156, 80, 48, 'box-on', 8) + T(460, 185, 'Reg B', 't-ink t-b');
      o += P('M500 50H540V180H500', 'w-cu') + R(518, 96, 44, 40, 'box', 6) + T(540, 120, 'logic', 't-dim t-sm');
      o += T(560, 70, 'data', 't-cu t-sm', 'start');
      pic.innerHTML = S(600, 214, o, 'Clock network');
      // waveforms
      var X = function (t) { return 70 + t * 0.4; }, w = '';
      w += T(10, 34, 'source', 't-dim t-sm', 'start') + T(10, 74, 'CLK at A', 't-ink t-sm', 'start') + T(10, 114, 'CLK at B', 't-ink t-sm', 'start');
      function clk(y, d) { var s = 'M' + X(0) + ' ' + (y + 12), e = d; s += 'H' + X(e) + 'V' + (y - 12) + 'H' + X(e + p.T / 2) + 'V' + (y + 12) + 'H' + X(e + p.T) + 'V' + (y - 12) + 'H' + X(Math.min(1400, e + 1.5 * p.T)); return P(s, 'wv-clk'); }
      w += clk(30, 0) + clk(70, p.la) + clk(110, p.lb);
      w += P('M' + X(p.la) + ' 58V126', 'w-dash') + P('M' + X(p.lb) + ' 98V130', 'w-dash');
      w += P('M' + X(Math.min(p.la, p.lb)) + ' 136H' + X(Math.max(p.la, p.lb)), skew === 0 ? 'w' : 'w-cu') + T(X((p.la + p.lb) / 2), 152, 'skew = ' + skew + ' ps', 't-cu t-b t-sm');
      wave.innerHTML = S(640, 160, w, 'Clock waveforms at each register');
      out.innerHTML = '<span class="k">Clock latency</span> A = ' + p.la + ' ps, B = ' + p.lb + ' ps<br><span class="k">Skew</span> = latency(capture B) − latency(launch A) = <span class="c">' + skew + ' ps</span> ' + (skew > 0 ? '(positive)' : skew < 0 ? '(negative)' : '(zero)') +
        '<br><span class="k">Setup slack</span> = T + skew − (t_cq + t_logic,max + t_su) − uncertainty = ' + p.T + ' + ' + skew + ' − ' + (cq + p.logic + su) + ' − ' + p.unc + ' = <span class="' + (ss < 0 ? 'c' : 'v') + '">' + ss + ' ps</span>' +
        '<br><span class="k">Hold slack</span> = t_cq + t_logic,min − t_h − skew − uncertainty = ' + (cq + p.lmin) + ' − ' + th + ' − ' + skew + ' − ' + p.unc + ' = <span class="' + (hs < 0 ? 'c' : 'v') + '">' + hs + ' ps</span>' +
        '<br><span class="k">Fixed:</span> t_cq = ' + cq + ', t_su = ' + su + ', t_h = ' + th + ' ps';
      verdict.className = 'l7-verdict ' + (ss >= 0 && hs >= 0 ? 'ok' : 'bad');
      verdict.innerHTML = (ss >= 0 && hs >= 0 ? '✅ Setup and hold met' : (ss < 0 ? '❌ Setup violation ' : '') + (hs < 0 ? '❌ Hold violation' : '')) +
        '<small>' + (skew > 0 ? 'Positive skew: the capture clock arrives later, giving the data more time – it HELPS setup but HURTS hold.' : skew < 0 ? 'Negative skew: the capture clock arrives earlier – it HURTS setup but HELPS hold.' : 'Zero skew: both registers see the edge at the same time. Now make the skew positive and then negative.') + '</small>';
    }
    upd();
  }

  /* ---------- Widget: jitter ---------- */
  function jitterLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Jitter lab · edges that do not arrive exactly on time</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { j: 20, T: 1000 }, n = 0;
    L.slider(body, 'Peak jitter (±)', 0, 80, 5, p.j, function (v) { return '±' + v + ' ps'; }, function (v) { p.j = v; n++; upd(); });
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    row.appendChild(L.btn('🎲 Capture 30 more cycles', 'pri', function () { n++; upd(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    function upd() {
      if (n >= 3) api.done();
      var o = '', X = function (t) { return 40 + (t + 200) * 0.9; }, minP = 1e9;
      o += P('M' + X(0) + ' 10V170', 'w-dash') + P('M' + X(p.T * 0.4) + ' 10V170', 'w-dash');
      o += T(X(0), 186, 'ideal edge', 't-dim t-sm') + T(X(p.T * 0.4), 186, 'ideal next edge (scaled)', 't-dim t-sm');
      for (var i = 0; i < 30; i++) {
        var a = (Math.random() * 2 - 1) * p.j, b = (Math.random() * 2 - 1) * p.j, y = 18 + i * 5;
        minP = Math.min(minP, p.T + b - a);
        o += '<line x1="' + X(a) + '" y1="' + y + '" x2="' + X(a) + '" y2="' + (y + 4) + '" stroke="#5856d6" stroke-width="2" opacity=".75"/>';
        o += '<line x1="' + X(p.T * 0.4 + b) + '" y1="' + y + '" x2="' + X(p.T * 0.4 + b) + '" y2="' + (y + 4) + '" stroke="#5856d6" stroke-width="2" opacity=".75"/>';
      }
      o += '<rect x="' + X(-p.j) + '" y="12" width="' + (X(p.j) - X(-p.j)) + '" height="156" class="win-hold"/>';
      o += '<rect x="' + X(p.T * 0.4 - p.j) + '" y="12" width="' + (X(p.T * 0.4 + p.j) - X(p.T * 0.4 - p.j)) + '" height="156" class="win-hold"/>';
      pic.innerHTML = S(620, 196, o, 'Jitter on clock edges');
      out.innerHTML = '<span class="k">Nominal period</span> ' + p.T + ' ps<br><span class="k">Worst-case short period</span> T − 2·J = <span class="c">' + (p.T - 2 * p.j) + ' ps</span> (shortest seen this run: ' + Math.round(minP) + ' ps)' +
        '<br><span class="k">Effect</span> a shorter cycle leaves less time for data → timing tools subtract jitter as <b>clock uncertainty</b> in setup checks.';
    }
    upd();
  }

  function edgeFrame(k) {
    var o = '', d = [0, 1, 2, 3][k];
    o += R(10, 70, 70, 40, 'box-cu', 8) + T(45, 95, 'PLL', 't-ink t-b');
    var lv = [[80, 90, 180, 90], [180, 90, 280, 50], [180, 90, 280, 130], [280, 50, 400, 30], [280, 50, 400, 70], [280, 130, 400, 110], [280, 130, 400, 150]];
    lv.forEach(function (s, i) { var stage = i === 0 ? 0 : i < 3 ? 1 : 2; o += P('M' + s[0] + ' ' + s[1] + 'H' + ((s[0] + s[2]) / 2) + 'V' + s[3] + 'H' + s[2], stage < d ? 'w-on' : 'w'); });
    [[180, 90], [280, 50], [280, 130]].forEach(function (b, i) { o += '<path d="M' + (b[0] - 14) + ' ' + (b[1] - 10) + 'l20 10l-20 10z" class="' + ((i === 0 ? 1 : 2) <= d ? 'box-on' : 'box-vio') + '"/>'; });
    [30, 70, 110, 150].forEach(function (y, i) { o += R(400, y - 12, 50, 24, d >= 3 ? 'box-on' : 'box', 5) + T(425, y + 4, 'FF' + (i + 1), 't-ink t-sm'); });
    o += T(300, 182, ['The clock edge leaves the source (PLL)', 'It passes the first buffer…', '…then the next level of buffers', '…and finally reaches every flip-flop'][k], 't-vio t-b t-sm');
    return S(600, 196, o, 'Clock edge travelling through a buffer tree');
  }

  L.module({
    n: 4,
    lead: 'The clock is the heartbeat of a synchronous design – but it is a real signal on real wires. Explore clock latency, skew, jitter and uncertainty, and see how they eat into (or add to) your timing budget.',
    tags: ['clock distribution', 'latency', 'insertion delay', 'skew', 'jitter', 'uncertainty', 'clock variation'],
    sections: [
      {
        id: 'c-dist', type: 'concept', title: 'Clock distribution', nav: 'Distribution',
        html: '<p>One clock source (usually a PLL) must drive thousands to millions of flip-flops. The clock is delivered through a network of buffers and wires – the <b>clock network</b> – which carries the heaviest load and switches every cycle.</p>' +
          '<div class="l7-grid2"><div class="l7-box sig"><h4>Goals</h4><ul><li>Edges arrive at all flip-flops at nearly the same time (low skew)</li><li>Sharp, clean edges</li><li>Low jitter and low power</li></ul></div><div class="l7-box cu"><h4>Why it is hard</h4><ul><li>Long wires and huge fan-out</li><li>Different path lengths and loads</li><li>Process, voltage and temperature vary across the die</li></ul></div></div>' +
          '<p style="margin-top:12px">How the clock network is physically built (clock tree synthesis) belongs to Level 10. Here we study its <b>timing effects</b>.</p>'
      },
      {
        id: 'st-edge', type: 'steps', title: 'Animation: a clock edge travelling to the registers', nav: 'Edge animation',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['A rising edge leaves the clock source (PLL).', 'It is amplified by the first clock buffer, which drives the next level.', 'More buffer levels share out the huge fan-out of the clock.', 'The edge reaches every flip-flop. Each flip-flop\'s arrival time is its clock latency; the differences between them are clock skew.'][k], svg: edgeFrame(k) }; })
      },
      {
        id: 'c-lat', type: 'concept', title: 'Latency, insertion delay and skew', nav: 'Latency & skew',
        html: '<div class="l7-grid3"><div class="l7-box"><h4>Source latency</h4><p>Delay from the clock origin (e.g. PLL output or off-chip source) to the clock definition point on the block.</p></div><div class="l7-box"><h4>Network latency / insertion delay</h4><p>Delay from the clock definition point through the buffers to a flip-flop\'s clock pin.</p></div><div class="l7-box cu"><h4>Clock skew</h4><p>Difference in clock arrival time between two related flip-flops.</p></div></div>' +
          '<div class="l7-eq">skew = latency(capture FF) − latency(launch FF)</div>' +
          '<div class="l7-eq">setup: t_cq + t_logic,max + t_su ≤ T + skew − uncertainty      hold: t_cq + t_logic,min ≥ t_h + skew + uncertainty</div>' +
          '<p>Positive skew gives the setup check more time but makes hold harder; negative skew does the opposite. Skew can even be used on purpose ("useful skew"), but uncontrolled skew is a timing problem.</p>'
      },
      { id: 'w-skew', type: 'widget', title: 'Clock network lab: observe skew', nav: 'Skew lab', intro: 'Change the clock path delays to create positive and negative skew. Watch how setup and hold slack move in opposite directions.', build: skewLab },
      {
        id: 'c-jit', type: 'concept', title: 'Jitter, uncertainty and clock variation', nav: 'Jitter',
        html: '<p><b>Jitter</b> is the variation of clock edges from their ideal positions over time, caused by noise in the PLL and supply noise in the clock buffers.</p>' +
          '<div class="l7-grid3"><div class="l7-box vio"><h4>Period jitter</h4><p>How much one period differs from the nominal period.</p></div><div class="l7-box vio"><h4>Cycle-to-cycle jitter</h4><p>Change in period between two consecutive cycles.</p></div><div class="l7-box"><h4>Clock uncertainty</h4><p>A margin set in the constraints that covers jitter (and, before the clock network exists, an estimate of skew).</p></div></div>' +
          '<p style="margin-top:12px"><b>Clock variation</b>: the delay of each clock buffer changes with process, voltage and temperature, and the two branches of a clock network may not vary identically – so skew itself changes from chip to chip and moment to moment.</p>'
      },
      { id: 'w-jit', type: 'widget', title: 'Jitter lab', nav: 'Jitter lab', intro: 'Increase the jitter and capture more cycles (at least three actions). How short can a cycle become?', build: jitterLab },
      {
        id: 'c-prob', type: 'concept', title: 'Common clock timing problems', nav: 'Problems',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Problem</th><th>Effect</th><th>Typical response</th></tr>' +
          '<tr><td>Large skew</td><td>setup or hold failures between registers on different branches</td><td>balance clock paths; check both setup and hold</td></tr>' +
          '<tr><td>High jitter</td><td>shorter effective period</td><td>better PLL, cleaner supply, larger uncertainty margin</td></tr>' +
          '<tr><td>Slow clock edges</td><td>larger flip-flop delays, more variation</td><td>stronger clock buffers</td></tr>' +
          '<tr><td>Gated or divided clocks</td><td>extra latency and skew on some branches</td><td>define generated clocks in the constraints</td></tr>' +
          '<tr><td>Clock domain crossings</td><td>unrelated clocks – normal setup/hold analysis is meaningless</td><td>synchronizers; declare asynchronous clock groups</td></tr></table></div>'
      },
      {
        id: 'rv-clk', type: 'reveal', title: 'Click to reveal: clock insights', nav: 'Reveal',
        items: [
          { q: 'Does a long but equal clock latency to every flip-flop cause failures?', a: 'Not for paths inside the block – equal latency means zero skew. It matters for interfaces, where it shifts when data leaves or is captured relative to the outside world.' },
          { q: 'Why does positive skew hurt hold?', a: 'The capture flip-flop is clocked later, so it is still holding its old value when the new data, launched earlier, arrives.' },
          { q: 'Why is jitter added to setup but usually not to hold checks?', a: 'Hold compares data and capture from the same clock edge, so most cycle-to-cycle jitter cancels; setup spans two edges, where jitter shortens the period.' },
          { q: 'What is useful skew?', a: 'Deliberately delaying the clock to a capture flip-flop to borrow time for a slow path – as long as the next stage and hold checks still pass.' },
          { q: 'Why is the clock network a big power consumer?', a: 'It switches twice every cycle (α = 1) and drives a very large total capacitance.' },
          { q: 'What is insertion delay?', a: 'The clock network latency from the clock root to a flip-flop clock pin – the delay the clock network "inserts".' }
        ]
      },
      {
        id: 'dd-clk', type: 'drag', title: 'Drag & drop: classify the clock effect', nav: 'Drag & drop',
        bins: ['Skew', 'Jitter', 'Latency', 'Uncertainty'],
        items: [['Difference in arrival time between two flip-flops', 0], ['Helps setup when positive', 0], ['Edge-to-edge variation over time', 1], ['Caused by PLL and supply noise', 1], ['Source-to-flip-flop delay', 2], ['Also called insertion delay', 2], ['Margin set in the constraints', 3], ['Subtracted from available time in setup checks', 3]]
      },
      {
        id: 'calc4', type: 'calc', title: 'Clock timing calculations', nav: 'Calculate',
        items: [
          { q: 'The clock reaches the launch flip-flop at 420 ps and the capture flip-flop at 470 ps. What is the skew (ps)?', a: 50, u: 'ps', h: 'Capture − launch.', s: '470 − 420 = <b>+50 ps</b> (positive skew).' },
          { q: 'T = 1000 ps, skew = +50 ps, t_cq = 80, t_logic,max = 820, t_su = 60, uncertainty = 30 ps. Setup slack (ps)?', a: 60, u: 'ps', h: 'T + skew − (t_cq + logic + t_su) − unc.', s: '1000 + 50 − 960 − 30 = <b>+60 ps</b>.' },
          { q: 'Same path: t_cq = 80, t_logic,min = 20, t_h = 40, skew = +50, uncertainty = 30 ps. Hold slack (ps)?', a: -20, u: 'ps', h: 't_cq + t_logic,min − t_h − skew − unc.', s: '100 − 40 − 50 − 30 = <b>−20 ps</b> → hold violation caused by positive skew.' },
          { q: 'A 1 GHz clock has ±25 ps peak jitter. What is the worst-case shortest period (ps)?', a: 950, u: 'ps', h: 'T − 2J.', s: '1000 − 50 = <b>950 ps</b>.' },
          { q: 'Source latency is 200 ps and network latency is 350 ps. What is the total clock latency (ps)?', a: 550, u: 'ps', h: 'Add them.', s: '200 + 350 = <b>550 ps</b>.' }
        ]
      },
      {
        id: 'mcq4', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Positive clock skew (capture clock later than launch) …', o: ['helps setup, hurts hold', 'hurts setup, helps hold', 'affects only power', 'has no effect'], a: 0, w: 'More time for data, less hold margin.' },
          { q: 'Clock jitter is…', o: ['a fixed delay difference between registers', 'variation of edge timing over time', 'the clock frequency', 'the clock duty cycle only'], a: 1, w: 'Temporal variation.' },
          { q: 'Clock uncertainty in the constraints usually models…', o: ['logic delay', 'jitter and (pre-layout) skew', 'leakage', 'wire capacitance'], a: 1, w: 'A safety margin.' },
          { q: 'Insertion delay is…', o: ['the delay of the data path', 'the clock network latency to a flip-flop', 'the setup time', 'the hold time'], a: 1, w: 'Clock root to clock pin.' }
        ]
      },
      {
        id: 'short4', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain how clock skew affects setup and hold timing.', k: ['positive|later', 'negative|earlier', 'setup', 'hold'], m: 'With positive skew the capture clock arrives later than the launch clock, so the data has more time and setup improves, but the capture register holds its old value longer, so hold gets worse. Negative skew does the opposite: it reduces setup slack and increases hold slack.' },
          { q: 'Distinguish clock skew from clock jitter.', k: ['spatial|between|two flip-flops|location', 'time|temporal|cycle', 'noise|pll', 'path|latency|delay'], m: 'Skew is a spatial difference: the same clock edge arrives at different flip-flops at different times because their clock paths have different delays. Jitter is a temporal variation: successive edges at the same point do not arrive at their ideal times, mainly due to PLL and supply noise.' }
        ]
      },
      {
        id: 'scen4', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A path fails setup by 30 ps. The capture flip-flop\'s clock path could be delayed by 40 ps without affecting anything else.', q: 'What is this technique and what must you check?', o: [{ t: 'Useful skew – check hold on this path and setup on paths launched from the capture flip-flop', ok: true, w: 'Correct – borrowed time must not create new violations.' }, { t: 'Clock gating – check power only', ok: false, w: 'Clock gating saves power; it is not a timing fix here.' }, { t: 'Nothing needs checking', ok: false, w: 'Skew always affects hold and downstream paths.' }] },
          { s: 'Lab measurements show the PLL\'s jitter is twice the value assumed in the constraints.', q: 'What is the risk?', o: [{ t: 'Setup slack is overestimated; some paths may fail at speed', ok: true, w: 'Increase the uncertainty margin and re-check timing.' }, { t: 'Only hold paths are affected', ok: false, w: 'Jitter mainly shortens the period for setup.' }, { t: 'No risk – jitter averages out', ok: false, w: 'Worst-case cycles matter.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Clock skew is…', o: ['difference in clock arrival time between flip-flops', 'variation of clock edges over time', 'the clock frequency', 'the delay of a PLL'], a: 0, w: 'Spatial arrival difference.' },
      { d: 'Easy', q: 'Clock latency is…', o: ['the delay from clock source to a flip-flop', 'the clock period', 'the setup time', 'jitter'], a: 0, w: 'Source + network latency.' },
      { d: 'Easy', q: 'Which mainly causes jitter?', o: ['long data paths', 'PLL and supply noise', 'high fan-out of data', 'hold time'], a: 1, w: 'Noise sources.' },
      { d: 'Medium', q: 'Launch clock at 300 ps, capture clock at 260 ps. Skew =', o: ['+40 ps', '−40 ps', '560 ps', '0'], a: 1, w: 'Capture − launch = −40 ps.' },
      { d: 'Medium', q: 'Negative skew…', o: ['helps setup', 'hurts setup and helps hold', 'hurts hold', 'removes jitter'], a: 1, w: 'Capture earlier.' },
      { d: 'Medium', q: 'T = 800 ps with ±20 ps jitter. Shortest possible period =', o: ['780 ps', '760 ps', '800 ps', '840 ps'], a: 1, w: 'T − 2J.' },
      { d: 'Medium', q: 'Clock uncertainty is subtracted in…', o: ['setup checks (and usually added in hold)', 'power reports', 'area estimates', 'none'], a: 0, w: 'It is a timing margin.' },
      { d: 'Hard', q: 'T = 1 ns, skew = −40 ps, t_cq + t_logic + t_su = 930 ps, uncertainty 20 ps. Setup slack =', o: ['+10 ps', '+50 ps', '−10 ps', '+30 ps'], a: 0, w: '1000 − 40 − 930 − 20 = +10 ps.' },
      { d: 'Hard', q: 'A shift register (Q directly to D) fails hold only when skew is large and positive because…', o: ['the data path is very short and the capture clock is late', 'the period is too short', 'jitter is too low', 'the logic is too slow'], a: 0, w: 'Minimal data delay vs late capture edge.' },
      { d: 'Hard', q: 'Equal clock latency of 600 ps to every flip-flop in a block gives an internal skew of…', o: ['600 ps', '0 ps', '1200 ps', '300 ps'], a: 1, w: 'Skew is a difference.' }
    ]
  });
})();
