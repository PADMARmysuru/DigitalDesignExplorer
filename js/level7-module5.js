/* Level 7 · Module 5 – VLSI Interconnect */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var STACK = [
    ['M1', 'local', 1, 0.6, 'Connections inside standard cells and between neighbouring cells; finest pitch.'],
    ['M2', 'local', 1, 0.6, 'Short routes between cells, usually perpendicular to M1 (preferred direction alternates).'],
    ['M3', 'local', 1, 0.6, 'Local routing within a block.'],
    ['M4', 'intermediate', 2, 1, 'Routing across a block, a few hundred µm.'],
    ['M5', 'intermediate', 2, 1, 'Routing across a block; often also local power straps.'],
    ['M6', 'intermediate', 2, 1, 'Longer block-level signals.'],
    ['M7', 'global', 4, 2.2, 'Global signals between blocks; low resistance per µm.'],
    ['M8', 'global', 4, 2.2, 'Clock and global buses.'],
    ['M9', 'global (top)', 8, 4, 'Thick top metals: power grid, I/O and the longest global wires.']
  ];

  /* ---------- Widget: metal stack ---------- */
  function stackLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Metal stack explorer · tap a layer</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = 0, seen = {};
    var split = L.h('div', 'l7-lab-split'); body.appendChild(split);
    var pic = L.h('div', 'l7-svgbox'); split.appendChild(pic);
    var info = L.h('div', 'l7-readout'); split.appendChild(info);
    function draw() {
      var o = '', y = 330;
      o += R(20, y, 440, 26, 'box', 2) + T(240, y + 18, 'Silicon substrate: transistors (FEOL)', 't-dim t-sm');
      o += R(20, y - 24, 440, 22, 'box-vio', 2) + T(240, y - 9, 'contacts / local interconnect', 't-vio t-sm');
      var yy = y - 28;
      STACK.forEach(function (m, i) {
        var th = 10 + m[2] * 3.2, w = 14 + m[2] * 7, gap = 12 + m[2] * 7, on = i === cur;
        yy -= th + 6;
        o += '<g class="click" data-i="' + i + '" role="button" tabindex="0" aria-label="Layer ' + m[0] + '">';
        o += '<rect x="20" y="' + (yy - 2) + '" width="440" height="' + (th + 4) + '" fill="transparent"/>';
        for (var x = 60; x + w < 450; x += w + gap) o += R(x, yy, w, th, on ? 'box-on' : (m[1].indexOf('global') === 0 ? 'box-cu' : 'box'), 1);
        o += T(52, yy + th / 2 + 4, m[0], on ? 't-sig t-b' : 't-ink t-sm', 'end') + '</g>';
      });
      pic.innerHTML = S(470, 362, o, 'Metal stack cross-section');
      L.$$('g.click', pic).forEach(function (g) { g.addEventListener('click', function () { cur = +g.getAttribute('data-i'); seen[cur] = 1; if (Object.keys(seen).length >= 4) api.done(); draw(); }); });
      var m = STACK[cur];
      info.innerHTML = '<span class="k">Layer</span> <span class="v">' + m[0] + '</span> · ' + m[1] + '<br><span class="k">Relative pitch</span> ' + m[2] + '× M1<br><span class="k">Relative R per µm</span> ≈ ' + L.fmt(1 / (m[2] * m[3] / 0.6), 2) + '× M1 (wider and thicker → lower R)<br><span class="k">Use</span> ' + m[4] +
        '<br><br><span class="k">Rule of thumb</span> lower layers: dense, high R · upper layers: wide, thick, low R, fewer tracks. Vias connect adjacent layers.';
    }
    seen[0] = 1; draw();
  }

  /* ---------- Widget: wire RC ---------- */
  function rcLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Wire RC calculator · distributed RC delay</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var p = { L: 1000, W: 0.1, t: 0.2, c: 0.2 }, rho = 2.2e-8, n = 0;
    L.slider(body, 'Length L', 50, 5000, 50, p.L, function (v) { return v + ' µm'; }, function (v) { p.L = v; upd(1); });
    L.slider(body, 'Width W', 0.05, 1, 0.05, p.W, function (v) { return v.toFixed(2) + ' µm'; }, function (v) { p.W = v; upd(1); });
    L.slider(body, 'Thickness t', 0.1, 1, 0.05, p.t, function (v) { return v.toFixed(2) + ' µm'; }, function (v) { p.t = v; upd(1); });
    L.slider(body, 'Capacitance per length c', 0.1, 0.4, 0.01, p.c, function (v) { return v.toFixed(2) + ' fF/µm'; }, function (v) { p.c = v; upd(1); });
    var split = L.h('div', 'l7-lab-split'); body.appendChild(split);
    var pic = L.h('div', 'l7-svgbox'); split.appendChild(pic);
    var out = L.h('div', 'l7-readout'); split.appendChild(out);
    function delay(len) { var Rw = rho * len * 1e-6 / (p.W * 1e-6 * p.t * 1e-6), C = p.c * 1e-15 * len; return 0.38 * Rw * C; }
    function upd(ch) {
      if (ch) n++; if (n >= 3) api.done();
      var Rw = rho * p.L * 1e-6 / (p.W * 1e-6 * p.t * 1e-6), C = p.c * 1e-15 * p.L, d = 0.38 * Rw * C, rs = rho / (p.t * 1e-6);
      var o = '', W = 360, H = 200, maxL = 5000, maxD = delay(maxL);
      o += P('M40 170H350', 'w') + P('M40 170V20', 'w') + T(195, 194, 'length (µm) →', 't-dim t-sm') + T(16, 95, 'delay', 't-dim t-sm');
      var path = '';
      for (var i = 0; i <= 50; i++) { var len = maxL * i / 50, x = 40 + 310 * i / 50, y = 170 - 150 * delay(len) / maxD; path += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
      o += P(path, 'w-cu');
      var mx = 40 + 310 * p.L / maxL, my = 170 - 150 * d / maxD;
      o += L.dot(mx, my, 6, 'dot-on') + T(mx, my - 12, (d * 1e12).toFixed(1) + ' ps', 't-sig t-b t-sm');
      o += T(345, 30, 'quadratic in L', 't-cu t-sm', 'end');
      pic.innerHTML = S(W, H + 4, o, 'Wire delay versus length');
      out.innerHTML = '<span class="k">Sheet resistance</span> R<sub>□</sub> = ρ/t = ' + L.fmt(rs, 3) + ' Ω/□<br><span class="k">Squares</span> L/W = ' + L.fmt(p.L / p.W, 0) +
        '<br><span class="k">R</span> = ρL/(W·t) = <span class="v">' + L.fmt(Rw, 1) + ' Ω</span><br><span class="k">C</span> = c·L = <span class="v">' + L.fmt(C * 1e15, 1) + ' fF</span>' +
        '<br><span class="k">Distributed delay</span> 0.38·RC = <span class="c">' + L.fmt(d * 1e12, 2) + ' ps</span><br><span class="k">Lumped estimate</span> 0.69·RC = ' + L.fmt(0.69 * Rw * C * 1e12, 2) + ' ps<br><span class="k">ρ</span> = 2.2×10⁻⁸ Ω·m (narrow Cu, including scattering)';
    }
    upd(0);
  }

  /* ---------- Widget: crosstalk ---------- */
  function xtalk(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Crosstalk lab · victim between two aggressors</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var sp = 1, mode = 'quiet', seen = {};
    L.slider(body, 'Wire spacing (× minimum)', 1, 4, 0.5, sp, function (v) { return v.toFixed(1) + '×'; }, function (v) { sp = v; upd(); });
    var row = L.h('div', 'l7-row'); body.appendChild(row); row.appendChild(L.h('span', 'l7-lab-label', 'Aggressors'));
    var bs = [['quiet', 'Victim quiet, aggressors rise'], ['same', 'All switch the same way'], ['opp', 'Aggressors switch opposite to victim']].map(function (m) {
      var b = L.btn(m[1], m[0] === mode ? 'is-on' : '', function () { mode = m[0]; bs.forEach(function (x) { x.classList.toggle('is-on', x === b); }); upd(); });
      row.appendChild(b); return b;
    });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-fb'); body.appendChild(out);
    function upd() {
      seen[mode] = 1; if (Object.keys(seen).length === 3) api.done();
      var Cg = 100, Cc = 60 / sp, k = mode === 'same' ? 0 : mode === 'opp' ? 2 : 1, Ceff = Cg + k * 2 * Cc, vn = 2 * Cc / (2 * Cc + Cg);
      var o = '';
      // cross-section
      [40, 120, 200].forEach(function (x, i) {
        var xx = i === 1 ? 120 : (i === 0 ? 120 - 40 - 30 * sp : 120 + 40 + 30 * sp);
        o += R(xx - 18, 40, 36, 50, i === 1 ? 'box-on' : 'box-cu', 3) + T(xx, 108, i === 1 ? 'victim' : 'aggr.', i === 1 ? 't-sig t-sm' : 't-cu t-sm');
      });
      o += P('M30 150H210', 'w') + T(120, 168, 'ground plane / substrate', 't-dim t-sm');
      o += T(120, 26, 'Cc = ' + Cc.toFixed(0) + ' fF each side', 't-ink t-sm');
      // waveforms
      var x0 = 250, w = 280, wave = function (y, kind) {
        if (kind === 'rise') return 'M' + x0 + ' ' + (y + 30) + 'H' + (x0 + 80) + 'L' + (x0 + 140) + ' ' + y + 'H' + (x0 + w);
        if (kind === 'fall') return 'M' + x0 + ' ' + y + 'H' + (x0 + 80) + 'L' + (x0 + 140) + ' ' + (y + 30) + 'H' + (x0 + w);
        if (kind === 'slowrise') return 'M' + x0 + ' ' + (y + 30) + 'H' + (x0 + 80) + 'L' + (x0 + 220) + ' ' + y + 'H' + (x0 + w);
        if (kind === 'fastrise') return 'M' + x0 + ' ' + (y + 30) + 'H' + (x0 + 80) + 'L' + (x0 + 120) + ' ' + y + 'H' + (x0 + w);
        var g = 30 * vn; return 'M' + x0 + ' ' + (y + 30) + 'H' + (x0 + 90) + 'L' + (x0 + 120) + ' ' + (y + 30 - g) + 'Q' + (x0 + 160) + ' ' + (y + 30) + ' ' + (x0 + 220) + ' ' + (y + 30) + 'H' + (x0 + w);
      };
      o += T(x0, 34, 'aggressor', 't-cu t-sm', 'start') + P(wave(42, mode === 'opp' ? 'fall' : 'rise'), 'w-cu');
      o += T(x0, 104, 'victim', 't-sig t-sm', 'start') + P(wave(112, mode === 'quiet' ? 'glitch' : mode === 'opp' ? 'slowrise' : 'fastrise'), 'w-on');
      if (mode === 'quiet') o += T(x0 + 130, 104, 'glitch ≈ ' + (vn * 100).toFixed(0) + '% VDD', vn > 0.3 ? 't-bad t-b t-sm' : 't-ink t-sm', 'start');
      pic.innerHTML = S(560, 180, o, 'Crosstalk between wires');
      var msg = { quiet: 'Noise: the quiet victim is pushed up by charge coupled from both aggressors. Glitch ≈ VDD·2Cc/(2Cc + Cg) = ' + (vn * 100).toFixed(0) + '% of VDD. A large glitch can falsely switch a receiving gate.', same: 'Delay benefit: with neighbours switching the same way there is no voltage change across Cc (Miller factor 0). C<sub>eff</sub> = ' + Ceff.toFixed(0) + ' fF – the victim speeds up.', opp: 'Delay penalty: the voltage across each Cc changes by 2·VDD (Miller factor 2). C<sub>eff</sub> = Cg + 2·2Cc = ' + Ceff.toFixed(0) + ' fF – the victim slows down.' }[mode];
      L.fb(out, mode === 'same' ? 'ok' : 'info', msg + ' Wider spacing (or a shield wire) reduces Cc.');
    }
    upd();
  }

  function scaleFrame(k) {
    var s = [1, 0.7, 0.5][k] || 1, o = '';
    var w = 60 * s, t = 90 * s;
    o += T(150, 20, k === 3 ? 'Local wire: shorter too' : 'Scale factor S = ' + [1, 1.4, 2][Math.min(k, 2)], 't-vio t-b');
    o += R(150 - w / 2, 150 - t, w, t, 'box-cu', 3) + T(150, 170, 'W×t area ∝ 1/S²', 't-dim t-sm');
    var rpl = [1, 2, 4, 4][k];
    o += T(330, 70, 'R per µm: ×' + rpl, 't-ink t-b', 'start');
    o += T(330, 100, 'C per µm: ≈ constant', 't-ink', 'start');
    o += T(330, 130, k === 3 ? 'local delay ≈ unchanged' : 'global wire delay: ×' + rpl, k === 3 ? 't-ok t-b' : 't-bad t-b', 'start');
    return S(560, 190, o, 'Wire scaling');
  }

  L.module({
    n: 5,
    lead: 'Transistors got faster with every node – wires did not. Explore the on-chip metal stack, the resistance and capacitance of wires, RC delay, coupling and crosstalk, and why interconnect is now one of the hardest problems in VLSI.',
    tags: ['metal stack', 'sheet resistance', 'wire capacitance', 'RC delay', 'coupling', 'crosstalk', 'scaling'],
    sections: [
      { part: 'Learn' },
      {
        id: 'c-ic', type: 'concept', title: 'On-chip interconnect and metal layers', nav: 'Interconnect',
        html: '<p>Transistors are built in the silicon (front-end-of-line); they are wired together by a stack of copper <b>metal layers</b> separated by low-k dielectric and connected by <b>vias</b> (back-end-of-line). Modern processes have 10–15 metal layers.</p>' +
          '<div class="l7-grid3"><div class="l7-box"><h4>Local (M1–M3)</h4><p>Finest pitch, highest resistance. Wiring inside and between nearby cells.</p></div><div class="l7-box sig"><h4>Intermediate</h4><p>Wider pitch. Routing across a block.</p></div><div class="l7-box cu"><h4>Global (top)</h4><p>Thick, wide, low-resistance wires for clocks, long buses and the power grid.</p></div></div>' +
          '<p style="margin-top:12px">Each layer has a <b>preferred direction</b> (alternating horizontal/vertical) to simplify routing. Wire geometry follows design rules for minimum width, spacing and via enclosure.</p>'
      },
      { id: 'w-stack', type: 'widget', title: 'Metal stack explorer', nav: 'Stack lab', intro: 'Tap at least four different layers to compare local, intermediate and global metals.', build: stackLab },
      {
        id: 'c-rc', type: 'concept', title: 'Interconnect resistance and capacitance', nav: 'R and C',
        html: '<div class="l7-grid2"><div class="l7-box cu"><h4>Resistance</h4><div class="l7-eq">R = ρ·L / (W·t) = R<sub>□</sub> · (L/W)</div><p>Sheet resistance R<sub>□</sub> = ρ/t (Ω per square) depends only on the layer, so resistance is counted in <b>squares</b>. In nanometre wires, electron scattering at surfaces and grain boundaries and the barrier liner raise the effective resistivity of copper well above its bulk value.</p></div>' +
          '<div class="l7-box sig"><h4>Capacitance</h4><p>A wire has capacitance to the layers above and below (area and fringe) and to its neighbours (<b>coupling</b>). As wires get taller and closer, coupling to neighbours becomes the largest part – typically 0.15–0.25 fF/µm in total.</p><div class="l7-eq">C<sub>wire</sub> ≈ c · L</div></div></div>' +
          '<p style="margin-top:12px">Vias add resistance too; long routes through many vias, and the narrow lower layers, quickly accumulate hundreds of ohms.</p>'
      },
      {
        id: 'c-delay', type: 'concept', title: 'RC effects in wires', nav: 'RC delay',
        html: '<p>A long wire behaves as a <b>distributed RC line</b>: every segment\'s resistance must charge the capacitance of every segment after it. The 50% delay of a distributed line driven by an ideal source is</p>' +
          '<div class="l7-eq">t<sub>wire</sub> ≈ 0.38 · R·C = 0.38 · r·c·L²     (lumped RC would give 0.69·RC)</div>' +
          '<p>Because both R and C grow with L, wire delay grows with <b>L²</b>: doubling the length quadruples the delay. RC also slows edges (slew), which slows the receiving gate. Long wires are therefore broken into segments by inserting buffers (repeaters), which turns quadratic growth into roughly linear – a topic developed with timing in Level 8 and physical design in Level 10.</p>'
      },
      { id: 'w-rc', type: 'widget', title: 'Wire RC calculator', nav: 'RC lab', intro: 'Change the wire geometry at least three times. Notice how delay depends on length squared.', build: rcLab },
      {
        id: 'c-xt', type: 'concept', title: 'Coupling capacitance and crosstalk', nav: 'Crosstalk',
        html: '<p>When a neighbouring wire (the <b>aggressor</b>) switches, charge is injected through the coupling capacitance C<sub>c</sub> into the <b>victim</b> wire. Two effects result:</p>' +
          '<div class="l7-grid2"><div class="l7-box cu"><h4>Crosstalk noise (glitch)</h4><p>A quiet victim receives a voltage bump. If it exceeds the noise margin of the receiving gate, it can cause a functional error, or corrupt a dynamic node or memory bitline.</p></div>' +
          '<div class="l7-box sig"><h4>Crosstalk delay</h4><p>If both switch, the effective capacitance depends on the relative direction (Miller effect): same direction → C<sub>c</sub> appears as 0; opposite direction → 2C<sub>c</sub>. The same wire can be faster or slower depending on its neighbours.</p></div></div>' +
          '<div class="l7-eq">C<sub>eff</sub> = C<sub>g</sub> + k · C<sub>c</sub>,   k = 0 (same), 1 (quiet), 2 (opposite)</div>' +
          '<p>Mitigations: wider spacing, <b>shield</b> wires tied to VDD/GND, routing sensitive nets on different layers, avoiding long parallel runs, and stronger drivers on victims.</p>'
      },
      { id: 'w-xt', type: 'widget', title: 'Crosstalk lab', nav: 'Crosstalk lab', intro: 'Try all three switching patterns and vary the spacing.', build: xtalk },
      {
        id: 'st-scale', type: 'steps', title: 'Animation: what scaling does to wires', nav: 'Scaling animation',
        frames: [
          { t: 'A wire cross-section at today\'s node.', svg: scaleFrame(0) },
          { t: 'Scale width and thickness by 1/S (S ≈ 1.4 per node): area halves, so resistance per µm doubles. Capacitance per µm stays roughly constant because the spacing also shrinks.', svg: scaleFrame(1) },
          { t: 'After two nodes (S = 2) resistance per µm is ×4. A <b>global</b> wire that still spans the chip (fixed length) becomes ×4 slower – while the transistors became faster.', svg: scaleFrame(2) },
          { t: 'A <b>local</b> wire also gets shorter by 1/S, so its R·C stays roughly constant – local wiring scales well; global wiring does not. This gap drives thick top metals, repeaters, and 3D integration (Module 9).', svg: scaleFrame(3) }
        ]
      },
      {
        id: 'c-scale', type: 'concept', title: 'Local vs global interconnect and scaling challenges', nav: 'Challenges',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Issue</th><th>Why it gets worse with scaling</th><th>Typical response</th></tr>' +
          '<tr><td>Wire resistance</td><td>smaller cross-section, more surface scattering, liner takes larger fraction</td><td>thicker upper metals, new metals (Co, Ru) at the finest pitches</td></tr>' +
          '<tr><td>Global delay</td><td>chip size stays similar while gates get faster</td><td>repeaters, pipelined wires, better floorplanning</td></tr>' +
          '<tr><td>Coupling</td><td>wires are taller and closer together</td><td>spacing, shielding, low-k dielectrics</td></tr>' +
          '<tr><td>Electromigration</td><td>higher current density in thinner wires</td><td>wider power wires, current-density rules</td></tr>' +
          '<tr><td>IR drop</td><td>more current through a more resistive power grid</td><td>dense power grid, backside power delivery</td></tr></table></div>'
      },
      {
        id: 'rv-ic', type: 'reveal', title: 'Click to reveal: interconnect insights', nav: 'Reveal',
        items: [
          { q: 'Why count wire resistance in “squares”?', a: 'A square of any size on a given layer has the same resistance R<sub>□</sub>. So R = R<sub>□</sub> × (L/W) – a 100 µm × 0.1 µm wire is 1000 squares.' },
          { q: 'Why does wire delay grow with L²?', a: 'Both resistance and capacitance are proportional to length; their product is proportional to L².' },
          { q: 'What is a shield wire?', a: 'A wire held at a constant voltage (VDD or GND) placed next to a sensitive signal so neighbours couple into the shield instead of the signal.' },
          { q: 'Why are the top metal layers thicker?', a: 'To give long global wires, clocks and the power grid low resistance per µm. Fewer tracks are needed at the top, so the pitch can be larger.' },
          { q: 'Can crosstalk make a path faster?', a: 'Yes. If a neighbour switches in the same direction at the same time, the coupling capacitance is effectively removed, speeding the victim up – which matters for hold checks.' },
          { q: 'What is the dominant wire capacitance in modern processes?', a: 'Coupling to adjacent wires on the same layer, because wires have high aspect ratio (tall and narrow) and tight spacing.' }
        ]
      },
      {
        id: 'dd-ic', type: 'drag', title: 'Drag & drop: local or global, problem or cure?', nav: 'Drag & drop',
        bins: ['Local interconnect', 'Global interconnect', 'Crosstalk problem', 'Mitigation technique'],
        items: [['M1 inside a cell', 0], ['Finest pitch, highest R per µm', 0], ['Thick top-metal clock spine', 1], ['Power grid straps', 1], ['Spans the whole die', 1], ['Glitch on a quiet victim', 2], ['Miller factor 2 slowdown', 2], ['Shield wire to GND', 3], ['Increase wire spacing', 3], ['Insert repeaters on long wires', 3]]
      },
      { part: 'Practice' },
      {
        id: 'calc5', type: 'calc', title: 'Calculation challenges', nav: 'Calculate',
        items: [
          { q: 'A copper wire has ρ = 2.2×10⁻⁸ Ω·m, length 1 mm, width 0.1 µm and thickness 0.2 µm. What is its resistance in Ω?', a: 1100, u: 'Ω', h: 'R = ρL/(W·t). Convert everything to metres.', s: '2.2×10⁻⁸ × 10⁻³ / (0.1×10⁻⁶ × 0.2×10⁻⁶) = 2.2×10⁻¹¹ / 2×10⁻¹⁴ = <b>1100 Ω</b>.' },
          { q: 'What is the sheet resistance R<sub>□</sub> of that layer (in Ω/□)?', a: 0.11, u: 'Ω/□', h: 'R<sub>□</sub> = ρ/t.', s: '2.2×10⁻⁸ / 0.2×10⁻⁶ = <b>0.11 Ω/□</b> (and 10 000 squares × 0.11 = 1100 Ω).' },
          { q: 'The same 1 mm wire has c = 0.2 fF/µm. Estimate its distributed RC delay 0.38·RC in ps.', a: 83.6, u: 'ps', h: 'C = 200 fF.', s: '0.38 × 1100 Ω × 200 fF = 0.38 × 2.2×10⁻¹⁰ s = <b>83.6 ps</b>.' },
          { q: 'If the wire length is tripled (same layer), by what factor does its RC delay increase?', a: 9, tol: 0, abs: 0.01, h: 'Delay ∝ L².', s: '3² = <b>9×</b>.' },
          { q: 'A victim has 100 fF to ground and 50 fF coupling to each of two neighbours. Both neighbours switch opposite to the victim. What is C<sub>eff</sub> (fF)?', a: 300, u: 'fF', h: 'Miller factor 2 for each coupling capacitance.', s: '100 + 2×50 + 2×50 = <b>300 fF</b>.' }
        ]
      },
      {
        id: 'mcq5', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Which layers usually have the lowest resistance per µm?', o: ['M1', 'M2', 'intermediate layers', 'top (global) layers'], a: 3, w: 'They are the widest and thickest.' },
          { q: 'Distributed RC delay of a wire is approximately…', o: ['0.38·RC', '0.69·RC', '2.2·RC', 'RC/L'], a: 0, w: '0.38·RC for a distributed line (0.69·RC for a lumped RC).' },
          { q: 'Crosstalk noise is largest when…', o: ['victim and aggressors switch together', 'the victim is quiet and aggressors switch', 'wires are widely spaced', 'a shield is present'], a: 1, w: 'All the injected charge appears as a glitch on the quiet victim.' },
          { q: 'Under ideal scaling, R per µm of a wire…', o: ['decreases', 'stays the same', 'increases by S²', 'increases by S'], a: 2, w: 'Cross-section area falls by S².' }
        ]
      },
      {
        id: 'short5', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain why local wires scale well but global wires do not.', k: ['length|shorter|long', 'resistance|r per', 'capacitance', 'global|die|chip'], m: 'When a technology scales, local wires get shorter along with the cells, so the increase in resistance per µm is offset by the shorter length and their RC delay stays roughly constant. Global wires still span a similar die size, so their length does not shrink while resistance per µm rises; their delay grows relative to the faster gates.' },
          { q: 'Describe two effects of coupling capacitance and two ways to reduce them.', k: ['noise|glitch', 'delay|miller', 'spacing|space', 'shield'], m: 'Coupling causes crosstalk noise (a glitch on a quiet victim when a neighbour switches) and crosstalk delay variation (the Miller effect makes the effective capacitance 0 to 2 Cc depending on switching direction). It can be reduced by increasing spacing, inserting grounded shield wires, routing on different layers, or limiting parallel run lengths.' }
        ]
      },
      {
        id: 'scen5', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A 4 mm signal routed on M2 between two blocks is far too slow.', q: 'What is the most effective change?', o: [{ t: 'Move it to a thick upper metal layer (and buffer it if still needed)', ok: true, w: 'Upper layers have much lower R per µm; repeaters then make delay grow roughly linearly.' }, { t: 'Make the wire longer to avoid congestion', ok: false, w: 'Longer means quadratically slower.' }, { t: 'Route it next to a fast clock line', ok: false, w: 'That adds crosstalk.' }] },
          { s: 'A quiet asynchronous reset line runs 2 mm in parallel with a busy data bus and occasionally resets the chip.', q: 'What is the likely cause and fix?', o: [{ t: 'Crosstalk glitches from the bus; add shielding or spacing (and filter the reset input)', ok: true, w: 'Correct – a sensitive quiet net next to aggressors needs protection.' }, { t: 'Electromigration; widen the reset wire', ok: false, w: 'Electromigration causes long-term failures, not random glitches.' }, { t: 'IR drop; add more power straps', ok: false, w: 'IR drop could hurt, but the parallel aggressor bus points to crosstalk.' }] }
        ]
      }
    ],
    quiz: [
      { q: 'Vias connect…', o: ['a transistor gate to its source', 'adjacent metal layers', 'two chips', 'the substrate to the package'], a: 1, w: 'Vias are vertical connections between metal layers.' },
      { q: 'Sheet resistance has units of…', o: ['Ω·m', 'Ω/□', 'F/m', 'Ω/µm²'], a: 1, w: 'Ohms per square.' },
      { q: 'A wire is 500 squares long on a layer with R<sub>□</sub> = 0.2 Ω/□. Its resistance is…', o: ['2.5 Ω', '100 Ω', '500 Ω', '2500 Ω'], a: 1, w: '500 × 0.2 = 100 Ω.' },
      { q: 'Wire delay scales with length as…', o: ['L', 'L²', '√L', 'independent of L'], a: 1, w: 'R ∝ L and C ∝ L.' },
      { q: 'In modern processes the largest part of wire capacitance is usually…', o: ['to the substrate', 'to adjacent wires (coupling)', 'gate capacitance', 'via capacitance'], a: 1, w: 'Tall narrow wires at tight pitch.' },
      { q: 'When a victim and its neighbour switch in opposite directions, the coupling capacitance appears as…', o: ['0', 'Cc', '2Cc', 'Cc/2'], a: 2, w: 'Miller factor 2.' },
      { q: 'A shield wire is typically connected to…', o: ['the clock', 'VDD or GND', 'the victim', 'nothing'], a: 1, w: 'A quiet, constant voltage.' },
      { q: 'Why do top metal layers carry the power grid?', o: ['highest density', 'lowest resistance', 'closest to transistors', 'lowest capacitance to substrate only'], a: 1, w: 'Thick wide metal reduces IR drop.' },
      { q: 'Effective resistivity of nanometre copper wires is higher than bulk because of…', o: ['quantum tunnelling', 'surface and grain-boundary scattering and the barrier liner', 'higher temperature', 'via capacitance'], a: 1, w: 'Size effects dominate at small dimensions.' },
      { q: 'Inserting repeaters on a long wire changes delay growth from…', o: ['linear to quadratic', 'quadratic to roughly linear', 'linear to logarithmic', 'it has no effect'], a: 1, w: 'Each segment is short, so total delay ∝ number of segments.' }
    ]
  });
})();
