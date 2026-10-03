/* Level 9 · Module 9 – RTL Optimization */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var BASE = { area: 100, delay: 6.2, power: 100, lat: 1 };
  var OPTS = [
    { k: 'share', n: 'Share resources', d: 'One multiplier with operand muxes instead of two multipliers.', da: -35, dd: 0.4, dp: -15, dl: 0,
      why: 'The two products are never needed in the same cycle, so one multiplier is enough. Big area and power saving – the operand muxes add a little delay.' },
    { k: 'dup', n: 'Duplicate hardware', d: 'Duplicate the high fan-out sel register (one copy per 32 mux bits).', da: 2, dd: -0.5, dp: 1, dl: 0,
      why: 'Each copy drives half the load, so the select arrives sooner. Small area cost for speed – the opposite of sharing.' },
    { k: 'restr', n: 'Restructure logic', d: 'Add c once AFTER the mux instead of in both branches.', da: -8, dd: -0.3, dp: -5, dl: 0,
      why: 'sel ? (p + c) : (q + c) = (sel ? p : q) + c – one adder instead of two, and the late input c passes less logic.' },
    { k: 'pipe', n: 'Add pipeline stage', d: 'Register the product before the final adder.', da: 12, dd: -2.6, dp: 8, dl: 1,
      why: 'Splits the long multiply-add path into two stages: much higher clock frequency, but +1 cycle latency and more flip-flops.' },
    { k: 'simp', n: 'Simplify expression', d: 'Coefficient k is the constant 8: replace k * x by x << 3.', da: -6, dd: -0.4, dp: -4, dl: 0,
      why: 'Multiplying by a power-of-two constant is just wiring (a shift). Constant propagation removes a whole multiplier.' }
  ];

  /* ---------- Widget: optimisation trade-off lab ---------- */
  function optLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>RTL optimisation lab · reach 200 MHz (≤ 5.0 ns) with the smallest area</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    body.appendChild(L.h('div', '', L.code('// starting RTL (16-bit data)\nalways_ff @(posedge clk)\n  y <= sel ? (a * b + c) : (a * d + c) + k * e;   // k = 8 (parameter)')));
    var on = {}, btns = {}, tried = {};
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    OPTS.forEach(function (o) {
      var b = L.btn('<span style="font-weight:700">' + o.n + '</span><span style="font-weight:500;font-size:.85em">' + o.d + '</span>', '', function () { on[o.k] = !on[o.k]; tried[o.k] = 1; upd(o); });
      b.style.textAlign = 'left'; b.style.borderRadius = '16px'; b.style.padding = '12px 16px'; b.style.flexDirection = 'column'; b.style.alignItems = 'flex-start'; b.style.gap = '2px';
      btns[o.k] = b; g.appendChild(b);
    });
    var tbl = L.h('div', 'l7-table-wrap'); body.appendChild(tbl);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    var why = L.h('div', 'l7-fb'); body.appendChild(why);
    function upd(last) {
      var r = { area: BASE.area, delay: BASE.delay, power: BASE.power, lat: BASE.lat };
      OPTS.forEach(function (o) { btns[o.k].classList.toggle('is-on', !!on[o.k]); if (on[o.k]) { r.area += o.da; r.delay += o.dd; r.power += o.dp; r.lat += o.dl; } });
      var c = function (v, b, lower, f) { return '<td class="' + (Math.abs(v - b) < 1e-9 ? '' : (lower ? v < b : v > b) ? 'better' : 'worse') + '">' + f(v) + '</td>'; };
      var pc = function (v) { return Math.round(v) + ' %'; }, ns = function (v) { return v.toFixed(1) + ' ns'; }, mhz = function (v) { return Math.round(1000 / v) + ' MHz'; }, cy = function (v) { return v + ' cycle' + (v > 1 ? 's' : ''); };
      tbl.innerHTML = '<table class="l7-cmp"><tr><th>Estimate</th><th>Before</th><th>After</th></tr>' +
        '<tr><td>Area</td><td>100 %</td>' + c(r.area, 100, true, pc) + '</tr>' +
        '<tr><td>Critical path</td><td>6.2 ns</td>' + c(r.delay, 6.2, true, ns) + '</tr>' +
        '<tr><td>Max frequency</td><td>' + mhz(6.2) + '</td>' + c(1000 / r.delay, 1000 / 6.2, false, function (v) { return Math.round(v) + ' MHz'; }) + '</tr>' +
        '<tr><td>Power estimate</td><td>100 %</td>' + c(r.power, 100, true, pc) + '</tr>' +
        '<tr><td>Latency</td><td>1 cycle</td>' + c(r.lat, 1, true, cy) + '</tr></table>';
      var ok = r.delay <= 5.0 + 1e-9, n = Object.keys(tried).length;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : 'bad');
      verdict.innerHTML = ok ? '✅ 200 MHz met · area ' + Math.round(r.area) + ' %' + (r.lat > 1 ? ' · latency ' + r.lat + ' cycles' : '') + '<small>' + (Math.round(r.area) === 63 ? 'This is the smallest area that meets 200 MHz – it uses a pipeline stage. If the latency must stay 1 cycle, the best you can do is 88 % (no sharing, no pipeline).' : Math.round(r.area) === 88 && r.lat === 1 ? 'Best solution if latency must stay 1 cycle. With one extra cycle of latency you can get far smaller – try it.' : 'Can you meet the same frequency with less area?') + '</small>' :
        '❌ ' + r.delay.toFixed(1) + ' ns – not fast enough<small>Combine options. Watch how sharing saves area but costs time, and pipelining buys time with flip-flops and latency.</small>';
      if (ok && n >= 3) api.done();
      if (last) L.fb(why, 'info', '<b>' + last.n + (on[last.k] ? ' applied' : ' removed') + ':</b> ' + last.why + (ok && n < 3 ? '<br>Try at least three different options to complete the lab.' : ''));
    }
    upd();
  }

  /* ---------- Widget: CSE, constant propagation, strength reduction ---------- */
  function exprLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Expression optimisations · apply them and count the hardware</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var f = { cse: false, cp: false, sr: false };
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var defs = [['cse', 'Common subexpression elimination'], ['cp', 'Constant propagation (MASK = 0)'], ['sr', 'Strength reduction (× 8 → << 3)']], btn = {};
    defs.forEach(function (d) { btn[d[0]] = L.btn(d[1], '', function () { f[d[0]] = !f[d[0]]; upd(); }); row.appendChild(btn[d[0]]); });
    var code = L.h('div', ''); body.appendChild(code);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function upd() {
      defs.forEach(function (d) { btn[d[0]].classList.toggle('is-on', f[d[0]]); });
      var src = 'localparam logic [7:0] MASK = 8\'h00;\n' + (f.cse ? 'assign t  = a + b;                 // computed once\nassign y1 = t * c;\nassign y2 = t * d;\n' : 'assign y1 = (a + b) * c;\nassign y2 = (a + b) * d;\n') +
        (f.cp ? 'assign z  = 8\'h00;                 // x & 0 is always 0\n' : 'assign z  = x & MASK;\n') + (f.sr ? 'assign w  = {v, 3\'b000};            // v << 3: wiring only\n' : 'assign w  = v * 8;\n');
      code.innerHTML = L.code(src);
      var add = f.cse ? 1 : 2, mul = 2 + (f.sr ? 0 : 1), and = f.cp ? 0 : 8;
      var area = add * 8 + mul * 64 + and * 1.3;
      out.innerHTML = '<span class="k">8-bit adders</span> ' + add + ' · <span class="k">multipliers</span> ' + mul + ' · <span class="k">AND gates</span> ' + and + '<br><span class="k">Estimated area</span> <span class="v">' + area.toFixed(0) + ' units</span> (start 218)';
      if (f.cse && f.cp && f.sr) { L.fb(fb, 'ok', '🎉 All three applied: area 136 instead of 218. Synthesis tools perform these automatically on simple expressions – but writing RTL this way keeps intent clear and helps when the expressions are spread across modules or registers, where tools cannot see them.'); api.done(); }
      else L.fb(fb, 'info', 'Apply all three optimisations.');
    }
    upd();
  }

  function shareFrame(k) {
    var o = '';
    if (k === 0) {
      o += T(300, 20, 'Before: two multipliers, one result used', 't-vio t-b');
      o += R(60, 40, 120, 50, 'box-on', 8) + T(120, 70, 'a × b', 't-ink t-b') + R(60, 110, 120, 50, 'box-on', 8) + T(120, 140, 'a × d', 't-ink t-b');
      o += P('M180 65H260V90M180 135H260V120', 'w') + R(260, 80, 60, 50, 'box', 8) + T(290, 110, 'MUX', 't-ink t-sm') + P('M320 105H380', 'w-on') + T(390, 110, 'y', 't-ink t-b', 'start');
    } else {
      o += T(300, 20, 'After: muxes on the operands, one multiplier', 't-vio t-b');
      o += R(60, 60, 60, 50, 'box', 8) + T(90, 90, 'MUX', 't-ink t-sm') + T(30, 70, 'b', 't-ink t-sm', 'start') + T(30, 104, 'd', 't-ink t-sm', 'start');
      o += P('M120 85H180', 'w') + T(150, 45, 'a', 't-ink t-sm') + P('M150 50V70H180', 'w') + R(180, 50, 120, 60, 'box-on', 8) + T(240, 85, '×', 't-ink t-b') + P('M300 80H360', 'w-on') + T(370, 85, 'y', 't-ink t-b', 'start');
      o += T(300, 150, 'Valid only because a×b and a×d are never needed in the same cycle', 't-dim t-sm');
    }
    return S(600, 166, o, 'Resource sharing');
  }

  L.module({
    n: 9,
    lead: 'RTL decides most of a design\'s area, speed and power before synthesis even starts. Learn the optimisations RTL engineers apply – sharing, restructuring, constant propagation, CSE, register optimisation, pipelining and parallelism – and the trade-offs between them.',
    tags: ['restructuring', 'resource sharing', 'constant propagation', 'CSE', 'logic simplification', 'register optimisation', 'pipelining', 'parallelism', 'area vs performance'],
    sections: [
      {
        id: 'c-tradeoff', type: 'concept', title: 'The area / performance / power triangle', nav: 'Trade-offs',
        html: '<p>Every RTL optimisation moves the design inside a triangle: <b>area</b>, <b>performance</b> (clock frequency, throughput, latency) and <b>power</b>. Improving one usually costs another.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Save area</h4><p>resource sharing, simplification, fewer registers</p></div><div class="l7-box cu"><h4>Gain speed</h4><p>pipelining, duplication, parallelism, restructuring</p></div><div class="l7-box vio"><h4>Save power</h4><p>less hardware switching, fewer redundant operations (Level 8 covers circuit-level power techniques)</p></div></div>'
      },
      {
        id: 'st-share', type: 'steps', title: 'Animation: resource sharing', nav: 'Sharing',
        frames: [0, 1].map(function (k) { return { t: ['Two multipliers compute a×b and a×d, but the mux keeps only one result each cycle – half the hardware is wasted.', 'Move the mux to the operand: one multiplier computes whichever product is needed. Area falls by almost half; the mux now sits before the multiplier and adds a little delay.'][k], svg: shareFrame(k) }; })
      },
      {
        id: 'c-tech', type: 'concept', title: 'RTL optimisation techniques', nav: 'Techniques',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Technique</th><th>Idea</th><th>Effect</th></tr>' +
          '<tr><td>Resource sharing</td><td>one operator serves mutually exclusive operations</td><td>− area, + mux delay</td></tr>' +
          '<tr><td>Constant propagation</td><td>replace logic that depends on constants by its value</td><td>− area, − delay</td></tr>' +
          '<tr><td>Common subexpression elimination</td><td>compute a repeated expression once</td><td>− area</td></tr>' +
          '<tr><td>Strength reduction</td><td>× 2ⁿ → shift, x × 3 → (x &lt;&lt; 1) + x</td><td>− area, − delay</td></tr>' +
          '<tr><td>Logic restructuring</td><td>re-order operations so late inputs pass fewer levels</td><td>− delay</td></tr>' +
          '<tr><td>Register optimisation</td><td>remove duplicate or constant registers; retiming moves registers across logic</td><td>− area / − delay</td></tr>' +
          '<tr><td>Duplication</td><td>copy high-fan-out logic or registers</td><td>+ area, − delay</td></tr>' +
          '<tr><td>Pipelining</td><td>insert registers into long paths</td><td>− delay, + latency, + area</td></tr>' +
          '<tr><td>Parallelism</td><td>several units work at once (unrolling)</td><td>+ throughput, + area</td></tr></table></div>'
      },
      { id: 'w-opt', type: 'widget', title: 'RTL optimisation lab: area / timing / power', nav: 'Optimisation lab', intro: 'Apply options alone and in combination (try at least three). Find the smallest design that runs at 200 MHz.', build: optLab },
      { id: 'w-expr', type: 'widget', title: 'Expression optimisations', nav: 'Expression lab', intro: 'Apply common subexpression elimination, constant propagation and strength reduction. Watch the hardware count fall.', build: exprLab },
      {
        id: 'c-par', type: 'concept', title: 'Pipelining and parallelism concepts', nav: 'Pipelining & parallelism',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Pipelining</h4><p>Same hardware, cut into stages: higher clock frequency and throughput, more latency and flip-flops.</p><div class="l7-eq">throughput = 1 result / cycle</div></div>' +
          '<div class="l7-box cu"><h4>Parallelism</h4><p>Multiple copies of hardware: N results per cycle at the same clock, N × the area.</p><div class="l7-eq">throughput = N results / cycle</div></div></div>' +
          '<p style="margin-top:12px">The reverse of parallelism – <b>folding / serialisation</b> – processes data over several cycles with one unit to save area when throughput allows.</p>'
      },
      {
        id: 'rv-9', type: 'reveal', title: 'Click to reveal: optimisation insights', nav: 'Reveal',
        items: [
          { q: 'Why can resource sharing hurt timing?', a: 'The mux moves in front of the shared operator, adding delay to the path, and the select logic may become critical.' },
          { q: 'Does synthesis do CSE and constant propagation automatically?', a: 'Within visible logic, yes. Across module boundaries, registers or complex expressions, the RTL designer often has to do it.' },
          { q: 'What is retiming?', a: 'Moving registers across combinational logic (without changing function) to balance stage delays.' },
          { q: 'Why duplicate a register?', a: 'To split a large fan-out so each copy drives fewer loads and the signal arrives sooner.' },
          { q: 'When is serialising better than parallelism?', a: 'When the required throughput is low: one small unit used many times saves area and power.' },
          { q: 'Why must optimisations be checked by simulation?', a: 'RTL changes like sharing or pipelining change timing behaviour (latency, mux control) and can introduce bugs.' }
        ]
      },
      {
        id: 'dd-9', type: 'drag', title: 'Drag & drop: which goal does it serve?', nav: 'Drag & drop',
        bins: ['Saves area', 'Improves timing / throughput', 'Both'],
        items: [['Share one multiplier between two exclusive operations', 0], ['Serialise: one adder used over 4 cycles', 0], ['Add a pipeline register', 1], ['Duplicate a high fan-out register', 1], ['Unroll for 4 results per cycle', 1], ['x × 8 → x << 3', 2], ['Constant propagation', 2]]
      },
      {
        id: 'calc9', type: 'calc', title: 'Trade-off calculations', nav: 'Calculate',
        items: [
          { q: 'A 16-bit multiplier is 60 % of a block\'s area. Sharing removes one of two identical multipliers. By what percentage does the block area fall (ignore the extra muxes)?', a: 30, h: 'Each multiplier is 30 %.', s: '<b>30 %</b>.' },
          { q: 'A 6.2 ns path is split by a pipeline register into 3.4 ns and 3.0 ns, plus 0.2 ns register overhead per stage. New fmax (MHz)?', a: 277.8, tol: 0.01, h: 'Period = 3.4 + 0.2.', s: '1 / 3.6 ns = <b>277.8 MHz</b>.' },
          { q: 'x × 3 is implemented as (x << 1) + x. How many adders replace the multiplier?', a: 1, h: 'One addition.', s: '<b>1</b> adder.' },
          { q: 'A design processes 1 sample per cycle at 200 MHz. With 4 parallel units at the same clock, how many million samples per second?', a: 800, h: '4 × 200.', s: '<b>800</b> Msamples/s.' },
          { q: 'In the expression lab, how many area units do all three optimisations save?', a: 82, h: '218 − 136.', s: '<b>82</b> units.' }
        ]
      },
      {
        id: 'mcq9', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Resource sharing is possible when…', o: ['operations are never needed in the same cycle', 'operations always run together', 'the clock is fast', 'there are latches'], a: 0, w: '' },
          { q: 'Pipelining trades…', o: ['latency and area for frequency', 'frequency for area', 'power for latches', 'nothing'], a: 0, w: '' },
          { q: 'Constant propagation…', o: ['replaces logic with its constant result', 'adds registers', 'duplicates hardware', 'adds latency'], a: 0, w: '' },
          { q: 'Duplicating a high fan-out register mainly improves…', o: ['area', 'timing', 'latency', 'test coverage'], a: 1, w: '' }
        ]
      },
      {
        id: 'short9', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain resource sharing and its cost, with an example.', k: ['share|one operator|single', 'exclusive|same cycle|never together', 'mux', 'area|delay'], m: 'Resource sharing uses a single operator for operations that are never needed in the same cycle, for example y = sel ? a*b : a*d implemented with one multiplier whose second operand is selected by a mux. It saves area (and often power) but adds the mux delay in front of the operator and makes the select logic part of the path.' },
          { q: 'Compare pipelining and parallelism for increasing throughput.', k: ['register|stage', 'latency', 'copies|replicat|duplicat', 'area|throughput'], m: 'Pipelining splits a path into stages with registers: the clock frequency and throughput rise for modest extra area (flip-flops), but latency increases. Parallelism replicates whole units so several results are produced per cycle at the same clock, multiplying area roughly by the number of copies. Pipelining is cheaper when the clock can be raised; parallelism when it cannot.' }
        ]
      },
      {
        id: 'scen9', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A block is 25 % over its area budget but has 1.5 ns of positive slack at the target clock.', q: 'Best first step?', o: [{ t: 'Share resources / serialise where operations are exclusive or throughput allows', ok: true, w: 'Use the spare timing to recover area.' }, { t: 'Add pipeline stages', ok: false, w: 'Adds area.' }, { t: 'Duplicate registers', ok: false, w: 'Adds area.' }] },
          { s: 'A filter must accept a new sample every cycle at 500 MHz, but its multiply-accumulate path is 3.4 ns.', q: 'Which optimisation fits?', o: [{ t: 'Pipeline the multiply-accumulate path (accepting extra latency)', ok: true, w: 'Throughput stays one sample per cycle at 2 ns per stage.' }, { t: 'Share the multiplier between taps', ok: false, w: 'That reduces throughput.' }, { t: 'Lower the clock to 250 MHz', ok: false, w: 'Fails the requirement.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Which optimisation mainly saves area?', o: ['resource sharing', 'pipelining', 'duplication', 'parallelism'], a: 0, w: '' },
      { d: 'Easy', q: 'x × 16 can be implemented as…', o: ['x << 4', 'x >> 4', 'x + 16', 'a latch'], a: 0, w: '' },
      { d: 'Easy', q: 'Pipelining increases…', o: ['latency', 'nothing', 'only power', 'combinational depth'], a: 0, w: '' },
      { d: 'Medium', q: 'y1 = (a+b)*c; y2 = (a+b)*d; after CSE needs…', o: ['2 adders', '1 adder', '0 adders', '3 adders'], a: 1, w: '' },
      { d: 'Medium', q: 'z = x & 8\'h00 after constant propagation is…', o: ['x', '0', 'an AND gate array', 'a latch'], a: 1, w: '' },
      { d: 'Medium', q: 'Sharing a multiplier adds delay because…', o: ['a mux is inserted before it', 'multipliers get slower when shared', 'registers are added', 'the clock changes'], a: 0, w: '' },
      { d: 'Medium', q: 'Splitting a 6 ns path into two 3 ns stages (no overhead) changes fmax from…', o: ['167 to 333 MHz', '333 to 167 MHz', '100 to 200 MHz', 'no change'], a: 0, w: '' },
      { d: 'Hard', q: 'sel ? (p + c) : (q + c) restructured as (sel ? p : q) + c saves…', o: ['one adder', 'one mux', 'one register', 'nothing'], a: 0, w: '' },
      { d: 'Hard', q: '4 parallel units at 250 MHz give a throughput of…', o: ['250 M/s', '1000 M/s', '62.5 M/s', '4 M/s'], a: 1, w: '' },
      { d: 'Hard', q: 'Retiming means…', o: ['moving registers across logic without changing function', 'changing the clock', 'removing the reset', 'duplicating the design'], a: 0, w: '' }
    ]
  });
})();
