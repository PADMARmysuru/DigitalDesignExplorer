/* Level 8 · Module 7 – VLSI Power Fundamentals */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  function fmtW(w) { return w >= 1 ? w.toFixed(2) + ' W' : w >= 1e-3 ? (w * 1e3).toFixed(1) + ' mW' : (w * 1e6).toFixed(1) + ' µW'; }

  /* ---------- Widget: αCV²f lab ---------- */
  function powerLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Power lab · P_dynamic ≈ α · C · V² · f</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var base = { a: 0.15, c: 1.0, v: 1.0, f: 1000, il: 20 }, p = JSON.parse(JSON.stringify(base)), touched = {};
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    L.slider(c1, 'α – switching activity (rising transitions per cycle)', 0.01, 1, 0.01, p.a, function (v) { return v.toFixed(2); }, function (v) { p.a = v; touched.a = 1; upd(); });
    L.slider(c1, 'C – total switched capacitance', 0.1, 3, 0.1, p.c, function (v) { return v.toFixed(1) + ' nF'; }, function (v) { p.c = v; touched.c = 1; upd(); });
    L.slider(c2, 'V – supply voltage', 0.5, 1.2, 0.05, p.v, function (v) { return v.toFixed(2) + ' V'; }, function (v) { p.v = v; touched.v = 1; upd(); });
    L.slider(c2, 'f – clock frequency', 100, 2000, 50, p.f, function (v) { return v + ' MHz'; }, function (v) { p.f = v; touched.f = 1; upd(); });
    L.slider(c2, 'Leakage current (whole chip)', 0, 100, 5, p.il, function (v) { return v + ' mA'; }, function (v) { p.il = v; upd(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    function calc(q) { var d = q.a * q.c * 1e-9 * q.v * q.v * q.f * 1e6, sc = 0.1 * d, lk = q.v * q.il * 1e-3; return { d: d, sc: sc, lk: lk, t: d + sc + lk }; }
    var b0 = calc(base);
    function upd() {
      if (touched.a && touched.c && touched.v && touched.f) api.done();
      var x = calc(p), mx = Math.max(x.t, b0.t) * 1.05, o = '', W = 600;
      var bar = function (y, lbl, val, col) { var w = 400 * val / mx; return T(10, y + 18, lbl, 't-ink t-b t-sm', 'start') + '<rect x="160" y="' + y + '" width="' + Math.max(2, w).toFixed(1) + '" height="26" rx="6" fill="' + col + '"/>' + T(168 + w, y + 18, fmtW(val), 't-ink t-b t-sm', 'start'); };
      o += bar(10, 'Dynamic (switching)', x.d, '#0071e3') + bar(46, 'Short-circuit (~10 %)', x.sc, '#af52de') + bar(82, 'Leakage (V·I_leak)', x.lk, '#ff9500') + bar(124, 'TOTAL', x.t, '#1d1d1f');
      o += P('M' + (160 + 400 * b0.t / mx) + ' 118V160', 'w-dash') + T(160 + 400 * b0.t / mx, 172, 'starting total', 't-dim t-sm');
      pic.innerHTML = S(W, 180, o, 'Power breakdown');
      var fv = (p.v / base.v), ff = p.f / base.f;
      out.innerHTML = '<span class="k">P_dyn</span> = ' + p.a.toFixed(2) + ' × ' + p.c.toFixed(1) + ' nF × ' + p.v.toFixed(2) + '² V² × ' + p.f + ' MHz = <span class="v">' + fmtW(x.d) + '</span>' +
        '<br><span class="k">Change vs start</span> total × ' + (x.t / b0.t).toFixed(2) + ' (voltage alone contributes × ' + (fv * fv).toFixed(2) + ' to dynamic power, frequency × ' + ff.toFixed(2) + ')' +
        '<br><span class="k">Energy per cycle (dynamic)</span> α·C·V² = ' + (p.a * p.c * p.v * p.v).toFixed(3) + ' nJ' +
        '<br><span class="k">Parameters changed</span> ' + ['a', 'c', 'v', 'f'].map(function (k) { return (touched[k] ? '✓ ' : '○ ') + { a: 'α', c: 'C', v: 'V', f: 'f' }[k]; }).join('  ');
    }
    upd();
  }

  /* ---------- Widget: switching activity ---------- */
  function activityLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Switching activity · count the rising transitions</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var bits = [0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0], N = 16;
    body.appendChild(L.h('p', 'l7-hint', 'Each square is the value of a node in one clock cycle. Tap squares to edit the waveform. Task: make the node\'s activity exactly <b>α = 0.25</b> (4 rising transitions in 16 cycles).'));
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var cells = [];
    for (var i = 0; i < N; i++) (function (i) { var b = L.h('button', 'l7-bit'); b.type = 'button'; b.addEventListener('click', function () { bits[i] ^= 1; upd(); }); cells.push(b); row.appendChild(b); })(i);
    var r2 = L.h('div', 'l7-row'); body.appendChild(r2);
    [['Clock (0101…)', function (k) { return k % 2; }], ['Never changes', function () { return 0; }], ['Random data', function () { return Math.random() < 0.5 ? 1 : 0; }]].forEach(function (x) {
      r2.appendChild(L.btn(x[0], 'ghost', function () { for (var k = 0; k < N; k++) bits[k] = x[1](k); upd(); }));
    });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-fb'); body.appendChild(out);
    function upd() {
      var rises = 0; for (var k = 1; k < N; k++) if (!bits[k - 1] && bits[k]) rises++;
      if (!bits[N - 1] && bits[0]) rises++; // periodic wrap
      var a = rises / N, o = '', X = function (k) { return 20 + k * 36; };
      cells.forEach(function (b, k) { b.textContent = bits[k]; b.classList.toggle('is-1', !!bits[k]); });
      var d = 'M' + X(0) + ' ' + (bits[0] ? 20 : 60);
      for (var k2 = 0; k2 < N; k2++) { var y = bits[k2] ? 20 : 60; d += 'V' + y + 'H' + X(k2 + 1); if (k2 > 0 && !bits[k2 - 1] && bits[k2]) o += '<path d="M' + X(k2) + ' 8l-5 8h10z" fill="#0071e3"/>'; }
      o += P(d, 'w-on');
      pic.innerHTML = S(620, 76, o, 'Node waveform');
      var ok = Math.abs(a - 0.25) < 1e-9;
      L.fb(out, ok ? 'ok' : 'info', 'Rising transitions: <b>' + rises + '</b> in ' + N + ' cycles → <b>α = ' + a.toFixed(3) + '</b>. ' + (ok ? '✓ Target reached. Each rising transition charges the node capacitance from the supply, costing C·V² of energy.' : 'A clock has α = 1 by this definition (it rises every cycle) – the most active node in the chip. Typical logic nodes have α ≈ 0.05–0.3.'));
      if (ok) api.done();
    }
    upd();
  }

  function energyFrame(k) {
    var o = '', q = [0, 0.5, 1, 1, 0.5, 0][k], charging = k <= 2;
    o += P('M60 24H200', 'w-cu') + T(130, 18, 'VDD', 't-cu t-b');
    o += R(100, 40, 60, 34, charging && k ? 'box-on' : 'box', 6) + T(130, 62, 'pMOS', 't-ink t-sm');
    o += R(100, 150, 60, 34, !charging && k < 5 ? 'box-on' : 'box', 6) + T(130, 172, 'nMOS', 't-ink t-sm');
    o += P('M130 24V40M130 74V150M130 184V206', 'w') + P('M110 206H150', 'w');
    o += P('M130 112H230', k > 0 && k < 5 ? 'w-on flow' : 'w') + P('M230 112V126M212 126H248M212 134H248M230 134V150M218 150H242', 'w-vio');
    o += R(300, 40, 30, 140, 'box', 4) + '<rect x="302" y="' + (178 - 136 * q) + '" width="26" height="' + (136 * q) + '" rx="3" fill="#0071e3" opacity=".6"/>' + T(315, 196, 'V_out', 't-dim t-sm');
    var txt = ['Output low. Capacitor empty.', 'Rising transition: the supply delivers charge Q = C·V through the pMOS.', 'Energy drawn from supply = Q·V = C·V². Half (½CV²) is stored in C, half is turned into heat in the pMOS.', 'Output high: ½CV² stored.', 'Falling transition: the nMOS discharges C to ground…', '…dissipating the stored ½CV² as heat. Total per 0→1→0 cycle: C·V². That is why P = α·C·V²·f.'][k];
    o += T(360, 100, '', 't-ink', 'start');
    return { t: txt, svg: S(520, 214, o, 'Energy per transition') };
  }

  L.module({
    n: 7,
    lead: 'Power limits phones, laptops and data centres alike. Find out where it goes – switching, short-circuit and leakage – and master the most important equation in low-power design: P ≈ α·C·V²·f.',
    tags: ['dynamic power', 'short-circuit power', 'leakage', 'static power', 'switching activity', 'αCV²f', 'power estimation'],
    sections: [
      {
        id: 'c-src', type: 'concept', title: 'Sources of power consumption', nav: 'Sources',
        html: '<p>Total power in a CMOS chip has two parts: <b>dynamic</b> power, consumed when signals switch, and <b>static</b> power, consumed even when nothing switches.</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Switching power</h4><p>Charging and discharging node capacitances. Usually the largest part in active circuits.</p></div><div class="l7-box vio"><h4>Short-circuit power</h4><p>During an input transition both pMOS and nMOS conduct briefly, letting current flow from VDD to GND. Typically 5–15 % of dynamic power; worse with slow input slews.</p></div><div class="l7-box cu"><h4>Leakage (static) power</h4><p>Small currents through transistors that are "off": subthreshold, gate-oxide and junction leakage. Grows strongly with temperature and at low threshold voltage.</p></div></div>' +
          '<div class="l7-eq">P_total = P_switching + P_short-circuit + P_leakage      P_dynamic ≈ α·C·V²·f      P_leakage = V·I_leak</div>'
      },
      {
        id: 'c-eq', type: 'concept', title: 'The dynamic power equation, parameter by parameter', nav: 'αCV²f',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>α – activity factor</h4><p>Average number of 0→1 transitions per clock cycle at a node. Clock nets: α = 1; typical logic: 0.05–0.3; idle logic: ≈ 0.</p></div>' +
          '<div class="l7-box cu"><h4>C – switched capacitance</h4><p>Gate, diffusion and wire capacitance of all nodes. Bigger designs, larger cells and long wires mean more C.</p></div>' +
          '<div class="l7-box vio"><h4>V – supply voltage</h4><p>Appears <b>squared</b>: 20 % lower V gives 36 % less dynamic power – the strongest knob, but lower V also slows gates.</p></div>' +
          '<div class="l7-box"><h4>f – clock frequency</h4><p>Linear: half the frequency, half the power – but the same energy per operation, because the task takes twice as long.</p></div></div>'
      },
      { id: 'w-pow', type: 'widget', title: 'Power lab: change α, C, V and f', nav: 'Power lab', intro: 'Change each of the four parameters and watch the effect on every power component. Which knob gives the biggest saving for the smallest change?', build: powerLab },
      {
        id: 'st-energy', type: 'steps', title: 'Animation: where the energy of a transition goes', nav: 'Energy animation',
        frames: [0, 1, 2, 3, 4, 5].map(function (k) { return energyFrame(k); })
      },
      { id: 'w-act', type: 'widget', title: 'Switching activity lab', nav: 'Activity lab', intro: 'Edit the waveform to reach α = 0.25. Try the presets to compare a clock, an idle node and random data.', build: activityLab },
      {
        id: 'c-dep', type: 'concept', title: 'Leakage, voltage and frequency dependence', nav: 'Dependence',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Change</th><th>Dynamic power</th><th>Leakage power</th><th>Speed</th></tr>' +
          '<tr><td>VDD ↓ 10 %</td><td>≈ −19 % (V²)</td><td>falls (V × lower I)</td><td>slower</td></tr>' +
          '<tr><td>f ↓ 50 %</td><td>−50 %</td><td>unchanged</td><td>half the throughput</td></tr>' +
          '<tr><td>Temperature ↑</td><td>~unchanged</td><td>rises steeply (exponential)</td><td>usually slower</td></tr>' +
          '<tr><td>Lower threshold V_t</td><td>~unchanged</td><td>rises steeply</td><td>faster</td></tr>' +
          '<tr><td>Less switching (α ↓)</td><td>proportional</td><td>unchanged</td><td>unchanged</td></tr></table></div>' +
          '<p>In advanced technologies leakage can be 20–50 % of total power, especially for chips that are idle much of the time.</p>'
      },
      {
        id: 'c-est', type: 'concept', title: 'Power estimation – first look', nav: 'Estimation',
        html: '<p>Early estimates multiply typical values: gate count × average capacitance per gate × α × V² × f, plus leakage per gate × gate count. Later, tools compute power from the netlist, the library\'s power tables and real switching activity (Module 9).</p>' +
          '<div class="l7-eq">Energy per operation = P / throughput      Energy = P × time</div>'
      },
      {
        id: 'rv-p', type: 'reveal', title: 'Click to reveal: power insights', nav: 'Reveal',
        items: [
          { q: 'Why does lowering frequency not save battery energy for a fixed task?', a: 'Dynamic energy per operation is α·C·V², independent of f. A slower clock takes proportionally longer, so energy is the same (and leakage energy even grows). Lowering V is what saves energy.' },
          { q: 'Why is the clock network so power-hungry?', a: 'It has α = 1 at every node and a large capacitance, so it often uses 20–40 % of dynamic power.' },
          { q: 'Why does leakage rise with temperature?', a: 'Subthreshold current depends exponentially on temperature via the thermal voltage, so a hot chip leaks much more – which heats it further.' },
          { q: 'Why does a slow input slew increase short-circuit power?', a: 'Both transistors stay partly on for longer while the input passes through the middle voltages.' },
          { q: 'What is a glitch, and why does it waste power?', a: 'A spurious transition caused by unequal path delays before the output settles. Each glitch charges and discharges capacitance for nothing.' },
          { q: 'Is static power zero when the clock is stopped?', a: 'No – leakage continues as long as the supply is on. Only removing power (power gating) eliminates it.' }
        ]
      },
      {
        id: 'dd-p', type: 'drag', title: 'Drag & drop: classify the power component', nav: 'Drag & drop',
        bins: ['Switching power', 'Short-circuit power', 'Leakage power'],
        items: [['Charging node capacitance', 0], ['Proportional to α·C·V²·f', 0], ['Increased by glitches', 0], ['Both transistors briefly on', 1], ['Worse with slow input transitions', 1], ['Flows even when nothing switches', 2], ['Rises steeply with temperature', 2], ['Larger in low-Vt transistors', 2]]
      },
      {
        id: 'calc7', type: 'calc', title: 'Power calculations', nav: 'Calculate',
        items: [
          { q: 'α = 0.1, C = 2 nF, V = 1 V, f = 500 MHz. Dynamic power (mW)?', a: 100, u: 'mW', h: 'α·C·V²·f.', s: '0.1 × 2×10⁻⁹ × 1 × 5×10⁸ = 0.1 W = <b>100 mW</b>.' },
          { q: 'If V is reduced from 1.0 V to 0.8 V (all else equal), dynamic power becomes what percentage of the original?', a: 64, u: '%', h: '(0.8/1.0)².', s: '0.8² = 0.64 → <b>64 %</b>.' },
          { q: 'A chip leaks 30 mA at 0.9 V. Leakage power (mW)?', a: 27, u: 'mW', h: 'P = V·I.', s: '0.9 × 30 mA = <b>27 mW</b>.' },
          { q: 'A node rises 6 times in 40 clock cycles. What is α?', a: 0.15, h: 'Rising transitions / cycles.', s: '6 / 40 = <b>0.15</b>.' },
          { q: 'A 100 fF node at 1 V switches 0→1→0 once. How much energy (fJ) is drawn from the supply?', a: 100, u: 'fJ', h: 'E = C·V² per full cycle.', s: '100 fF × 1² = <b>100 fJ</b>.' }
        ]
      },
      {
        id: 'mcq7', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'In P = αCV²f, α represents…', o: ['leakage', 'switching activity', 'capacitance', 'temperature'], a: 1, w: 'Transitions per cycle.' },
          { q: 'Halving VDD (if possible) reduces dynamic power to…', o: ['50 %', '25 %', '75 %', '12.5 %'], a: 1, w: 'V² → ¼.' },
          { q: 'Leakage power exists…', o: ['only when switching', 'whenever the supply is on', 'only at high frequency', 'only in pMOS'], a: 1, w: 'Static power.' },
          { q: 'Short-circuit power occurs when…', o: ['both pull-up and pull-down conduct briefly during a transition', 'the output is shorted', 'the clock stops', 'leakage is high'], a: 0, w: '' }
        ]
      },
      {
        id: 'short7', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain each term in P_dynamic ≈ αCV²f and say which is the most effective to reduce.', k: ['activity|α|alpha', 'capacitance', 'voltage|squared|v²', 'frequency'], m: 'α is the activity factor (rising transitions per cycle), C is the switched capacitance, V is the supply voltage and f is the clock frequency. Voltage is the most effective knob because power depends on V squared – but lowering V also slows the circuit.' },
          { q: 'Distinguish dynamic and static power and give one cause of each.', k: ['switch|charging', 'leak', 'static|off|idle', 'temperature|threshold'], m: 'Dynamic power is consumed when nodes switch – mainly charging and discharging capacitances, plus short-circuit current. Static power is consumed even without switching, mainly leakage through off transistors, which grows with temperature and with lower threshold voltages.' }
        ]
      },
      {
        id: 'scen7', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A smartwatch is idle 95 % of the time, but its battery still drains quickly.', q: 'Which power component is the most likely culprit?', o: [{ t: 'Leakage power during idle time', ok: true, w: 'When idle, switching stops but leakage continues – power gating and high-Vt cells help.' }, { t: 'Switching power of the clock', ok: false, w: 'If the clock is stopped in idle, its power is small.' }, { t: 'Short-circuit power', ok: false, w: 'That only occurs during transitions.' }] },
          { s: 'To halve power, a designer halves the clock frequency of a video decoder that must decode a fixed number of frames per second.', q: 'What is wrong with this plan?', o: [{ t: 'The decoder may no longer meet its throughput; and energy per frame is unchanged', ok: true, w: 'Frequency cuts power but not energy per operation, and throughput suffers.' }, { t: 'Power would double', ok: false, w: 'Dynamic power halves.' }, { t: 'Leakage would disappear', ok: false, w: 'Leakage does not depend on f.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'The dynamic power equation is…', o: ['P = I·R', 'P ≈ α·C·V²·f', 'P = V/R', 'P = C·f'], a: 1, w: '' },
      { d: 'Easy', q: 'Which parameter appears squared?', o: ['α', 'C', 'V', 'f'], a: 2, w: '' },
      { d: 'Easy', q: 'Leakage power is a form of…', o: ['dynamic power', 'static power', 'short-circuit power', 'clock power'], a: 1, w: '' },
      { d: 'Medium', q: 'α = 0.2, C = 1 nF, V = 0.9 V, f = 1 GHz. P_dyn ≈', o: ['162 mW', '180 mW', '200 mW', '81 mW'], a: 0, w: '0.2 × 1n × 0.81 × 1G = 0.162 W.' },
      { d: 'Medium', q: 'Doubling frequency and keeping V constant changes dynamic power by…', o: ['×0.5', '×2', '×4', 'none'], a: 1, w: 'Linear in f.' },
      { d: 'Medium', q: 'A clock net has α equal to…', o: ['0', '0.1', '0.5', '1'], a: 3, w: 'It rises every cycle.' },
      { d: 'Medium', q: 'Leakage of 50 mA at 1.0 V is…', o: ['5 mW', '50 mW', '500 mW', '0.5 mW'], a: 1, w: 'P = V·I.' },
      { d: 'Hard', q: 'V falls 1.0 → 0.9 V and f falls 1.0 → 0.8 GHz. Dynamic power becomes about…', o: ['72 %', '65 %', '81 %', '90 %'], a: 1, w: '0.81 × 0.8 = 0.648.' },
      { d: 'Hard', q: 'Energy per operation depends on…', o: ['f only', 'α·C·V²', 'leakage only', 'nothing'], a: 1, w: 'Dynamic energy is independent of f.' },
      { d: 'Hard', q: 'Why does leakage matter more in advanced nodes?', o: ['transistors have lower thresholds and thinner oxides', 'frequencies are lower', 'capacitance is larger', 'VDD is higher'], a: 0, w: '' }
    ]
  });
})();
