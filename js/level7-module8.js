/* Level 7 · Module 8 – VLSI Design for Reliability */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* ---------- Widget: PVT corners (illustrative model) ---------- */
  function pvtLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>PVT corner explorer · illustrative model</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = 'TT', v = '1.0', t = '25', seen = {};
    var g = L.h('div', 'l7-grid3'); body.appendChild(g);
    L.select(g, 'Process', [['SS', 'SS – slow nMOS, slow pMOS'], ['TT', 'TT – typical'], ['FF', 'FF – fast nMOS, fast pMOS']], p, function (x) { p = x; upd(); });
    L.select(g, 'Voltage', [['0.9', '0.9 V (−10 %)'], ['1.0', '1.0 V nominal'], ['1.1', '1.1 V (+10 %)']], v, function (x) { v = x; upd(); });
    L.select(g, 'Temperature', [['-40', '−40 °C'], ['25', '25 °C'], ['125', '125 °C']], t, function (x) { t = x; upd(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var PD = { SS: 1.15, TT: 1, FF: 0.87 }, VD = { '0.9': 1.13, '1.0': 1, '1.1': 0.91 }, TD = { '-40': 0.94, '25': 1, '125': 1.1 };
    var PL = { SS: 0.5, TT: 1, FF: 2.2 }, VL = { '0.9': 0.8, '1.0': 1, '1.1': 1.25 }, TL = { '-40': 0.15, '25': 1, '125': 9 };
    function upd() {
      seen[p + v + t] = 1; if (Object.keys(seen).length >= 4) api.done();
      var d = PD[p] * VD[v] * TD[t], lk = PL[p] * VL[v] * TL[t], o = '';
      var bar = function (y, label, val, mx, unit, good) {
        var w = 360 * Math.min(1, val / mx);
        return T(10, y + 16, label, 't-ink t-b', 'start') + R(150, y, 360, 24, 'box', 4) + '<rect x="150" y="' + y + '" width="' + w.toFixed(1) + '" height="24" rx="4" fill="' + (good ? 'var(--l7-sig)' : 'var(--l7-cu)') + '" opacity=".85"/>' + T(520, y + 17, val.toFixed(2) + unit, 't-ink t-b', 'start');
      };
      o += bar(20, 'Gate delay', d, 1.5, '×', d <= 1) + bar(64, 'Leakage', lk, 25, '×', lk <= 1);
      o += T(10, 120, 'Worst-delay corner (slow): SS · 0.9 V · 125 °C = ' + (PD.SS * VD['0.9'] * TD['125']).toFixed(2) + '×', 't-dim t-sm', 'start');
      o += T(10, 140, 'Worst-leakage corner: FF · 1.1 V · 125 °C = ' + (PL.FF * VL['1.1'] * TL['125']).toFixed(1) + '×', 't-dim t-sm', 'start');
      pic.innerHTML = S(600, 152, o, 'Delay and leakage at the selected corner');
      L.fb(fb, 'info', 'Relative to TT, 1.0 V, 25 °C. Slower transistors, lower voltage and (in this model) higher temperature increase delay; leakage rises steeply with temperature and with fast, low-Vt silicon. A design must work at <b>every</b> corner, so it is checked at the extremes – the slow corner for speed, the fast/hot corner for leakage and hold. (At very low voltage in advanced nodes, delay can instead <i>decrease</i> with temperature – “temperature inversion”.)');
    }
    upd();
  }

  /* ---------- Widget: Monte Carlo mismatch ---------- */
  function mismatch(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Monte Carlo lab · threshold-voltage mismatch (Pelgrom)</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { a: 2.5, w: 0.2, l: 0.05 }, runs = 0;
    L.slider(body, 'Pelgrom coefficient A_Vt', 1, 5, 0.5, p.a, function (x) { return x.toFixed(1) + ' mV·µm'; }, function (x) { p.a = x; });
    L.slider(body, 'Width W', 0.05, 1, 0.05, p.w, function (x) { return x.toFixed(2) + ' µm'; }, function (x) { p.w = x; });
    L.slider(body, 'Length L', 0.02, 0.5, 0.01, p.l, function (x) { return x.toFixed(2) + ' µm'; }, function (x) { p.l = x; });
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    row.appendChild(L.btn('▶ Run 1000 samples', 'pri', run));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    function run() {
      runs++; if (runs >= 3) api.done();
      var sig = p.a / Math.sqrt(p.w * p.l), xs = [], bins = new Array(30).fill(0), range = 100;
      for (var i = 0; i < 1000; i++) xs.push(gauss() * sig);
      xs.forEach(function (x) { var b = Math.floor((x + range) / (2 * range) * 30); if (b >= 0 && b < 30) bins[b]++; });
      var mx = Math.max.apply(null, bins), o = '';
      bins.forEach(function (c, i) { var hh = 120 * c / mx; o += '<rect x="' + (40 + i * 17) + '" y="' + (150 - hh) + '" width="15" height="' + hh + '" rx="2" fill="var(--l7-sig)" opacity=".75"/>'; });
      o += P('M40 150H550', 'w') + T(295, 170, 'ΔVt (mV): −100 … 0 … +100', 't-dim t-sm');
      var s3 = 3 * sig, x3 = function (v) { return 40 + (v + range) / (2 * range) * 510; };
      if (s3 < range) o += P('M' + x3(-s3) + ' 20V150', 'w-dash') + P('M' + x3(s3) + ' 20V150', 'w-dash') + T(x3(s3) + 4, 30, '+3σ', 't-cu t-sm', 'start');
      var out3 = xs.filter(function (x) { return Math.abs(x) > 50; }).length;
      pic.innerHTML = S(590, 180, o, 'Histogram of threshold mismatch');
      out.innerHTML = '<span class="k">σ(ΔVt)</span> = A<sub>Vt</sub>/√(W·L) = <span class="v">' + sig.toFixed(1) + ' mV</span> · <span class="k">3σ</span> = ' + s3.toFixed(1) + ' mV' +
        '<br><span class="k">Samples with |ΔVt| &gt; 50 mV</span>: <span class="c">' + out3 + ' / 1000</span>' +
        '<br>Bigger transistors match better: quadrupling W·L halves σ. SRAM cells and sense amplifiers, which must be tiny <i>and</i> matched, suffer most.';
    }
    run(); runs = 0;
  }

  /* ---------- Widget: soft errors and TMR ---------- */
  function seuLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Soft-error lab · particle strike vs critical charge</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { c: 1.0, v: 0.8, q: 0.5 }, tmr = false, flipped = false, saved = false;
    L.slider(body, 'Node capacitance', 0.2, 3, 0.1, p.c, function (x) { return x.toFixed(1) + ' fF'; }, function (x) { p.c = x; show(); });
    L.slider(body, 'Supply voltage', 0.5, 1.2, 0.05, p.v, function (x) { return x.toFixed(2) + ' V'; }, function (x) { p.v = x; show(); });
    L.slider(body, 'Collected charge from strike', 0.1, 3, 0.1, p.q, function (x) { return x.toFixed(1) + ' fC'; }, function (x) { p.q = x; show(); });
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    row.appendChild(L.btn('⚡ Strike!', 'cu', strike));
    var tb = L.btn('Protection: none', '', function () { tmr = !tmr; tb.textContent = 'Protection: ' + (tmr ? 'TMR (3 copies + voter)' : 'none'); tb.classList.toggle('is-on', tmr); show(); });
    row.appendChild(tb);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function qcrit() { return p.c * p.v; }
    function draw(hit) {
      var o = '', n = tmr ? 3 : 1, up = hit && p.q > qcrit();
      for (var i = 0; i < n; i++) {
        var y = 20 + i * 52, bad = up && i === 0;
        o += R(40, y, 120, 40, bad ? 'box-bad' : 'box-on', 6) + T(100, y + 25, (tmr ? 'Copy ' + (i + 1) : 'Latch') + ' = ' + (bad ? 0 : 1), bad ? 't-bad t-b' : 't-sig t-b');
        if (tmr) o += P('M160 ' + (y + 20) + 'L250 ' + (20 + 52) + '', bad ? 'w-bad' : 'w-on');
      }
      if (hit) o += '<path d="M10 0L60 30" class="w-cu pulse"/><circle cx="62" cy="32" r="8" class="w-cu pulse"/>';
      var outv = tmr ? 1 : (up ? 0 : 1);
      if (tmr) o += '<path d="M250 52L300 52Q320 72 300 92L250 92Z" class="box-vio"/>' + T(278, 77, 'MAJ', 't-vio t-b t-sm') + P('M310 72H360', 'w-on');
      else o += P('M160 40H360', outv ? 'w-on' : 'w-bad');
      o += T(370, tmr ? 77 : 45, 'output = ' + outv + (outv ? ' ✓' : ' ✗ upset'), outv ? 't-ok t-b' : 't-bad t-b', 'start');
      pic.innerHTML = S(520, tmr ? 180 : 80, o, 'Soft error strike');
    }
    function show() { draw(false); L.fb(fb, 'info', 'Q<sub>crit</sub> ≈ C·VDD = ' + qcrit().toFixed(2) + ' fC; collected charge ' + p.q.toFixed(1) + ' fC. Strike the node to test it.'); }
    function strike() {
      var up = p.q > qcrit(); draw(true);
      if (!up) L.fb(fb, 'ok', 'No upset: collected charge (' + p.q.toFixed(1) + ' fC) &lt; Q<sub>crit</sub> (' + qcrit().toFixed(2) + ' fC). The node recovers.');
      else if (!tmr) { flipped = true; L.fb(fb, 'bad', '⚡ Bit flip! Collected charge exceeds Q<sub>crit</sub>. Smaller capacitance and lower voltage make nodes easier to upset – the stored value is wrong, although nothing is permanently damaged (a <b>soft</b> error). Now turn on TMR and strike again.'); }
      else { saved = true; L.fb(fb, 'ok', '🛡 One copy flipped, but the majority voter still outputs the correct value. TMR masks any single upset, at about 3× area and power.'); }
      if (flipped && saved) api.done();
    }
    show();
  }

  function agingFrame(k) {
    var yrs = [0, 1, 3, 10][k], dvt = 50 * Math.pow(yrs / 10, 0.2) * (yrs ? 1 : 0), o = '';
    o += P('M50 150H520', 'w') + P('M50 150V20', 'w') + T(285, 172, 'time (years) →', 't-dim t-sm') + T(20, 85, 'ΔVt', 't-dim t-sm');
    var path = '';
    for (var i = 0; i <= 60; i++) { var t = 10 * i / 60, x = 50 + 46 * t, y = 150 - 2.4 * 50 * Math.pow(t / 10, 0.2) * (t ? 1 : 0); path += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
    o += P(path, 'w-cu');
    var mx = 50 + 46 * yrs, my = 150 - 2.4 * dvt;
    o += L.dot(mx, my, 6, 'dot-on') + T(mx + 8, my - 8, yrs + ' y: ΔVt ≈ ' + dvt.toFixed(0) + ' mV', 't-sig t-b t-sm', 'start');
    return S(560, 180, o, 'Ageing threshold shift');
  }

  L.module({
    n: 8,
    lead: 'A chip must work across billions of transistors, every operating condition and many years of use. Explore process, voltage and temperature variation, device mismatch, ageing and soft errors – and the design techniques that keep circuits robust.',
    tags: ['process variation', 'voltage & temperature', 'mismatch', 'ageing', 'soft errors', 'robust design'],
    sections: [
      { part: 'Learn' },
      {
        id: 'c-var', type: 'concept', title: 'Process, voltage and temperature variation', nav: 'PVT',
        html: '<div class="l7-grid3"><div class="l7-box cu"><h4>Process (P)</h4><p>Manufacturing varies gate length, oxide thickness, doping and fin dimensions. <b>Global (die-to-die)</b> variation shifts all transistors on a chip together; <b>local (within-die)</b> variation makes neighbouring transistors differ. Foundries describe the global spread with corners such as SS, TT, FF, SF, FS.</p></div>' +
          '<div class="l7-box sig"><h4>Voltage (V)</h4><p>The supply at a transistor differs from nominal because of regulator tolerance, IR drop in the power grid and dynamic droop when many gates switch together. Lower voltage → slower gates.</p></div>' +
          '<div class="l7-box vio"><h4>Temperature (T)</h4><p>Junction temperature can range from −40 °C to 125 °C or more, with hot spots on the die. Higher temperature lowers mobility (usually slower) and greatly increases leakage.</p></div></div>' +
          '<p style="margin-top:12px">A design is verified at combinations of these extremes, called <b>PVT corners</b>, so that it works for every chip, at every supply and temperature it will see. Detailed timing sign-off at corners is part of Level 8.</p>'
      },
      { id: 'w-pvt', type: 'widget', title: 'PVT corner explorer', nav: 'PVT lab', intro: 'Visit at least four different corners. Which one is worst for speed, and which for leakage?', build: pvtLab },
      {
        id: 'c-mm', type: 'concept', title: 'Device mismatch and manufacturing variation', nav: 'Mismatch',
        html: '<p>Even two identical transistors drawn side by side differ, mainly because of <b>random dopant fluctuation</b>, line-edge roughness and metal-gate grain variation. The standard deviation of threshold mismatch follows <b>Pelgrom\'s law</b>:</p>' +
          '<div class="l7-eq">σ(ΔV<sub>t</sub>) = A<sub>Vt</sub> / √(W·L)</div>' +
          '<p>Circuits that rely on matching – SRAM cells, sense amplifiers, current mirrors, comparators – need larger devices, careful layout (common-centroid, same orientation, dummy devices) or calibration. Systematic manufacturing effects such as lithography proximity, CMP (polishing) density effects and stress also cause layout-dependent variation, which designers manage with regular layout styles and density rules.</p>'
      },
      { id: 'w-mc', type: 'widget', title: 'Monte Carlo mismatch lab', nav: 'Mismatch lab', intro: 'Change the transistor size and run the simulation at least three times.', build: mismatch },
      {
        id: 'c-age', type: 'concept', title: 'Ageing effects', nav: 'Ageing',
        html: '<div class="l7-grid2"><div class="l7-box cu"><h4>BTI (bias temperature instability)</h4><p>Under gate bias and heat, charges are trapped near the gate dielectric, raising |V<sub>t</sub>| over time (NBTI in pMOS, PBTI in nMOS). Part of the shift recovers when the stress is removed.</p></div>' +
          '<div class="l7-box sig"><h4>HCI (hot-carrier injection)</h4><p>High-energy carriers near the drain damage the interface during switching, degrading current – worse with high activity and fast edges.</p></div>' +
          '<div class="l7-box vio"><h4>TDDB</h4><p>Time-dependent dielectric breakdown: the gate oxide eventually forms a conductive path under electric-field stress.</p></div>' +
          '<div class="l7-box"><h4>Electromigration (EM)</h4><p>High current density moves metal atoms in wires and vias, forming voids (opens) or hillocks (shorts). Controlled by current-density limits and wider wires.</p></div></div>' +
          '<p style="margin-top:12px">Ageing makes a chip slower over its lifetime, so designs include an <b>ageing guard-band</b> or adaptive voltage/frequency control.</p>'
      },
      {
        id: 'st-age', type: 'steps', title: 'Animation: threshold drift over a product lifetime', nav: 'Ageing animation',
        frames: [
          { t: 'Fresh silicon: ΔVt = 0.', svg: agingFrame(0) },
          { t: 'BTI shifts follow a power law ≈ t<sup>n</sup> with n ≈ 0.15–0.25: most of the shift happens early.', svg: agingFrame(1) },
          { t: 'After three years the shift has grown more slowly.', svg: agingFrame(2) },
          { t: 'At end of life (10 years) the shift may be tens of mV, making gates several percent slower. The design must still meet its target – this is the ageing margin. (Illustrative numbers.)', svg: agingFrame(3) }
        ]
      },
      {
        id: 'c-seu', type: 'concept', title: 'Soft errors', nav: 'Soft errors',
        html: '<p>Alpha particles from packaging materials and neutrons from cosmic rays can deposit charge in silicon. If a storage node collects more than its <b>critical charge</b> Q<sub>crit</sub> ≈ C<sub>node</sub>·VDD, its value flips: a <b>single-event upset (SEU)</b>. The device is not damaged – the error is “soft” – but data is corrupted. Smaller nodes and lower voltages reduce Q<sub>crit</sub>; a single strike can now upset several adjacent bits (multi-bit upset).</p>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>ECC</h4><p>Error-correcting codes on memories (e.g. SECDED Hamming) correct single-bit and detect double-bit errors. Interleaving spreads physically adjacent bits into different words.</p></div><div class="l7-box cu"><h4>Redundancy</h4><p>Triple modular redundancy (TMR) with majority voting, or dual lock-step cores that compare results.</p></div><div class="l7-box vio"><h4>Hardened cells</h4><p>Radiation-hardened latches (e.g. DICE) store each bit on several nodes so one strike cannot flip it.</p></div></div>'
      },
      { id: 'w-seu', type: 'widget', title: 'Soft-error lab', nav: 'SEU lab', intro: 'Cause a bit flip on an unprotected latch, then enable TMR and show that the output survives a strike.', build: seuLab },
      {
        id: 'c-rob', type: 'concept', title: 'Reliability challenges and design robustness', nav: 'Robustness',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Threat</th><th>Robust-design response</th></tr>' +
          '<tr><td>Global process / PVT</td><td>Design and verify at corners; adaptive voltage scaling; on-chip process/temperature monitors</td></tr>' +
          '<tr><td>Local mismatch</td><td>Larger matched devices, symmetric layout, statistical (Monte Carlo) analysis, redundancy and repair in memories</td></tr>' +
          '<tr><td>Supply noise / IR drop</td><td>Robust power grid, decoupling capacitors, staggering switching activity</td></tr>' +
          '<tr><td>Ageing</td><td>Guard-bands, ageing-aware sizing, limiting stress, runtime monitors</td></tr>' +
          '<tr><td>Electromigration</td><td>Current-density rules, wider wires and redundant vias</td></tr>' +
          '<tr><td>Soft errors</td><td>ECC, interleaving, TMR, hardened latches, scrubbing</td></tr>' +
          '<tr><td>Manufacturing defects</td><td>Design-for-manufacturability rules, redundant vias, spare rows/columns in memories</td></tr></table></div>' +
          '<p>Reliability is a budget: each technique costs area, power or speed, so designers choose the level of protection the application needs – far higher for automotive and medical chips than for a toy.</p>'
      },
      {
        id: 'rv-rel', type: 'reveal', title: 'Click to reveal: reliability insights', nav: 'Reveal',
        items: [
          { q: 'What is the difference between a soft error and a hard failure?', a: 'A soft error corrupts stored data but the circuit still works once rewritten. A hard failure (e.g. oxide breakdown, electromigration void) permanently damages the circuit.' },
          { q: 'Why does lowering VDD increase soft-error rates?', a: 'Q<sub>crit</sub> ≈ C·VDD falls, so a smaller collected charge can flip the node.' },
          { q: 'Why are SRAMs the main concern for local variation?', a: 'They contain billions of minimum-size cells whose read and write margins depend on matched transistors; a few extreme cells (at 5–6σ) can fail.' },
          { q: 'What is adaptive voltage scaling?', a: 'On-chip monitors measure the actual speed of the silicon and the supply is adjusted per chip: slow chips get more voltage, fast chips less.' },
          { q: 'Why is temperature critical for leakage?', a: 'Subthreshold leakage rises exponentially with temperature, so hot chips leak much more, which heats them further.' },
          { q: 'What does ECC SECDED mean?', a: 'Single Error Correction, Double Error Detection – a Hamming-based code that fixes any 1-bit error and flags 2-bit errors in a word.' }
        ]
      },
      {
        id: 'dd-rel', type: 'drag', title: 'Drag & drop: classify the reliability issue', nav: 'Drag & drop',
        bins: ['Variation', 'Ageing / wear-out', 'Soft error', 'Mitigation'],
        items: [['SS / FF process corners', 0], ['Random dopant fluctuation', 0], ['IR drop on the supply', 0], ['NBTI threshold shift', 1], ['Electromigration voids', 1], ['Gate-oxide breakdown (TDDB)', 1], ['Neutron-induced bit flip', 2], ['Multi-bit upset in SRAM', 2], ['ECC on memories', 3], ['Triple modular redundancy', 3], ['Larger matched devices', 3]]
      },
      { part: 'Practice' },
      {
        id: 'calc8', type: 'calc', title: 'Calculation challenges', nav: 'Calculate',
        items: [
          { q: 'With A<sub>Vt</sub> = 2.5 mV·µm, W = 0.2 µm and L = 0.05 µm, what is σ(ΔVt) in mV?', a: 25, u: 'mV', h: 'σ = A/√(W·L); W·L = 0.01 µm².', s: '2.5 / √0.01 = 2.5 / 0.1 = <b>25 mV</b>.' },
          { q: 'By what factor must W·L increase to halve σ(ΔVt)?', a: 4, tol: 0, abs: 0.01, h: 'σ ∝ 1/√(area).', s: 'Halving σ needs √area doubled → area × <b>4</b>.' },
          { q: 'A storage node has 1.2 fF and VDD = 0.75 V. Estimate Q<sub>crit</sub> in fC.', a: 0.9, u: 'fC', h: 'Q ≈ C·V.', s: '1.2 fF × 0.75 V = <b>0.9 fC</b>.' },
          { q: 'Each copy of a TMR module fails independently with probability p = 0.01. The voted output fails only if two or more copies fail: P = 3p² − 2p³. Compute P.', a: 0.000298, tol: 0.01, h: '3 × 10⁻⁴ − 2 × 10⁻⁶.', s: '3(0.0001) − 2(0.000001) = <b>2.98 × 10⁻⁴</b> – about 34× better than a single copy.' },
          { q: 'A 0.9 V supply has a 10 % IR-drop budget. What is the minimum voltage the cells may see (V)?', a: 0.81, u: 'V', h: '0.9 × (1 − 0.1).', s: '<b>0.81 V</b> – cells must be designed (and timed) to work at this level.' }
        ]
      },
      {
        id: 'mcq8', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'The slowest corner for gate delay is usually…', o: ['FF, high V, low T', 'SS, low V, high T', 'TT, nominal', 'FF, low V, high T'], a: 1, w: 'Slow devices, low supply, (usually) hot.' },
          { q: 'Pelgrom\'s law says mismatch σ is proportional to…', o: ['W·L', '1/√(W·L)', 'VDD', 'temperature'], a: 1, w: 'Larger devices match better.' },
          { q: 'Triple modular redundancy masks…', o: ['any number of failures', 'a single faulty copy', 'leakage', 'electromigration'], a: 1, w: 'The majority voter outvotes one bad copy.' },
          { q: 'Which effect slowly raises |Vt| of pMOS transistors under negative gate bias at high temperature?', o: ['HCI', 'NBTI', 'EM', 'SEU'], a: 1, w: 'Negative bias temperature instability.' }
        ]
      },
      {
        id: 'short8', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Distinguish global and local process variation and give one design response to each.', k: ['global|die-to-die|corner', 'local|within-die|mismatch|random', 'corner|monte carlo', 'size|larger|matching|layout'], m: 'Global (die-to-die) variation shifts all devices on a chip in the same direction; it is handled by designing and verifying at process corners such as SS and FF, and with adaptive voltage scaling. Local (within-die) variation makes neighbouring devices differ randomly; it is handled by statistical Monte Carlo analysis, larger and symmetrically laid-out matched devices, and margins or redundancy in memories.' },
          { q: 'Explain what a soft error is and two ways to protect a memory against it.', k: ['particle|neutron|alpha', 'charge|qcrit|critical', 'flip|upset', 'ecc|error correct', 'interleav|redundan|tmr|harden'], m: 'A soft error happens when a particle strike deposits more charge on a storage node than its critical charge, flipping the stored bit without damaging the device. Memories are protected with error-correcting codes (e.g. SECDED), physical bit interleaving so a multi-bit strike hits different words, periodic scrubbing, or hardened cells.' }
        ]
      },
      {
        id: 'scen8', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'An automotive controller passes all tests at 25 °C but some parts fail at 150 °C after several years in the field.', q: 'Which combination of effects is the most likely culprit?', o: [{ t: 'Higher delay and leakage at temperature combined with ageing (BTI) beyond the guard-band', ok: true, w: 'Right: high temperature both slows gates and accelerates ageing; the design needs corner verification to 150 °C and an adequate ageing margin.' }, { t: 'Soft errors from alpha particles', ok: false, w: 'Soft errors cause random bit flips, not systematic failures at temperature over years.' }, { t: 'Crosstalk', ok: false, w: 'Crosstalk does not explain failures that appear only after years at high temperature.' }] },
          { s: 'A satellite processor will fly through high-radiation orbits. Its register file must not silently corrupt data.', q: 'Which protection is most appropriate?', o: [{ t: 'ECC on the register file and memories, with hardened or TMR flip-flops for critical state', ok: true, w: 'Radiation environments need layered soft-error protection.' }, { t: 'Increase the clock frequency', ok: false, w: 'Speed does not reduce upset rates.' }, { t: 'Use the smallest, lowest-voltage cells', ok: false, w: 'Lower Q<sub>crit</sub> makes upsets more likely.' }] }
        ]
      }
    ],
    quiz: [
      { q: 'PVT stands for…', o: ['Power, Voltage, Timing', 'Process, Voltage, Temperature', 'Placement, Via, Track', 'Pull-up, Voltage, Threshold'], a: 1, w: 'The three main sources of operating variation.' },
      { q: 'Die-to-die variation is described by…', o: ['process corners', 'Pelgrom\'s law', 'ECC', 'TMR'], a: 0, w: 'Corners model global variation.' },
      { q: 'Doubling both W and L of a transistor changes mismatch σ by a factor of…', o: ['2', '1/2', '1/4', '4'], a: 1, w: 'Area ×4 → σ × 1/2.' },
      { q: 'Leakage current depends most strongly on…', o: ['temperature', 'wire length', 'bus width', 'clock skew'], a: 0, w: 'Subthreshold leakage rises exponentially with temperature.' },
      { q: 'Electromigration is caused by…', o: ['high current density moving metal atoms', 'particle strikes', 'oxide trapping', 'lithography'], a: 0, w: 'Momentum transfer from electrons to metal atoms.' },
      { q: 'A soft error…', o: ['permanently damages a transistor', 'corrupts data without permanent damage', 'only affects wires', 'is caused by electromigration'], a: 1, w: 'Rewriting the data fixes it.' },
      { q: 'Critical charge Q<sub>crit</sub> decreases when…', o: ['node capacitance and VDD decrease', 'temperature decreases', 'wires get longer', 'ECC is added'], a: 0, w: 'Q<sub>crit</sub> ≈ C·VDD.' },
      { q: 'SECDED ECC can…', o: ['correct 2 errors', 'correct 1 and detect 2 errors', 'only detect 1 error', 'prevent particle strikes'], a: 1, w: 'Single Error Correct, Double Error Detect.' },
      { q: 'An ageing guard-band is…', o: ['extra timing margin for end-of-life slowdown', 'a shield wire', 'a type of ECC', 'a test pattern'], a: 0, w: 'The design must still work after ageing.' },
      { q: 'Which circuits are most sensitive to local mismatch?', o: ['long global wires', 'SRAM cells and sense amplifiers', 'I/O pads', 'clock dividers'], a: 1, w: 'They rely on closely matched small devices.' }
    ]
  });
})();
