/* Level 8 · Module 9 – Power Analysis & Optimization */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var ROWS = [
    ['CPU core', 36, 28, 18], ['Clock network', 40, 54, 1], ['DSP accelerator', 30, 22, 6],
    ['SRAM macros', 12, 4, 24], ['I/O & PHY', 10, 9, 3], ['Interconnect / NoC', 6, 11, 1]
  ];

  /* ---------- Widget: simulated power report ---------- */
  function reportLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Power report · SoC at 800 MHz, 0.9 V, typical corner, vector-based activity</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var st = { blk: null, src: null, opt: null, tim: null };
    var tot = ROWS.reduce(function (a, r) { return a + r[1] + r[2] + r[3]; }, 0);
    var tb = L.h('div', 'l7-table-wrap'); body.appendChild(tb);
    var html = '<table class="l7-table" style="min-width:560px"><tr><th>Block</th><th>Internal (mW)</th><th>Switching (mW)</th><th>Leakage (mW)</th><th>Total (mW)</th><th>%</th></tr>';
    ROWS.forEach(function (r, i) { var t = r[1] + r[2] + r[3]; html += '<tr data-i="' + i + '" style="cursor:pointer" tabindex="0"><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td><td><b>' + t + '</b></td><td>' + Math.round(100 * t / tot) + ' %</td></tr>'; });
    html += '<tr><td>Total</td><td>' + ROWS.reduce(function (a, r) { return a + r[1]; }, 0) + '</td><td>' + ROWS.reduce(function (a, r) { return a + r[2]; }, 0) + '</td><td>' + ROWS.reduce(function (a, r) { return a + r[3]; }, 0) + '</td><td><b>' + tot + '</b></td><td>100 %</td></tr></table>';
    tb.innerHTML = html;
    body.appendChild(L.h('p', 'l7-hint', 'Internal = power inside cells (short-circuit + internal nodes); Switching = charging the nets between cells; Leakage = static.'));
    var q = L.h('div', ''); body.appendChild(q);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    L.$$('tr[data-i]', tb).forEach(function (tr) {
      function pick() {
        L.$$('tr[data-i]', tb).forEach(function (x) { x.style.background = ''; });
        tr.style.background = 'var(--l7-sig-dim)'; st.blk = +tr.getAttribute('data-i'); render();
      }
      tr.addEventListener('click', pick); tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') pick(); });
    });
    function opts(title, key, list, right) {
      var box = L.h('div', 'l7-q', '<p class="l7-q-t">' + title + '</p>'), o = L.h('div', 'l7-opts');
      list.forEach(function (t, i) {
        var b = L.h('button', 'l7-opt' + (st[key] === i ? (i === right ? ' is-right' : ' is-wrong') : ''), t); b.type = 'button';
        b.addEventListener('click', function () { st[key] = i; render(); }); o.appendChild(b);
      });
      box.appendChild(o); return box;
    }
    function render() {
      q.innerHTML = '';
      var stepOk = { blk: st.blk === 1 };
      var b1 = L.h('div', 'l7-q', '<p class="l7-q-t"><span class="l7-q-n">1</span>Tap the highest-power block in the table. ' + (st.blk === null ? '' : st.blk === 1 ? '<span style="color:var(--l7-ok)">✓ Clock network – 95 mW, 30 % of the total.</span>' : '<span style="color:var(--l7-bad)">✗ ' + ROWS[st.blk][0] + ' is not the largest total.</span>') + '</p>');
      q.appendChild(b1);
      if (!stepOk.blk) { L.fb(fb, 'info', 'Start by reading the Total column.'); return; }
      q.appendChild(opts('<span class="l7-q-n">2</span>What is the main source of the clock network\'s power?', 'src', ['Internal power', 'Switching power', 'Leakage power'], 1));
      if (st.src !== 1) { L.fb(fb, st.src === null ? 'info' : 'bad', st.src === null ? 'Compare its three columns.' : 'Look again: which column is largest for the clock network?'); return; }
      q.appendChild(opts('<span class="l7-q-n">3</span>Which optimisation targets it best?', 'opt', ['Clock gating of idle registers', 'Power-gate the SRAM macros', 'Swap all cells to low-Vt', 'Raise the clock frequency'], 0));
      if (st.opt !== 0) { L.fb(fb, st.opt === null ? 'info' : 'bad', st.opt === null ? 'The clock toggles every cycle (α = 1) and drives every register.' : st.opt === 1 ? 'Good idea for the SRAM\'s leakage (24 mW!) – but it does not touch the clock network.' : 'That would increase power.'); return; }
      q.appendChild(opts('<span class="l7-q-n">4</span>What is the likely timing impact of clock gating?', 'tim', ['Small: gating cells add a little clock insertion delay, and the enable signal must meet setup at the gating cell', 'Large: the critical path doubles', 'It fixes all setup violations', 'No timing checks are needed'], 0));
      if (st.tim !== 0) { L.fb(fb, st.tim === null ? 'info' : 'bad', st.tim === null ? 'Think about what the ICG cell adds to the clock and enable paths.' : 'Not quite – clock gating is low-risk for timing but not free.'); return; }
      L.fb(fb, 'ok', '✓ Analysis complete. Clock network: 95 mW, mostly switching → clock gating, small timing cost. Bonus observation: the SRAM macros are leakage-dominated (24 of 40 mW) – a candidate for power gating with retention, or high-Vt periphery.');
      api.done();
    }
    render();
  }

  /* ---------- Widget: energy-delay explorer ---------- */
  function edpLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Energy–delay explorer · sweep the supply voltage</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var v = 1.0, n = 0, Vt = 0.35;
    L.slider(body, 'Supply voltage', 0.5, 1.2, 0.02, v, function (x) { return x.toFixed(2) + ' V'; }, function (x) { v = x; n++; upd(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    function D(x) { return x / Math.pow(x - Vt, 1.5); }
    function E(x) { return x * x; }
    var D0 = D(1), E0 = E(1);
    function upd() {
      if (n >= 3) api.done();
      var o = '', X = function (x) { return 50 + (x - 0.5) / 0.7 * 500; }, Y = function (r) { return 200 - Math.min(r, 4) / 4 * 170; };
      o += P('M50 200H560M50 200V20', 'w');
      for (var t = 0.5; t <= 1.21; t += 0.1) o += T(X(t), 216, t.toFixed(1), 't-dim t-sm');
      o += T(305, 232, 'supply voltage (V)', 't-dim t-sm') + T(20, 110, 'relative', 't-dim t-sm');
      var dE = '', dD = '', dP = '', best = 9, bv = 1;
      for (var i = 0; i <= 70; i++) {
        var x = 0.5 + i * 0.01, e = E(x) / E0, d = D(x) / D0, p = e * d;
        if (p < best) { best = p; bv = x; }
        dE += (i ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(e).toFixed(1); dD += (i ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(d).toFixed(1); dP += (i ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(p).toFixed(1);
      }
      o += P(dE, 'w-cu') + P(dD, 'w-vio') + P(dP, 'w-on');
      o += T(555, Y(E(1.2) / E0) - 6, 'energy', 't-cu t-b t-sm', 'end') + T(70, 34, 'delay ↑', 't-vio t-b t-sm', 'start') + T(X(bv), Y(best) + 18, 'min EDP', 't-sig t-b t-sm');
      o += P('M' + X(v) + ' 20V200', 'w-dash') + L.dot(X(v), Y(E(v) / E0), 5, 'dot-cu') + L.dot(X(v), Y(D(v) / D0), 5, 'dot-vio') + L.dot(X(v), Y(E(v) * D(v) / (E0 * D0)), 5, 'dot-on');
      pic.innerHTML = S(600, 240, o, 'Energy, delay and EDP versus voltage');
      var e = E(v) / E0, d = D(v) / D0;
      out.innerHTML = '<span class="k">At ' + v.toFixed(2) + ' V (relative to 1.0 V)</span><br><span class="k">Energy per operation</span> <span class="c">× ' + e.toFixed(2) + '</span> (∝ V²)<br><span class="k">Delay</span> <span class="v">× ' + d.toFixed(2) + '</span><br><span class="k">Energy × delay (EDP)</span> × ' + (e * d).toFixed(2) + ' · minimum near ' + bv.toFixed(2) + ' V<br><span style="opacity:.7">Model: delay ∝ V/(V − V_t)^1.5 with V_t = 0.35 V; illustrative.</span>';
    }
    upd();
  }

  function flowFrame(k) {
    var o = '', vb = k <= 2;
    var boxes = vb ? [['Testbench / workload', 'box-vio'], ['Gate-level or RTL simulation', 'box'], ['Activity file (VCD / SAIF)', 'box-cu'], ['Power tool + netlist + libraries + parasitics', 'box-on'], ['Power report', 'box-ok']] : [['No vectors', 'box-vio'], ['Default toggle rate (e.g. 10–20 %) + clock activity', 'box-cu'], ['Probabilistic propagation through logic', 'box'], ['Power tool + netlist + libraries', 'box-on'], ['Power estimate', 'box-ok']];
    boxes.forEach(function (b, i) {
      var x = 10 + i * 118, on = vb ? i <= k + 2 : i <= k;
      o += R(x, 50, 108, 70, on ? b[1] : 'box', 10);
      var words = b[0].split(' '), l1 = '', l2 = '', l3 = '';
      words.forEach(function (w) { if ((l1 + w).length < 14 && !l2) l1 += w + ' '; else if ((l2 + w).length < 14 && !l3) l2 += w + ' '; else l3 += w + ' '; });
      o += T(x + 54, 72, l1.trim(), 't-ink t-b t-sm') + T(x + 54, 88, l2.trim(), 't-ink t-sm') + T(x + 54, 104, l3.trim(), 't-ink t-sm');
      if (i < 4) o += P('M' + (x + 108) + ' 85H' + (x + 118), 'w');
    });
    o += T(300, 26, vb ? 'Vector-based analysis' : 'Vectorless analysis', 't-vio t-b');
    o += T(300, 150, vb ? ['', '', 'Accurate for the workload simulated – but only as good as the vectors.'][k] || '' : ['', 'Fast and available early, with no testbench needed.', 'Less accurate: real activity can be very different (e.g. idle blocks, bursts).'][k - 3] || '', 't-dim t-sm');
    return S(600, 162, o, vb ? 'Vector-based power analysis flow' : 'Vectorless power analysis flow');
  }

  L.module({
    n: 9,
    lead: 'You cannot optimise what you have not measured. Learn how power is estimated – with and without simulation vectors – how to read a power report, find hotspots and peaks, and balance power against timing using energy and energy-delay.',
    tags: ['power estimation', 'activity-based', 'vector-based', 'vectorless', 'power reports', 'average & peak', 'hotspots', 'energy-delay'],
    sections: [
      {
        id: 'c-est', type: 'concept', title: 'Power estimation and activity', nav: 'Estimation',
        html: '<p>Power tools combine three ingredients: the <b>netlist</b> (what switches), the <b>library power models</b> (how much each cell consumes per transition and as leakage) and the <b>switching activity</b> of every net. Activity is the hardest part – it depends on what the chip is doing.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Activity-based</h4><p>Power computed from toggle rates (α) and static probabilities of nets – however they were obtained.</p></div><div class="l7-box cu"><h4>Vector-based</h4><p>Activity recorded from simulating real workloads (VCD/SAIF files). Accurate for those workloads; needs a testbench and time.</p></div><div class="l7-box vio"><h4>Vectorless</h4><p>Default toggle rates set on inputs and propagated statistically. Fast and early, but less accurate.</p></div></div>'
      },
      {
        id: 'st-flow', type: 'steps', title: 'Animation: vector-based vs vectorless flows', nav: 'Analysis flows',
        frames: [0, 1, 2, 3, 4, 5].map(function (k) { return { t: ['Vector-based: a testbench runs a realistic workload.', 'Simulation records how often each net toggles…', '…into an activity file, which the power tool combines with the netlist, libraries and parasitics.', 'Vectorless: no simulation – default activities are assumed.', 'They are propagated through the logic probabilistically.', 'The result is available early but may be far from real usage – vector-based analysis is used to confirm.'][k], svg: flowFrame(k) }; })
      },
      {
        id: 'c-rep', type: 'concept', title: 'Power reports: average, peak and hotspots', nav: 'Reports',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Average power</h4><p>Power averaged over a workload – determines battery life and thermal design.</p></div><div class="l7-box cu"><h4>Peak power</h4><p>The maximum over short intervals – determines supply-network design, current spikes and IR drop.</p></div><div class="l7-box vio"><h4>Hotspots</h4><p>Small areas with very high power density. They raise local temperature, which increases leakage and slows gates.</p></div><div class="l7-box"><h4>Report breakdown</h4><p>Reports split power by hierarchy (block), by type (internal, switching, leakage) and by group (clock, registers, combinational, memory, I/O).</p></div></div>'
      },
      { id: 'w-rep', type: 'widget', title: 'Read the power report', nav: 'Report lab', intro: 'Answer the four questions in order: highest-power block, main source, best optimisation, and timing impact.', build: reportLab },
      {
        id: 'c-en', type: 'concept', title: 'Energy, energy-delay and the timing–power trade-off', nav: 'Energy',
        html: '<div class="l7-eq">Energy = Power × time      Energy per operation ∝ C·V²      EDP = Energy × Delay</div>' +
          '<p>Power alone can mislead: a slow design may use less power but more energy to finish a task. Battery-powered devices care about <b>energy</b>; high-performance designs often optimise the <b>energy-delay product</b> (EDP), which rewards being both fast and efficient.</p>' +
          '<div class="l7-grid2"><div class="l7-box"><h4>Timing → power</h4><p>Extra slack can be traded for power: lower voltage, high-Vt cells, smaller gates.</p></div><div class="l7-box"><h4>Power → timing</h4><p>More power (higher V, low-Vt, larger cells) buys speed when timing is short.</p></div></div>'
      },
      { id: 'w-edp', type: 'widget', title: 'Energy–delay explorer', nav: 'EDP lab', intro: 'Move the voltage across its range (at least three moves). Where is energy lowest? Where is EDP lowest?', build: edpLab },
      {
        id: 'c-opt', type: 'concept', title: 'Power optimisation workflow', nav: 'Optimisation',
        html: '<div class="l7-grid3"><div class="l7-box sig"><h4>1 · Measure</h4><p>Run power analysis with realistic activity; check average and peak.</p></div><div class="l7-box cu"><h4>2 · Locate</h4><p>Find the largest blocks and the dominant component (switching, internal, leakage).</p></div><div class="l7-box vio"><h4>3 · Apply &amp; re-check</h4><p>Choose the matching technique (Module 8), then re-run both power and timing analysis.</p></div></div>'
      },
      {
        id: 'rv-pa', type: 'reveal', title: 'Click to reveal: power analysis insights', nav: 'Reveal',
        items: [
          { q: 'Why can vectorless analysis overestimate power?', a: 'It may assume every block toggles at the default rate, while in reality many blocks are idle or clock-gated much of the time.' },
          { q: 'Why does peak power matter if average power is fine?', a: 'Short current bursts cause voltage droop (IR drop) on the supply network, which can slow gates and cause timing failures.' },
          { q: 'What is internal power in a report?', a: 'Power dissipated inside cells – short-circuit current and charging of internal nodes – as opposed to switching power on the nets between cells.' },
          { q: 'Why are hotspots dangerous?', a: 'Higher local temperature raises leakage exponentially and slows transistors, and can accelerate ageing.' },
          { q: 'Why re-run timing after power optimisation?', a: 'Techniques such as high-Vt swaps, voltage scaling or gating cells change delays and can create violations.' },
          { q: 'What is a SAIF file?', a: 'Switching Activity Interchange Format – a compact summary of toggle counts and signal probabilities from simulation, used by power tools.' }
        ]
      },
      {
        id: 'dd-pa', type: 'drag', title: 'Drag & drop: analysis approach', nav: 'Drag & drop',
        bins: ['Vector-based', 'Vectorless', 'Both'],
        items: [['Needs a testbench and simulation', 0], ['Uses VCD or SAIF activity files', 0], ['Accurate for a specific workload', 0], ['Default toggle rates on inputs', 1], ['Available before simulations exist', 1], ['Uses library power models', 2], ['Reports internal, switching and leakage power', 2]]
      },
      {
        id: 'calc9', type: 'calc', title: 'Power analysis calculations', nav: 'Calculate',
        items: [
          { q: 'A task runs for 4 ms at an average of 250 mW. How much energy does it use (mJ)?', a: 1, u: 'mJ', h: 'E = P × t.', s: '0.25 W × 0.004 s = 0.001 J = <b>1 mJ</b>.' },
          { q: 'Design A: 100 mW for 10 ms. Design B: 150 mW for 6 ms. How much energy (mJ) does the more energy-efficient design use?', a: 0.9, u: 'mJ', h: 'Compute both energies.', s: 'A = 1.0 mJ, B = 0.9 mJ → <b>B, 0.9 mJ</b> – higher power but less energy.' },
          { q: 'For the designs above, what is the energy-delay product of design B (mJ·ms)?', a: 5.4, u: 'mJ·ms', h: 'EDP = E × delay.', s: '0.9 mJ × 6 ms = <b>5.4 mJ·ms</b> (A: 10 mJ·ms).' },
          { q: 'Power samples over five intervals: 120, 180, 90, 300, 110 mW. What is the average power (mW)?', a: 160, u: 'mW', h: 'Sum ÷ 5.', s: '800 / 5 = <b>160 mW</b> (peak = 300 mW).' },
          { q: 'In the power report lab, what percentage of total power is leakage? (round to the nearest whole %)', a: 17, u: '%', tol: 0.04, h: 'Leakage total ÷ grand total.', s: '53 / 315 ≈ <b>17 %</b>.' }
        ]
      },
      {
        id: 'mcq9', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Vector-based power analysis uses…', o: ['default toggle rates', 'activity from simulating real workloads', 'only leakage values', 'no netlist'], a: 1, w: '' },
          { q: 'Peak power mainly affects…', o: ['battery life only', 'supply network design and IR drop', 'logic function', 'area only'], a: 1, w: '' },
          { q: 'A block whose power is mostly leakage is best treated with…', o: ['clock gating', 'power gating / high-Vt', 'higher frequency', 'more buffers'], a: 1, w: '' },
          { q: 'EDP stands for…', o: ['Energy-Delay Product', 'Electrical Design Process', 'Error Detection Parity', 'Effective Dynamic Power'], a: 0, w: '' }
        ]
      },
      {
        id: 'short9', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Compare vector-based and vectorless power analysis.', k: ['simulation|testbench|vcd|saif', 'default|probabil|statistic', 'accura', 'early|fast'], m: 'Vector-based analysis takes switching activity from simulating real workloads (VCD/SAIF), so it is accurate for those workloads but needs testbenches and simulation time. Vectorless analysis assumes default toggle rates and propagates them probabilistically; it is fast and available early but can be inaccurate because real activity differs.' },
          { q: 'Why can a design with higher power consume less energy for a task?', k: ['energy|power × time', 'faster|shorter|time', 'idle|finish', 'delay'], m: 'Energy is power multiplied by time. A faster design may draw more power but finish the task in much less time, so its total energy can be lower – especially if it can then go idle or be power-gated.' }
        ]
      },
      {
        id: 'scen9', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A vectorless estimate says 2.1 W; vector-based analysis of real use cases says 0.9 W.', q: 'What is the most likely reason?', o: [{ t: 'Default toggle rates overestimate activity; many blocks are idle or clock-gated in real use', ok: true, w: 'Vectorless analysis is conservative and generic.' }, { t: 'The vector-based run is wrong', ok: false, w: 'Real workloads usually give lower activity.' }, { t: 'Leakage doubled', ok: false, w: 'Leakage is not affected by vectors.' }] },
          { s: 'A power map shows one corner of the die at 3× the average power density.', q: 'What is the main concern and response?', o: [{ t: 'A thermal hotspot – spread the activity, add gating, and check timing and leakage at the higher local temperature', ok: true, w: 'Hotspots raise leakage and slow gates locally.' }, { t: 'Nothing – only average power matters', ok: false, w: 'Local temperature matters for reliability and timing.' }, { t: 'Lower the clock frequency of the whole chip permanently', ok: false, w: 'A local issue needs a local fix first.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Energy is…', o: ['power × time', 'power / time', 'voltage × current', 'capacitance × frequency'], a: 0, w: '' },
      { d: 'Easy', q: 'Vectorless power analysis needs…', o: ['simulation vectors', 'default activity assumptions', 'a lab measurement', 'no netlist'], a: 1, w: '' },
      { d: 'Easy', q: 'A power hotspot is…', o: ['an area of very high power density', 'a test point', 'a clock buffer', 'a timing path'], a: 0, w: '' },
      { d: 'Medium', q: '200 mW for 5 ms uses…', o: ['1 mJ', '40 mJ', '0.1 mJ', '10 mJ'], a: 0, w: '0.2 × 0.005 = 1 mJ.' },
      { d: 'Medium', q: 'In a report, a block shows internal 10, switching 6, leakage 30 mW. Main source:', o: ['internal', 'switching', 'leakage', 'clock'], a: 2, w: '' },
      { d: 'Medium', q: 'For that block, the best technique is…', o: ['clock gating', 'power gating / high-Vt', 'more buffers', 'higher VDD'], a: 1, w: '' },
      { d: 'Medium', q: 'Peak power is important for…', o: ['IR drop and supply design', 'logic correctness only', 'area', 'test coverage'], a: 0, w: '' },
      { d: 'Hard', q: 'A: 80 mW for 10 ms; B: 120 mW for 5 ms. Lower energy and lower EDP:', o: ['A for both', 'B for both', 'A energy, B EDP', 'B energy, A EDP'], a: 1, w: 'A: 0.8 mJ, 8 mJ·ms. B: 0.6 mJ, 3 mJ·ms.' },
      { d: 'Hard', q: 'Lowering V from 1.0 to 0.7 V reduces energy per operation to about…', o: ['70 %', '49 %', '34 %', '100 %'], a: 1, w: 'V² = 0.49.' },
      { d: 'Hard', q: 'After swapping cells to high-Vt to cut leakage, you must re-run…', o: ['only power analysis', 'timing analysis as well', 'nothing', 'only DRC'], a: 1, w: 'High-Vt cells are slower.' }
    ]
  });
})();
