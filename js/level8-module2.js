/* Level 8 · Module 2 – CMOS Delay Analysis */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* ---------- Widget: RC delay lab ---------- */
  function delayLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Delay lab · change R, load and fan-out and watch the output charge</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { r: 4, fo: 3, cin: 2, cpar: 1.5, wire: 4 }, n = 0, ref = null;
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    L.slider(c1, 'Driver resistance R (smaller = bigger gate)', 1, 12, 0.5, p.r, function (v) { return v + ' kΩ'; }, function (v) { p.r = v; upd(1); });
    L.slider(c1, 'Fan-out (gates driven)', 1, 8, 1, p.fo, null, function (v) { p.fo = v; upd(1); });
    L.slider(c1, 'Input capacitance per gate', 0.5, 5, 0.5, p.cin, function (v) { return v + ' fF'; }, function (v) { p.cin = v; upd(1); });
    L.slider(c2, 'Driver parasitic capacitance', 0, 5, 0.5, p.cpar, function (v) { return v + ' fF'; }, function (v) { p.cpar = v; upd(1); });
    L.slider(c2, 'Wire capacitance', 0, 20, 1, p.wire, function (v) { return v + ' fF'; }, function (v) { p.wire = v; upd(1); });
    var row = L.h('div', 'l7-row'); c2.appendChild(row);
    row.appendChild(L.btn('📌 Save as reference', 'ghost', function () { ref = calc(); upd(0); }));
    var split = L.h('div', 'l7-lab-split'); body.appendChild(split);
    var pic = L.h('div', 'l7-svgbox'); split.appendChild(pic);
    var out = L.h('div', 'l7-readout'); split.appendChild(out);
    function calc() { var C = p.cpar + p.fo * p.cin + p.wire; return { C: C, t: 0.69 * p.r * C, tau: p.r * C }; }
    function upd(ch) {
      if (ch) n++; if (n >= 4) api.done();
      var x = calc(), o = '', W = 380, H = 230, tmax = 300;
      var X = function (t) { return 40 + t / tmax * 320; }, Y = function (v) { return 190 - v * 150; };
      o += P('M40 190H365M40 190V30', 'w') + T(200, 214, 'time (ps)', 't-dim t-sm') + T(16, 110, 'V_out', 't-dim t-sm');
      for (var t = 0; t <= tmax; t += 50) o += T(X(t), 204, t, 't-dim t-sm');
      o += P('M40 ' + Y(0.5) + 'H365', 'w-dash') + T(362, Y(0.5) - 4, '50 %', 't-dim t-sm', 'end');
      function curve(tau, cls) { var d = ''; for (var i = 0; i <= 60; i++) { var tt = tmax * i / 60; d += (i ? 'L' : 'M') + X(tt).toFixed(1) + ' ' + Y(1 - Math.exp(-tt / tau)).toFixed(1); } return P(d, cls); }
      if (ref) { o += curve(ref.tau, 'w-dash'); }
      o += curve(x.tau, 'w-on');
      if (x.t < tmax) o += L.dot(X(x.t), Y(0.5), 5, 'dot-cu') + T(X(x.t) + 6, Y(0.5) + 16, 't_pd ' + x.t.toFixed(0) + ' ps', 't-cu t-b t-sm', 'start');
      pic.innerHTML = S(W, H, o, 'Output voltage charging curve');
      var parts = [['parasitic', p.cpar], ['fan-out ' + p.fo + ' × ' + p.cin, p.fo * p.cin], ['wire', p.wire]];
      out.innerHTML = '<span class="k">C_load</span> = C_par + N·C_in + C_wire = <span class="v">' + x.C.toFixed(1) + ' fF</span><br>' +
        parts.map(function (q) { return '<span class="k">  ' + q[0] + '</span> ' + q[1].toFixed(1) + ' fF (' + Math.round(100 * q[1] / (x.C || 1)) + ' %)'; }).join('<br>') +
        '<br><span class="k">τ = R·C</span> = ' + x.tau.toFixed(1) + ' ps<br><span class="k">t_pd ≈ 0.69·R·C</span> = <span class="c">' + x.t.toFixed(1) + ' ps</span>' +
        (ref ? '<br><span class="k">vs reference</span> ' + (x.t >= ref.t ? '+' : '') + (100 * (x.t - ref.t) / ref.t).toFixed(0) + ' % (dashed curve)' : '<br><span class="k">Tip</span> save a reference, then change one parameter');
    }
    upd(0);
  }

  /* ---------- Widget: Elmore delay of an RC ladder ---------- */
  function elmoreLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Elmore delay lab · RC ladder from driver to receiver</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var N = 3, r = [2, 1, 1, 1, 1], c = [10, 10, 10, 10, 10], n = 0;
    var top = L.h('div', 'l7-row'); body.appendChild(top);
    L.select(top, 'Segments', [['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']], '3', function (v) { N = +v; n++; build(); });
    var ctl = L.h('div', 'l7-grid2'); body.appendChild(ctl);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    function build() {
      ctl.innerHTML = '';
      for (var i = 0; i < N; i++) (function (i) {
        var box = L.h('div', 'l7-box', '<h4>Node ' + (i + 1) + '</h4>'); ctl.appendChild(box);
        L.slider(box, 'R' + (i + 1) + (i === 0 ? ' (driver + wire)' : ''), 0.5, 5, 0.5, r[i], function (v) { return v + ' kΩ'; }, function (v) { r[i] = v; n++; upd(); });
        L.slider(box, 'C' + (i + 1) + (i === N - 1 ? ' (incl. receiver)' : ''), 2, 30, 1, c[i], function (v) { return v + ' fF'; }, function (v) { c[i] = v; n++; upd(); });
      })(i);
      upd();
    }
    function upd() {
      if (n >= 3) api.done();
      var o = '', x0 = 30, dx = 520 / N, terms = [], tot = 0, rUp = 0;
      o += R(4, 72, 26, 36, 'box-cu', 6) + T(17, 95, 'D', 't-ink t-b t-sm');
      for (var i = 0; i < N; i++) {
        var xa = x0 + i * dx, xb = xa + dx;
        rUp += r[i]; var term = rUp * c[i]; terms.push([rUp, c[i], term]); tot += term;
        o += P('M' + xa + ' 90H' + (xa + dx * 0.25), 'w') + '<path d="M' + (xa + dx * 0.25) + ' 90l6 -8l8 16l8 -16l8 16l8 -16l6 8" class="w-cu"/>' + P('M' + (xa + dx * 0.25 + 52) + ' 90H' + xb, 'w');
        o += T(xa + dx * 0.25 + 26, 72, 'R' + (i + 1) + '=' + r[i], 't-cu t-sm');
        o += L.dot(xb, 90, 4, 'dot-on') + P('M' + xb + ' 90V120', 'w') + P('M' + (xb - 14) + ' 120H' + (xb + 14) + 'M' + (xb - 14) + ' 128H' + (xb + 14), 'w-vio') + P('M' + xb + ' 128V146', 'w') + P('M' + (xb - 8) + ' 146H' + (xb + 8), 'w');
        o += T(xb, 166, 'C' + (i + 1) + '=' + c[i], 't-vio t-sm');
      }
      pic.innerHTML = S(570, 176, o, 'RC ladder');
      out.innerHTML = '<span class="k">Elmore delay</span> τ_D = Σ (resistance from driver to node i) × C_i<br>' +
        terms.map(function (q, i) { return '<span class="k">  node ' + (i + 1) + '</span> ' + q[0].toFixed(1) + ' kΩ × ' + q[1] + ' fF = ' + q[2].toFixed(1) + ' ps'; }).join('<br>') +
        '<br><span class="k">τ_D</span> = <span class="v">' + tot.toFixed(1) + ' ps</span> → <span class="k">50 % delay ≈ 0.69·τ_D</span> = <span class="c">' + (0.69 * tot).toFixed(1) + ' ps</span>' +
        '<br>Capacitance far from the driver sees <b>all</b> the upstream resistance, so it costs the most delay.';
    }
    build();
  }

  function chargeFrame(k) {
    var o = '', lv = [0, 0.39, 0.5, 0.86, 0.98][k];
    o += P('M60 30H200', 'w-cu') + T(130, 22, 'VDD', 't-cu t-b');
    o += P('M130 30V60', 'w') + R(100, 60, 60, 40, k ? 'box-on' : 'box', 6) + T(130, 85, 'R_p', 't-ink t-b');
    o += P('M130 100V140', k ? 'w-on flow' : 'w') + L.dot(130, 140, 5, 'dot-on') + P('M130 140H230', 'w');
    o += P('M230 140V160', 'w') + P('M210 160H250M210 168H250', 'w-vio') + P('M230 168V190', 'w') + P('M218 190H242', 'w') + T(270, 168, 'C_load', 't-vio t-b', 'start');
    o += R(380, 30, 30, 160, 'box', 4);
    o += '<rect x="382" y="' + (188 - 156 * lv) + '" width="26" height="' + (156 * lv) + '" rx="3" fill="var(--l7-sig)" opacity=".7"/>';
    o += P('M375 ' + (188 - 156 * 0.5) + 'H415', 'w-dash') + T(420, 112, '50 %', 't-dim t-sm', 'start');
    o += T(395, 210, (lv * 100).toFixed(0) + ' % VDD', 't-ink t-b t-sm');
    o += T(130, 220, ['t = 0: input switches', 't = 0.5τ', 't = 0.69τ: 50 % → this is t_pd', 't = 2τ', 't = 4τ: practically settled'][k], 't-vio t-b');
    return S(520, 232, o, 'Load capacitor charging, step ' + k);
  }

  L.module({
    n: 2,
    lead: 'Where does delay come from? A gate is a resistor charging a capacitor. Explore how resistance, load and parasitic capacitance, fan-out and wires set the delay – and how the Elmore model estimates it for a whole RC network.',
    tags: ['sources of delay', 'RC model', 'load capacitance', 'fan-out', 'parasitics', 'wire delay', 'Elmore delay', 'optimisation'],
    sections: [
      {
        id: 'c-src', type: 'concept', title: 'Sources of delay: a resistor charging a capacitor', nav: 'Sources',
        html: '<p>When a CMOS gate switches, the conducting transistors act like a resistor R that charges or discharges the capacitance on the output node. The larger R or C, the longer it takes to reach the switching threshold of the next gate.</p>' +
          '<div class="l7-eq">V_out(t) = VDD·(1 − e^(−t/RC))   →   50 % reached at t = ln2·RC ≈ 0.69·RC</div>' +
          '<div class="l7-grid2"><div class="l7-box cu"><h4>Resistance R</h4><p>Set by transistor width and the number of series devices. Wider transistors (larger gates) → lower R. Series stacks → higher R.</p></div>' +
          '<div class="l7-box sig"><h4>Capacitance C</h4><p>Everything attached to the output: the driver\'s own parasitic (diffusion) capacitance, the input capacitance of every gate it drives, and the wire.</p></div></div>'
      },
      {
        id: 'st-charge', type: 'steps', title: 'Animation: charging the output node', nav: 'Charging',
        frames: [0, 1, 2, 3, 4].map(function (k) { return { t: ['The input switches; the pull-up pMOS (resistance R_p) turns on.', 'Current flows into C_load; the voltage rises quickly at first.', 'At 0.69·τ the output crosses 50 % of VDD – this is the propagation delay.', 'The current falls as the voltage approaches VDD.', 'After ≈ 4τ the output is fully settled. Halving R or C halves every one of these times.'][k], svg: chargeFrame(k) }; })
      },
      {
        id: 'c-load', type: 'concept', title: 'Load capacitance, fan-out and parasitics', nav: 'Load & fan-out',
        html: '<div class="l7-eq">C_load = C_parasitic + N_fanout · C_in + C_wire</div>' +
          '<div class="l7-grid3"><div class="l7-box vio"><h4>Parasitic</h4><p>Diffusion capacitance of the driver\'s own transistors. Grows with gate size, so a bigger gate partly loads itself.</p></div><div class="l7-box sig"><h4>Fan-out</h4><p>Each driven gate adds its input (gate) capacitance. Doubling fan-out roughly doubles that part of the load.</p></div><div class="l7-box cu"><h4>Wire</h4><p>About 0.1–0.2 fF per µm. Long wires can dominate the load and add their own resistance.</p></div></div>' +
          '<p style="margin-top:12px">A useful linear model is <b>d = d_parasitic + k·C_load</b>: a fixed intrinsic delay plus a part proportional to load. Library timing tables capture the same idea as a function of load and input slew.</p>'
      },
      { id: 'w-delay', type: 'widget', title: 'Delay lab: R, C and fan-out', nav: 'Delay lab', intro: 'Save a reference, then change load, fan-out, capacitance and resistance (at least four changes). Watch the charging curve and the delay.', build: delayLab },
      {
        id: 'c-wire', type: 'concept', title: 'Wire delay and RC models', nav: 'Wire & RC models',
        html: '<p>A short wire is just extra capacitance. A long wire also has resistance spread along its length, so it is modelled as a chain of R and C segments (a distributed RC line).</p>' +
          '<div class="l7-grid3"><div class="l7-box"><h4>Lumped C</h4><p>Wire = one capacitor. Good for short wires.</p></div><div class="l7-box"><h4>Lumped RC</h4><p>One R and one C. Overestimates delay of a distributed line.</p></div><div class="l7-box"><h4>Distributed RC</h4><p>Many small segments. Delay ≈ 0.38·R_w·C_w – grows with length².</p></div></div>'
      },
      {
        id: 'c-elmore', type: 'concept', title: 'The Elmore delay concept', nav: 'Elmore',
        html: '<p>The <b>Elmore delay</b> gives a simple estimate for any RC tree: for every capacitor, multiply it by the total resistance between the driver and that capacitor\'s node (the shared path), and add the products.</p>' +
          '<div class="l7-eq">τ_Elmore = Σ_i  C_i · R_(driver → i)      e.g. ladder: R1·C1 + (R1+R2)·C2 + (R1+R2+R3)·C3</div>' +
          '<p>It is easy to compute by hand and accurate enough to compare options – which is why the same idea appears inside delay calculators and optimisation tools.</p>'
      },
      { id: 'w-elmore', type: 'widget', title: 'Elmore delay lab', nav: 'Elmore lab', intro: 'Change the number of segments and their R and C values. Which capacitor costs the most delay?', build: elmoreLab },
      {
        id: 'c-opt', type: 'concept', title: 'Delay optimisation – first principles', nav: 'Optimisation',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Reduce R</h4><p>Up-size the driver (wider transistors) – but its input capacitance grows, loading the previous stage.</p></div><div class="l7-box cu"><h4>Reduce C</h4><p>Lower fan-out, shorten wires, use smaller loads on the critical path.</p></div><div class="l7-box vio"><h4>Split the load</h4><p>Use a buffer tree: several stages, each driving a moderate load, beat one stage driving a huge load.</p></div><div class="l7-box"><h4>Fewer series devices</h4><p>Avoid tall transistor stacks on critical paths.</p></div></div>' +
          '<p style="margin-top:12px">Module 6 turns these principles into a systematic timing-optimisation process.</p>'
      },
      {
        id: 'rv-d', type: 'reveal', title: 'Click to reveal: delay insights', nav: 'Reveal',
        items: [
          { q: 'Why does doubling a gate\'s size not halve its delay?', a: 'R halves, but the gate\'s own parasitic capacitance doubles, and its input capacitance doubles too, slowing the gate that drives it.' },
          { q: 'Where does 0.69 come from?', a: 'The voltage crosses 50 % when e^(−t/RC) = 0.5, i.e. t = ln 2 · RC ≈ 0.69 RC.' },
          { q: 'Why are pMOS pull-ups often slower?', a: 'Hole mobility is lower, so a pMOS of the same size has higher resistance; it must be made wider for equal rise and fall delays.' },
          { q: 'Why does Elmore weight far capacitors more?', a: 'Charge for a far capacitor must flow through every resistor on the way, so it sees the largest resistance.' },
          { q: 'When does wire delay dominate?', a: 'For long wires, where wire R and C both grow with length and their product grows with length squared.' },
          { q: 'What is fan-out of 4 (FO4) delay?', a: 'The delay of an inverter driving four identical inverters – a common technology-independent unit for comparing circuit speed.' }
        ]
      },
      {
        id: 'dd-d', type: 'drag', title: 'Drag & drop: what increases delay?', nav: 'Drag & drop',
        bins: ['Increases R', 'Increases C', 'Reduces delay'],
        items: [['Narrower transistors', 0], ['More transistors in series', 0], ['Higher fan-out', 1], ['Longer wire', 1], ['Larger receiving gates', 1], ['Up-sizing the driver (for a big load)', 2], ['Splitting a large load with buffers', 2], ['Shorter routing', 2]]
      },
      {
        id: 'calc2', type: 'calc', title: 'Calculation challenges', nav: 'Calculate',
        items: [
          { q: 'A driver with R = 5 kΩ drives 20 fF. Estimate t_pd = 0.69RC (ps).', a: 69, u: 'ps', h: '5 kΩ × 20 fF = 100 ps.', s: '0.69 × 100 ps = <b>69 ps</b>.' },
          { q: 'A gate with 2 fF parasitic drives fan-out 4, each 3 fF, plus 6 fF of wire. What is C_load (fF)?', a: 20, u: 'fF', h: 'C_par + N·C_in + C_wire.', s: '2 + 4×3 + 6 = <b>20 fF</b>.' },
          { q: 'RC ladder: R1 = 1 kΩ, C1 = 10 fF, R2 = 2 kΩ, C2 = 20 fF. Elmore delay τ_D (ps)?', a: 70, u: 'ps', h: 'R1·C1 + (R1+R2)·C2.', s: '1×10 + 3×20 = 10 + 60 = <b>70 ps</b>.' },
          { q: 'In the linear model d = 15 ps + 4 ps/fF × C_load, what is the delay with C_load = 10 fF (ps)?', a: 55, u: 'ps', h: 'Intrinsic + slope × load.', s: '15 + 40 = <b>55 ps</b>.' },
          { q: 'A wire\'s distributed delay is 0.38·R_w·C_w. With R_w = 500 Ω and C_w = 200 fF, what is it (ps)?', a: 38, u: 'ps', h: '500 × 200 fF = 100 ps.', s: '0.38 × 100 = <b>38 ps</b>.' }
        ]
      },
      {
        id: 'mcq2', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Gate delay is approximately proportional to…', o: ['R + C', 'R × C', 'R / C', 'C / R'], a: 1, w: 'The RC time constant.' },
          { q: 'Increasing fan-out increases delay mainly because…', o: ['R increases', 'load capacitance increases', 'VDD drops', 'the logic changes'], a: 1, w: 'Each driven gate adds input capacitance.' },
          { q: 'In the Elmore model, a capacitor\'s contribution is multiplied by…', o: ['its own resistor only', 'the total resistance from the driver to its node', 'the total resistance of the network', 'zero'], a: 1, w: 'Shared upstream resistance.' },
          { q: 'The delay of a long distributed RC wire grows with…', o: ['length', 'length²', '√length', 'it is constant'], a: 1, w: 'R and C both ∝ length.' }
        ]
      },
      {
        id: 'short2', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'List the components of the load capacitance seen by a CMOS gate and explain how each affects delay.', k: ['parasitic|diffusion|self', 'fan-out|input capacitance|gate capacitance', 'wire', 'rc|proportional'], m: 'The load is the driver\'s own parasitic (diffusion) capacitance, the input capacitance of every gate it drives (fan-out × C_in) and the wire capacitance. Delay ≈ 0.69·R·C_load, so every femtofarad added increases delay in proportion to the driver resistance.' },
          { q: 'Explain the Elmore delay and why capacitance near the end of a long wire is expensive.', k: ['sum|σ|add', 'upstream|from the driver|shared', 'resistance', 'far|end'], m: 'The Elmore delay is the sum, over every capacitor, of that capacitance times the resistance from the driver to its node. A capacitor at the far end sees all the wire resistance, so its term is the largest; capacitance near the driver is cheap.' }
        ]
      },
      {
        id: 'scen2', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A small inverter drives 16 gates spread along a long wire, and the path is too slow.', q: 'Which change helps most?', o: [{ t: 'Drive a buffer tree (e.g. 1 → 4 → 16) instead of all 16 loads from one small gate', ok: true, w: 'Splitting the load keeps each stage\'s RC small.' }, { t: 'Use narrower transistors in the inverter', ok: false, w: 'Higher R makes it slower.' }, { t: 'Add more gates to the same net', ok: false, w: 'More fan-out, more capacitance.' }] },
          { s: 'Up-sizing a gate 4× did not speed up the path as expected; the previous stage got slower.', q: 'Why?', o: [{ t: 'The bigger gate\'s input capacitance loads the previous stage', ok: true, w: 'Delay moved upstream. Size gradually along the path.' }, { t: 'Bigger gates always have higher resistance', ok: false, w: 'They have lower resistance.' }, { t: 'Wire resistance became zero', ok: false, w: 'Unrelated.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'The basic delay model of a CMOS gate is…', o: ['an inductor', 'a resistor charging a capacitor', 'a diode', 'a current source only'], a: 1, w: 'RC model.' },
      { d: 'Easy', q: 'Which increases load capacitance?', o: ['lower fan-out', 'higher fan-out', 'higher VDD', 'shorter wire'], a: 1, w: 'More driven inputs.' },
      { d: 'Easy', q: 'Wider transistors in the driver give…', o: ['higher R', 'lower R', 'no change', 'higher VDD'], a: 1, w: 'More current, lower resistance.' },
      { d: 'Medium', q: 'R = 2 kΩ, C = 30 fF. The 50 % delay is about…', o: ['30 ps', '41 ps', '60 ps', '90 ps'], a: 1, w: '0.69 × 60 ps ≈ 41 ps.' },
      { d: 'Medium', q: 'C_par = 1 fF, fan-out 3 × 2 fF, wire 5 fF. C_load = …', o: ['8 fF', '11 fF', '12 fF', '6 fF'], a: 2, w: '1 + 6 + 5 = 12 fF.' },
      { d: 'Medium', q: 'Elmore delay of R1 = 1 kΩ, C1 = 5 fF, R2 = 1 kΩ, C2 = 5 fF is…', o: ['10 ps', '15 ps', '20 ps', '5 ps'], a: 1, w: '1×5 + 2×5 = 15 ps.' },
      { d: 'Medium', q: 'Doubling the length of a distributed RC wire multiplies its delay by…', o: ['2', '4', '1', '√2'], a: 1, w: 'L².' },
      { d: 'Hard', q: 'Up-sizing a gate does NOT help when…', o: ['its load is dominated by its own parasitic capacitance', 'it drives a long wire', 'fan-out is high', 'the path is critical'], a: 0, w: 'Self-loading grows with size, so R·C stays similar.' },
      { d: 'Hard', q: 'In an RC tree, which capacitor increases Elmore delay at the far end most?', o: ['one near the driver', 'one at the far end', 'all equal', 'none'], a: 1, w: 'It sees the most upstream resistance.' },
      { d: 'Hard', q: 'With d = 10 ps + 5 ps/fF × C, adding 4 fF of load increases delay by…', o: ['4 ps', '10 ps', '20 ps', '30 ps'], a: 2, w: '5 × 4 = 20 ps.' }
    ]
  });
})();
